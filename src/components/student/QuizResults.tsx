import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trophy, Clock, Eye, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const QuizResults = () => {
  const [selectedResult, setSelectedResult] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [detailedResult, setDetailedResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch quiz submissions on component mount
  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Fetch detailed result when selectedResult changes
  useEffect(() => {
    if (selectedResult) {
      fetchDetailedResult();
    } else {
      setDetailedResult(null);
    }
  }, [selectedResult]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: user, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        setError("Failed to authenticate user");
        setSubmissions([]);
        return;
      }

      if (!user.user) {
        setError("User not authenticated");
        setSubmissions([]);
        return;
      }

      console.log("Fetching submissions for user:", user.user.id);

      // First, let's check if the user exists in user_profiles
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, user_type")
        .eq("id", user.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        setError("User profile not found");
        setSubmissions([]);
        return;
      }

      console.log("User profile:", profile);

      // Fetch quiz submissions with proper joins
      const { data, error } = await supabase
        .from("quiz_submissions")
        .select(`
          *,
          quizzes!inner(
            id,
            quiz_name,
            total_possible:weightage,
            courses!inner(
              id,
              course_name
            )
          )
        `)
        .eq("student_id", user.user.id)
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("Error fetching submissions:", error);
        // Try a simpler query if the complex one fails
        const { data: simpleData, error: simpleError } = await supabase
          .from("quiz_submissions")
          .select("*")
          .eq("student_id", user.user.id)
          .order("submitted_at", { ascending: false });

        if (simpleError) {
          console.error("Error with simple query:", simpleError);
          setError("Failed to load quiz results");
          setSubmissions([]);
        } else {
          console.log("Simple query results:", simpleData);
          // If we have simple data, we'll need to fetch quiz and course info separately
          if (simpleData && simpleData.length > 0) {
            const enrichedData = await enrichSubmissionsData(simpleData);
            setSubmissions(enrichedData || []);
          } else {
            setSubmissions([]);
          }
        }
      } else {
        console.log("Quiz submissions data:", data);
        setSubmissions(data || []);
      }
    } catch (error) {
      console.error("Error in fetchSubmissions:", error);
      setError("An unexpected error occurred");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const enrichSubmissionsData = async (submissions) => {
    try {
      const enrichedSubmissions = [];
      for (const submission of submissions) {
        // Fetch quiz info
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select(`
            id,
            quiz_name,
            weightage,
            course_id,
            courses(
              id,
              course_name
            )
          `)
          .eq("id", submission.quiz_id)
          .single();

        if (!quizError && quizData) {
          enrichedSubmissions.push({
            ...submission,
            quizzes: {
              ...quizData,
              total_possible: quizData.weightage || submission.total_possible
            }
          });
        } else {
          // If we can't fetch quiz data, still include the submission
          enrichedSubmissions.push({
            ...submission,
            quizzes: {
              id: submission.quiz_id,
              quiz_name: "Unknown Quiz",
              total_possible: submission.total_possible,
              courses: {
                id: null,
                course_name: "Unknown Course"
              }
            }
          });
        }
      }
      return enrichedSubmissions;
    } catch (error) {
      console.error("Error enriching submissions:", error);
      return submissions;
    }
  };

  const fetchDetailedResult = async () => {
    if (!selectedResult) return;

    try {
      setDetailLoading(true);
      setError(null);
      const { data: questions, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", selectedResult.quiz_id)
        .order("order_index");

      if (error) {
        console.error("Error fetching questions:", error);
        setError("Failed to load quiz details");
        setDetailedResult(null);
      } else {
        setDetailedResult({
          questions: questions || [],
          answers: selectedResult.answers || {},
          submission: selectedResult,
        });
      }
    } catch (error) {
      console.error("Error fetching detailed result:", error);
      setError("An unexpected error occurred while loading details");
      setDetailedResult(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const getScoreColor = (score, total) => {
    if (!score || !total) return "text-gray-600";
    const percentage = (score / total) * 100;
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-blue-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score, total) => {
    if (!score || !total) return { label: "Ungraded", color: "" };
    const percentage = (score / total) * 100;
    if (percentage >= 90) return { label: "Excellent", color: "" };
    if (percentage >= 70) return { label: "Good", color: "" };
    if (percentage >= 50) return { label: "Average", color: "" };
    return { label: "Needs Improvement", color: "" };
  };

  if (selectedResult && detailedResult && !detailLoading) {
    const { submission, questions, answers } = detailedResult;
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Quiz Results: {submission.quizzes?.quiz_name || "Unknown Quiz"}
            </CardTitle>
            <Button variant="outline" onClick={() => setSelectedResult(null)}>
              Back to Results
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Course: {submission.quizzes?.courses?.course_name || "Unknown Course"}
              </p>
              <p className="text-sm text-muted-foreground">
                Submitted: {new Date(submission.submitted_at).toLocaleString()}
              </p>
            </div>
            {submission.score !== null && submission.total_possible && (
              <div className="text-right">
                <p className={`text-2xl font-bold ${getScoreColor(submission.score, submission.total_possible)}`}>
                  {submission.score}/{submission.total_possible}
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.round((submission.score / submission.total_possible) * 100)}%
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {submission.score !== null && submission.total_possible && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Overall Performance</h3>
                  <p className="text-sm text-muted-foreground">
                    You scored {submission.score} out of {submission.total_possible} points
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBadge(submission.score, submission.total_possible).color
                    }`}>
                    {getScoreBadge(submission.score, submission.total_possible).label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {questions.map((question, index) => {
            const studentAnswer = answers[question.id];
            const isCorrect = studentAnswer === question.correct_answer;

            return (
              <Card key={question.id} className={`p-4 border-l-4 ${isCorrect ? "border-l-green-500" : "border-l-red-500"
                }`}>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">Question {index + 1}</p>
                      <p className="mt-1">{question.question_text}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">
                        {question.marks} point{question.marks !== 1 ? 's' : ''}
                      </p>
                      {submission.score !== null && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isCorrect ? "" : ""
                          }`}>
                          {isCorrect ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {isCorrect ? "Correct" : "Incorrect"}
                        </span>
                      )}
                    </div>
                  </div>

                  {question.question_type === "multiple_choice" && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Your Answer:</p>
                      <div className="grid gap-2">
                        {question.options?.map((option, optIndex) => {
                          let bgColor = "";
                          let textColor = "text-foreground";
                          let icon = "";
                          if (option === question.correct_answer) {
                            bgColor = "border-green-300";
                            textColor = "";
                            icon = " ✓ Correct Answer";
                          } else if (option === studentAnswer && option !== question.correct_answer) {
                            bgColor = " border-red-300";
                            textColor = "";
                            icon = " ✗ Your Answer";
                          } else if (option === studentAnswer && option === question.correct_answer) {
                            icon = " ✓ Your Correct Answer";
                          }

                          return (
                            <div
                              key={optIndex}
                              className={`p-3 rounded border ${bgColor} ${textColor}`}
                            >
                              <strong>{String.fromCharCode(65 + optIndex)}.</strong> {option}{icon}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {question.question_type === "true_false" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-3 rounded border ${question.correct_answer === "true"
                            ? "border-green-300 text-green-800"
                            : studentAnswer === "true"
                              ? "bg-red-100 border-red-300 text-red-800"
                              : "bg-gray-50"
                          }`}>
                          <strong>True</strong>
                          {question.correct_answer === "true" && " ✓ Correct"}
                          {studentAnswer === "true" && question.correct_answer !== "true" && " ✗ Your Answer"}
                        </div>
                        <div className={`p-3 rounded border ${question.correct_answer === "false"
                            ? "bg-green-100 border-green-300 text-green-800"
                            : studentAnswer === "false"
                              ? "bg-red-100 border-red-300 text-red-800"
                              : "bg-gray-50"
                          }`}>
                          <strong>False</strong>
                          {question.correct_answer === "false" && " ✓ Correct"}
                          {studentAnswer === "false" && question.correct_answer !== "false" && " ✗ Your Answer"}
                        </div>
                      </div>
                    </div>
                  )}

                  {question.question_type === "short_answer" && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Your Answer:</p>
                        <div className="p-3 bg-gray-50 border rounded min-h-[60px]">
                          {studentAnswer || <em className="text-muted-foreground">No answer provided</em>}
                        </div>
                      </div>
                      {submission.score !== null && (
                        <div>
                          <p className="text-sm font-medium mb-1">Expected Answer:</p>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                            {question.correct_answer}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="card-minimal">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            Quiz Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-muted-foreground">Loading quiz results...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-minimal">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary text-2xl sm:text-xl flex-wrap">
          <span>Quiz Results</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 flex-wrap">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 text-sm mt-1 break-words">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSubmissions}
              className="mt-2 w-full sm:w-auto"
            >
              Try Again
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {!submissions || submissions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No quiz submissions yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete your first quiz to see results here.
              </p>
            </div>
          ) : (
            submissions.map((submission) => (
              <div
                key={submission.id}
                className="p-4 glass-effect rounded-xl border border-primary/20 hover:border-primary/40 transition-all hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  {/* Left Section */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1 text-base sm:text-lg">
                      {submission.quizzes?.quiz_name || "Unknown Quiz"}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2 break-words">
                      📚 {submission.quizzes?.courses?.course_name || "Unknown Course"}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                      <Clock className="w-3 h-3" />
                      Submitted: {new Date(submission.submitted_at).toLocaleString()}
                    </p>
                    {submission.time_taken_minutes && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                        <Clock className="w-3 h-3" />
                        Time taken: {submission.time_taken_minutes} minutes
                      </p>
                    )}
                  </div>

                  {/* Right Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
                    {submission.score !== null && submission.total_possible ? (
                      <div className="text-center sm:text-right flex-1 sm:flex-none">
                        <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg p-3">
                          <p
                            className={`text-lg font-bold ${getScoreColor(
                              submission.score,
                              submission.total_possible
                            )}`}
                          >
                            {submission.score}/{submission.total_possible}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(
                              (submission.score / submission.total_possible) * 100
                            )}
                            %
                          </p>
                        </div>
                        <span
                          className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getScoreBadge(submission.score, submission.total_possible).color
                            }`}
                        >
                          {getScoreBadge(submission.score, submission.total_possible).label}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center flex-1 sm:flex-none">
                        <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg p-3">
                          <p className="text-lg font-bold text-muted-foreground">
                            Pending
                          </p>
                          <p className="text-xs text-muted-foreground">Grading</p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedResult(submission)}
                      className="flex items-center justify-center gap-1 mt-3 sm:mt-0 w-full sm:w-auto"
                      disabled={detailLoading}
                    >
                      <Eye className="w-3 h-3" />
                      {detailLoading ? "Loading..." : "View Details"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizResults;