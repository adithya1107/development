import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Calendar, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface QuizListProps {
  onStartQuiz: (quiz: any) => void;
  takenQuizIds: Set<string>;
}

const QuizList = ({ onStartQuiz, takenQuizIds }: QuizListProps) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizSubmissions, setQuizSubmissions] = useState<any[]>([]);

  useEffect(() => {
    const fetchQuizzesAndSubmissions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          setQuizzes([]);
          return;
        }

        console.log("Fetching quizzes for student:", user.user.id);

        // Get user's enrollments first to find their courses
        const { data: enrollments, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("student_id", user.user.id)
          .eq("status", "enrolled");

        if (enrollmentError) {
          console.error("Error fetching enrollments:", enrollmentError);
          setError("Failed to load your enrollments");
          return;
        }

        if (!enrollments || enrollments.length === 0) {
          console.log("No enrollments found");
          setQuizzes([]);
          setIsLoading(false);
          return;
        }

        const courseIds = enrollments.map(e => e.course_id);
        console.log("Found course IDs:", courseIds);

        // Get active quizzes from enrolled courses
        const { data: quizzesData, error: quizzesError } = await supabase
          .from("quizzes")
          .select(`
            *,
            courses!inner (
              id,
              course_name,
              course_code,
              instructor_id,
              user_profiles!courses_instructor_id_fkey (
                first_name,
                last_name
              )
            )
          `)
          .in("course_id", courseIds)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (quizzesError) {
          console.error("Error fetching quizzes:", quizzesError);
          setError("Failed to load quizzes");
          return;
        }

        console.log("Found quizzes:", quizzesData);

        // Get user's quiz submissions to check completion status and attempts
        const { data: submissionsData, error: submissionsError } = await supabase
          .from("quiz_submissions")
          .select("quiz_id, attempt_number, score, total_possible, submitted_at, is_completed")
          .eq("student_id", user.user.id)
          .in("quiz_id", quizzesData?.map(q => q.id) || []);

        if (submissionsError) {
          console.error("Error fetching submissions:", submissionsError);
        }

        setQuizzes(quizzesData || []);
        setQuizSubmissions(submissionsData || []);

      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
        setQuizzes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzesAndSubmissions();
  }, []);

  const getQuizStatus = (quiz: any) => {
    const submissions = quizSubmissions.filter(s => s.quiz_id === quiz.id);

    if (submissions.length === 0) {
      return {
        status: 'not_attempted',
        label: 'Not Started',
        canAttempt: true,
        attempts: 0
      };
    }

    const completedSubmissions = submissions.filter(s => s.is_completed);
    const maxAttempts = quiz.attempts_allowed || Infinity;
    const currentAttempts = submissions.length;

    if (completedSubmissions.length > 0) {
      const bestScore = Math.max(...completedSubmissions.map(s => s.score || 0));
      const bestTotal = completedSubmissions.find(s => s.score === bestScore)?.total_possible || 1;
      const percentage = bestTotal > 0 ? (bestScore / bestTotal) * 100 : 0;
      const passed = percentage >= (quiz.pass_percentage || 60);

      return {
        status: passed ? 'passed' : 'failed',
        label: passed ? `Passed (${percentage.toFixed(1)}%)` : `Failed (${percentage.toFixed(1)}%)`,
        canAttempt: currentAttempts < maxAttempts,
        attempts: currentAttempts,
        bestScore: bestScore,
        bestTotal: bestTotal
      };
    }

    return {
      status: 'in_progress',
      label: 'In Progress',
      canAttempt: currentAttempts < maxAttempts,
      attempts: currentAttempts
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'border-green-900';
      case 'failed':
        return 'border-red-900';
      case 'in_progress':
        return 'border-orange-900';
      default:
        return 'border-gray-900';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4  rounded w-3/4 mb-2"></div>
              <div className="h-3  rounded w-1/2 mb-4"></div>
              <div className="h-8  rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p className=" mb-2 font-medium">{error}</p>
          <p className="text-sm text-muted-foreground">
            Please try refreshing the page or contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!quizzes || quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BookOpen className="w-12 h-12 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No quizzes available.</p>
          <p className="text-sm text-muted-foreground">
            Contact your instructor if you expect to see quizzes here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {quizzes.map((quiz: any) => {
        const quizStatus = getQuizStatus(quiz);
        const maxAttempts = quiz.attempts_allowed || '∞';

        return (
          <Card key={quiz.id} className={`transition-all duration-200 hover:shadow-md ${getStatusColor(quizStatus.status)} w-full`}>
            <CardContent className="p-4 sm:p-5 md:p-6 rounded-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(quizStatus.status)}
                    </div>
                    <h3 className="font-semibold text-base sm:text-lg leading-tight break-words">
                      {quiz.quiz_name}
                    </h3>
                  </div>

                  {quiz.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 break-words">
                      {quiz.description}
                    </p>
                  )}

                  <div className="space-y-2 sm:space-y-2.5">
                    {/* Course and Instructor Info */}
                    <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 min-w-0">
                        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{quiz.courses?.course_name} ({quiz.courses?.course_code})</span>
                      </div>

                      {quiz.courses?.user_profiles && (
                        <div className="flex items-center gap-1 min-w-0">
                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">
                            {quiz.courses.user_profiles.first_name} {quiz.courses.user_profiles.last_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quiz Stats */}
                    <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 text-xs sm:text-sm text-muted-foreground">
                      {quiz.time_limit_minutes && (
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{quiz.time_limit_minutes} min</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span>Attempts: {quizStatus.attempts}/{maxAttempts}</span>
                      </div>

                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span>Pass: {quiz.pass_percentage || 60}%</span>
                      </div>
                    </div>

                    {/* Status and Score */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${quizStatus.status === 'passed' ? 'bg-green-100 text-green-800' :
                          quizStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
                            quizStatus.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {quizStatus.label}
                      </span>

                      {quizStatus.bestScore !== undefined && (
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                          Best: {quizStatus.bestScore}/{quizStatus.bestTotal}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0 w-full sm:w-auto">
                  <Button
                    onClick={() => onStartQuiz(quiz)}
                    disabled={!quizStatus.canAttempt}
                    variant={quizStatus.status === 'passed' ? 'outline' : 'default'}
                    size="sm"
                    className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap"
                  >
                    {!quizStatus.canAttempt ? 'No Attempts Left' :
                      quizStatus.status === 'passed' ? 'Retake Quiz' :
                        quizStatus.status === 'failed' ? 'Retry Quiz' :
                          quizStatus.status === 'in_progress' ? 'Continue Quiz' :
                            'Start Quiz'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default QuizList;