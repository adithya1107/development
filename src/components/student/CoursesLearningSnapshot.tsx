import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, FileText, Video, Download, ExternalLink, Clock, Award, TrendingUp, Trophy, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PermissionWrapper from '@/components/PermissionWrapper';

interface CoursesLearningSnapshotProps {
  studentData: any;
}

const CoursesLearningSnapshot: React.FC<CoursesLearningSnapshotProps> = ({ studentData }) => {
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseMaterials, setCourseMaterials] = useState<any[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<any[]>([]);
  const [courseGrades, setCourseGrades] = useState<any[]>([]);
  const [learningProgress, setLearningProgress] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // StudentGrades state
  const [grades, setGrades] = useState<any[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<any[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);

  const { toast } = useToast();

  // StudentGrades data fetching functions
  const fetchGrades = async () => {
    setGradesLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setGrades([]);
        return;
      }

      // Get grades first
      const { data: gradesData } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", user.user.id)
        .order("updated_at", { ascending: false });

      if (!gradesData || gradesData.length === 0) {
        setGrades([]);
        return;
      }

      // Then get class names for those grades
      const classIds = gradesData.map(g => g.class_id);
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, name")
        .in("id", classIds);

      // Combine the data
      const gradesWithClasses = gradesData.map(grade => ({
        ...grade,
        class_name: classesData?.find(c => c.id === grade.class_id)?.name || 'Unknown Class'
      }));

      setGrades(gradesWithClasses);
    } catch (error) {
      console.error('Error fetching grades:', error);
      setGrades([]);
    } finally {
      setGradesLoading(false);
    }
  };

  const fetchQuizSubmissions = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setQuizSubmissions([]);
        return;
      }

      // Get quiz submissions first
      const { data: submissions } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("student_id", user.user.id)
        .not("score", "is", null)
        .order("submitted_at", { ascending: false });

      if (!submissions || submissions.length === 0) {
        setQuizSubmissions([]);
        return;
      }

      // Then get quiz details
      const quizIds = submissions.map(s => s.quiz_id);
      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select("id, title, total_points, weightage, class_id")
        .in("id", quizIds);

      // Get class names
      const classIds = quizzesData?.map(q => q.class_id).filter(Boolean) || [];
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, name")
        .in("id", classIds);

      // Combine all data
      const submissionsWithDetails = submissions.map(submission => {
        const quiz = quizzesData?.find(q => q.id === submission.quiz_id);
        const className = classesData?.find(c => c.id === quiz?.class_id)?.name || 'Unknown Class';

        return {
          ...submission,
          quizzes: quiz ? {
            ...quiz,
            classes: { name: className }
          } : null
        };
      });

      setQuizSubmissions(submissionsWithDetails);
    } catch (error) {
      console.error('Error fetching quiz submissions:', error);
      setQuizSubmissions([]);
    }
  };

  // StudentGrades utility functions
  const getGradeColor = (grade: string) => {
    switch (grade?.toUpperCase()) {
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-yellow-400';
      case 'D': return 'text-orange-400';
      case 'F': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 80) return 'text-blue-400';
    if (percentage >= 70) return 'text-yellow-400';
    if (percentage >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  useEffect(() => {
    fetchEnrolledCourses();
    fetchGrades();
    fetchQuizSubmissions();
  }, [studentData]);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseDetails(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchEnrolledCourses = async () => {
    if (!studentData?.user_id) return;

    setLoading(true);
    try {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (
            id,
            course_name,
            course_code,
            description,
            credits,
            semester,
            academic_year,
            user_profiles!courses_instructor_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('student_id', studentData.user_id)
        .eq('status', 'enrolled');

      if (enrollments) {
        const coursesWithProgress = await Promise.all(
          enrollments.map(async (enrollment) => {
            const progress = await calculateCourseProgress(enrollment.courses.id);
            return {
              ...enrollment,
              progress
            };
          })
        );
        setEnrolledCourses(coursesWithProgress);
        if (coursesWithProgress.length > 0) {
          setSelectedCourse(coursesWithProgress[0].courses);
        }
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load course data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCourseProgress = async (courseId: string) => {
    try {
      // Get total assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .eq('course_id', courseId);

      // Get submitted assignments
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id')
        .eq('student_id', studentData.user_id)
        .in('assignment_id', assignments?.map(a => a.id) || []);

      const totalAssignments = assignments?.length || 0;
      const submittedAssignments = submissions?.length || 0;
      const progress = totalAssignments > 0 ? Math.round((submittedAssignments / totalAssignments) * 100) : 0;

      return {
        totalAssignments,
        submittedAssignments,
        progress
      };
    } catch (error) {
      console.error('Error calculating progress:', error);
      return { totalAssignments: 0, submittedAssignments: 0, progress: 0 };
    }
  };

  const fetchCourseDetails = async (courseId: string) => {
    try {
      // Fetch course materials
      const { data: materials } = await supabase
        .from('lecture_materials')
        .select('*')
        .eq('course_id', courseId)
        .order('uploaded_at', { ascending: false });

      // Fetch assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          *,
          assignment_submissions!inner (
            id,
            submitted_at,
            marks_obtained,
            feedback
          )
        `)
        .eq('course_id', courseId)
        .eq('assignment_submissions.student_id', studentData.user_id);

      // Fetch grades
      const { data: grades } = await supabase
        .from('grades')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentData.user_id)
        .order('recorded_at', { ascending: false });

      setCourseMaterials(materials || []);
      setCourseAssignments(assignments || []);
      setCourseGrades(grades || []);
    } catch (error) {
      console.error('Error fetching course details:', error);
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'pdf':
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getOriginalGradeColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600 bg-green-50';
    if (percentage >= 70) return 'text-blue-600 bg-blue-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const calculateOverallGPA = () => {
    if (courseGrades.length === 0) return 0;
    const totalPoints = courseGrades.reduce((sum, grade) => {
      const percentage = (grade.marks_obtained / grade.max_marks) * 100;
      let points = 0;
      if (percentage >= 85) points = 4.0;
      else if (percentage >= 80) points = 3.7;
      else if (percentage >= 75) points = 3.3;
      else if (percentage >= 70) points = 3.0;
      else if (percentage >= 65) points = 2.7;
      else if (percentage >= 60) points = 2.3;
      else if (percentage >= 55) points = 2.0;
      else points = 1.0;
      return sum + points;
    }, 0);
    return (totalPoints / courseGrades.length).toFixed(2);
  };

  // StudentGrades Component JSX
  const renderStudentGrades = () => {
    if (gradesLoading) {
      return (
        <Card className="card-minimal">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading grades...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Overall Grades */}
        <Card className="card-minimal glass-effect border-primary/20">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="flex items-center gap-2 text-primary">
              <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              Course Grades
              <Award className="w-4 h-4 text-accent ml-auto" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!grades || grades.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No course grades available yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Grades will appear here once your educator assigns them.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {grades.map((grade) => (
                  <Card key={grade.id} className="glass-effect border-l-4 border-l-accent">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">{grade.class_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Last updated: {new Date(grade.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-3xl font-bold ${getGradeColor(grade.overall_grade)}`}>
                            {grade.overall_grade}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {grade.overall_score?.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Grade Breakdown */}
                      {grade.grade_breakdown && typeof grade.grade_breakdown === 'object' && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-accent" />
                            Grade Breakdown
                          </h4>

                          {/* Quiz Scores */}
                          {(grade.grade_breakdown as any)?.quiz_scores && Object.keys((grade.grade_breakdown as any).quiz_scores).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">Quiz Scores:</p>
                              <div className="grid gap-2">
                                {Object.entries((grade.grade_breakdown as any).quiz_scores).map(([quizId, quizData]: [string, any]) => (
                                  <div key={quizId} className="flex justify-between items-center p-2 bg-background/30 rounded border border-primary/20">
                                    <span className="text-sm text-foreground">{quizData.title}</span>
                                    <div className="text-right">
                                      <span className={`font-medium ${getScoreColor(quizData.percentage)}`}>
                                        {quizData.score}/{quizData.total_points}
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({quizData.percentage?.toFixed(1)}% • {quizData.weightage}% weight)
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Custom Assessments */}
                          {(grade.grade_breakdown as any)?.custom_scores && Object.keys((grade.grade_breakdown as any).custom_scores).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">Additional Assessments:</p>
                              <div className="grid gap-2">
                                {Object.entries((grade.grade_breakdown as any).custom_scores).map(([key, score]: [string, any]) => (
                                  <div key={key} className="flex justify-between items-center p-2 bg-background/30 rounded border border-primary/20">
                                    <span className="text-sm text-foreground">
                                      {(grade.grade_breakdown as any).custom_names?.[key] || 'Assessment'}
                                    </span>
                                    <div className="text-right">
                                      <span className={`font-medium ${getScoreColor(score)}`}>
                                        {score}%
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({(grade.grade_breakdown as any).custom_weightages?.[key]}% weight)
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Individual Quiz Results */}
        <Card className="card-minimal glass-effect border-primary/20">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="flex items-center gap-2 text-primary">
              <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              Quiz Results
              <TrendingUp className="w-4 h-4 text-accent ml-auto" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!quizSubmissions || quizSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No quiz results available yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Complete quizzes to see your results here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quizSubmissions.map((submission) => {
                  const percentage = submission.quizzes?.total_points > 0
                    ? (submission.score / submission.quizzes.total_points) * 100
                    : 0;

                  return (
                    <div key={submission.id} className="flex justify-between items-center p-3 glass-effect rounded border border-primary/20 hover:border-accent/40 transition-all">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{submission.quizzes?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          📚 {submission.quizzes?.classes?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg p-2">
                          <p className={`font-bold ${getScoreColor(percentage)}`}>
                            {submission.score}/{submission.quizzes?.total_points}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                        {submission.quizzes?.weightage > 0 && (
                          <p className="text-xs text-accent mt-1">
                            Weight: {submission.quizzes.weightage}%
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PermissionWrapper permission="view_submit_assignments">
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Courses & Learning Snapshot</h2>
            <p className="text-muted-foreground">Track your academic progress and course materials</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 w-ful">
          <Card className="hover:shadow-md transition-all duration-300 hover:border-role-student/20 cursor-pointer hover:scale-[1.01] sm:hover:scale-[1.03] md:hover:scale-105">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate mb-1">Enrolled Courses</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">{enrolledCourses.length}</p>
                </div>
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300 hover:border-role-student/20 cursor-pointer hover:scale-[1.01] sm:hover:scale-[1.03] md:hover:scale-105">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate mb-1">Overall Progress</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
                    {enrolledCourses.length > 0
                      ? Math.round(enrolledCourses.reduce((sum, course) => sum + course.progress.progress, 0) / enrolledCourses.length)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300 hover:border-role-student/20 cursor-pointer hover:scale-[1.01] sm:hover:scale-[1.03] md:hover:scale-105">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate mb-1">Current GPA</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">{calculateOverallGPA()}</p>
                </div>
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300 hover:border-role-student/20 cursor-pointer hover:scale-[1.01] sm:hover:scale-[1.03] md:hover:scale-105">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate mb-1">Total Credits</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
                    {enrolledCourses.reduce((sum, course) => sum + (course.courses.credits || 0), 0)}
                  </p>
                </div>
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="space-y-3 sm:space-y-4">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="courses" className="text-xs sm:text-sm flex-1 sm:flex-none">Courses</TabsTrigger>
              <TabsTrigger value="materials" className="text-xs sm:text-sm flex-1 sm:flex-none">Materials</TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs sm:text-sm flex-1 sm:flex-none">Assignments</TabsTrigger>
              <TabsTrigger value="grades" className="text-xs sm:text-sm flex-1 sm:flex-none">Grades</TabsTrigger>
            </TabsList>
          </div>

          {/* Courses Overview */}
          <TabsContent value="courses" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {enrolledCourses.map((enrollment, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedCourse(enrollment.courses)}>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg">{enrollment.courses.course_name}</CardTitle>
                      <Badge variant="outline" className="mt-2 text-xs">{enrollment.courses.course_code}</Badge>
                    </div>
                    <Badge variant={enrollment.progress.progress >= 75 ? 'default' : 'secondary'} className="text-xs self-start">
                      {enrollment.progress.progress}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="space-y-3">
                    <Progress value={enrollment.progress.progress} />
                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      <p>Instructor: {enrollment.courses.user_profiles?.first_name} {enrollment.courses.user_profiles?.last_name}</p>
                      <p>Credits: {enrollment.courses.credits}</p>
                      <p>Assignments: {enrollment.progress.submittedAssignments}/{enrollment.progress.totalAssignments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

          {/* Course Materials */}
          <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Course Materials - {selectedCourse?.course_name || "Select a course"}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3">
                {courseMaterials.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-muted-foreground">
                    No materials available for this course
                  </div>
                ) : (
                  courseMaterials.map((material, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                      <div className="flex items-start space-x-3">
                        {getMaterialIcon(material.material_type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{material.title}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{material.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploaded: {new Date(material.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {material.file_url && (
                          <Button size="sm" variant="outline" asChild className="text-xs">
                            <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              View
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-xs">
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Assignments */}
          <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Assignments - {selectedCourse?.course_name || "Select a course"}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                {courseAssignments.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-muted-foreground">
                    No assignments for this course
                  </div>
                ) : (
                  courseAssignments.map((assignment, index) => (
                    <div key={index} className="p-3 sm:p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm sm:text-base">{assignment.title}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{assignment.description}</p>
                        </div>
                        <Badge variant={assignment.assignment_submissions?.length > 0 ? 'default' : 'secondary'} className="text-xs self-start">
                          {assignment.assignment_submissions?.length > 0 ? 'Submitted' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <p className="text-muted-foreground">Due Date</p>
                          <p className="font-medium mt-1">{new Date(assignment.due_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Max Marks</p>
                          <p className="font-medium mt-1">{assignment.max_marks}</p>
                        </div>
                        {assignment.assignment_submissions?.length > 0 && (
                          <div>
                            <p className="text-muted-foreground">Score</p>
                            <p className="font-medium mt-1">{assignment.assignment_submissions[0].marks_obtained || 'Not graded'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Grades - Now uses StudentGrades component */}
          <TabsContent value="grades" className="space-y-4">
          {renderStudentGrades()}
        </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
};

export default CoursesLearningSnapshot;