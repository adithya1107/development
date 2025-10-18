import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Award, BookOpen, Calculator, ChevronDown, ChevronRight, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const StudentGrades = () => {
  const [grades, setGrades] = useState([]);
  const [quizSubmissions, setQuizSubmissions] = useState([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGrades, setExpandedGrades] = useState({});

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setError('User not authenticated');
        return;
      }

      // Fetch grades with course information
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select(`
          *,
          courses (
            id,
            course_name,
            course_code
          )
        `)
        .eq("student_id", user.user.id)
        .order("recorded_at", { ascending: false });

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        setError('Failed to fetch grades');
      } else {
        setGrades(gradesData || []);
      }

      // Fetch quiz submissions with quiz and course details
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("quiz_submissions")
        .select(`
          *,
          quizzes (
            id,
            quiz_name,
            course_id,
            weightage,
            courses (
              id,
              course_name,
              course_code
            )
          )
        `)
        .eq("student_id", user.user.id)
        .not("score", "is", null)
        .order("submitted_at", { ascending: false });

      if (submissionsError) {
        console.error('Error fetching quiz submissions:', submissionsError);
        setError('Failed to fetch quiz submissions');
      } else {
        setQuizSubmissions(submissionsData || []);
      }

      // Fetch assignment submissions with assignment and course details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignment_submissions")
        .select(`
          *,
          assignments (
            id,
            title,
            course_id,
            max_marks,
            courses (
              id,
              course_name,
              course_code
            )
          )
        `)
        .eq("student_id", user.user.id)
        .not("marks_obtained", "is", null)
        .order("submitted_at", { ascending: false });

      if (assignmentError) {
        console.error('Error fetching assignment submissions:', assignmentError);
        setError('Failed to fetch assignment submissions');
      } else {
        setAssignmentSubmissions(assignmentData || []);
      }

    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 80) return 'text-blue-400';
    if (percentage >= 70) return 'text-yellow-400';
    if (percentage >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const getLetterGrade = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const calculatePercentage = (obtained, max) => {
    return max > 0 ? (obtained / max) * 100 : 0;
  };

  const toggleGradeExpansion = (gradeId) => {
    setExpandedGrades(prev => ({
      ...prev,
      [gradeId]: !prev[gradeId]
    }));
  };

  const renderGradeBreakdown = (gradeBreakdown) => {
    if (!gradeBreakdown || typeof gradeBreakdown !== 'object') {
      return null;
    }

    // Handle the specific structure from your database
    let breakdownItems = [];

    // Check for custom_assessments array in the grade_breakdown
    if (gradeBreakdown.custom_assessments && Array.isArray(gradeBreakdown.custom_assessments)) {
      breakdownItems = gradeBreakdown.custom_assessments.map(assessment => ({
        name: assessment.name,
        score: assessment.score,
        maxScore: assessment.maxScore,
        date: assessment.date,
        id: assessment.id
      }));
    }
    // Fallback to handle other possible structures
    else if (Array.isArray(gradeBreakdown)) {
      breakdownItems = gradeBreakdown;
    } else if (gradeBreakdown.assessments && Array.isArray(gradeBreakdown.assessments)) {
      breakdownItems = gradeBreakdown.assessments;
    } else if (gradeBreakdown.components && Array.isArray(gradeBreakdown.components)) {
      breakdownItems = gradeBreakdown.components;
    } else {
      // If it's an object with key-value pairs, convert to array
      breakdownItems = Object.entries(gradeBreakdown)
        .filter(([key]) => key !== 'last_updated' && key !== 'calculated_score' && key !== 'total_assessments' && key !== 'assignment_scores')
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            return { name: key, ...value };
          } else {
            return { name: key, marks: value };
          }
        });
    }

    if (breakdownItems.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 space-y-2">
        <h6 className="text-xs font-medium text-foreground/70 flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          Assessment Breakdown
        </h6>
        <div className="space-y-1">
          {breakdownItems.map((item, index) => {
            // Handle the specific structure from your database
            const itemName = item.name || item.assessment_name || item.component || `Assessment ${index + 1}`;
            const itemMarks = item.score || item.marks_obtained || item.marks || 0;
            const itemMaxMarks = item.maxScore || item.max_marks || item.total || item.max_score || 0;
            const itemPercentage = calculatePercentage(itemMarks, itemMaxMarks);
            const itemWeight = item.weightage || item.weight || null;
            const itemDate = item.date;

            return (
              <div key={item.id || index} className="flex justify-between items-center p-2 bg-accent/10 rounded border">
                <div className="flex-1">
                  <span className="text-xs font-medium text-foreground">
                    {itemName}
                  </span>
                  {itemWeight && (
                    <span className="text-xs text-accent ml-2">
                      (Weight: {itemWeight}%)
                    </span>
                  )}
                  {itemDate && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(itemDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium ${getGradeColor(itemPercentage)}`}>
                    {itemMarks}{itemMaxMarks > 0 && `/${itemMaxMarks}`}
                  </div>
                  {itemMaxMarks > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {itemPercentage.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
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

  if (error) {
    return (
      <Card className="card-minimal border-red-200">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-red-600 font-medium">Error loading data</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button
              onClick={fetchStudentData}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group grades by course
  const groupedGrades = grades.reduce((acc, grade) => {
    const courseId = grade.course_id;
    if (!acc[courseId]) {
      acc[courseId] = {
        course: grade.courses,
        grades: []
      };
    }
    acc[courseId].grades.push(grade);
    return acc;
  }, {});

  // Get all courses from grades, quizzes, and assignments
  const allCourses = new Set();
  grades.forEach(grade => allCourses.add(grade.course_id));
  quizSubmissions.forEach(quiz => allCourses.add(quiz.quizzes?.course_id));
  assignmentSubmissions.forEach(assignment => allCourses.add(assignment.assignments?.course_id));

  // Create comprehensive course data
  const comprehensiveGrades = {};
  allCourses.forEach(courseId => {
    if (!courseId) return;

    const courseGrades = grades.filter(g => g.course_id === courseId);
    const courseQuizzes = quizSubmissions.filter(q => q.quizzes?.course_id === courseId);
    const courseAssignments = assignmentSubmissions.filter(a => a.assignments?.course_id === courseId);

    // Get course info from any available source
    const courseInfo = courseGrades[0]?.courses ||
      courseQuizzes[0]?.quizzes?.courses ||
      courseAssignments[0]?.assignments?.courses;

    if (courseInfo) {
      comprehensiveGrades[courseId] = {
        course: courseInfo,
        grades: courseGrades,
        quizzes: courseQuizzes,
        assignments: courseAssignments
      };
    }
  });

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 w-full max-w-full">
      {/* Overall Grades by Course */}
      <Card className="card-minimal glass-effect border-primary/20 w-full">
        <CardHeader className="border-b border-primary/20 p-4 sm:p-5 md:p-6">
          <CardTitle className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3 text-primary">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-base sm:text-lg md:text-xl font-semibold">Course Grades</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 md:p-6">
          {Object.keys(comprehensiveGrades).length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 bg-muted/50">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">No course grades available yet.</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 px-4">Grades will appear here once your educator assigns them.</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {Object.entries(comprehensiveGrades).map(([courseId, courseData]) => {
                // Calculate overall course performance from all assessments
                const allAssessments = [
                  ...courseData.grades.map(g => ({ obtained: g.marks_obtained, max: g.max_marks, type: g.grade_type, name: g.grade_type, date: g.recorded_at })),
                  ...courseData.quizzes.map(q => ({ obtained: q.score, max: q.total_possible, type: 'quiz', name: q.quizzes?.quiz_name, date: q.submitted_at })),
                  ...courseData.assignments.map(a => ({ obtained: a.marks_obtained, max: a.assignments?.max_marks, type: 'assignment', name: a.assignments?.title, date: a.submitted_at }))
                ];

                const totalMarks = allAssessments.reduce((sum, assessment) => sum + (assessment.max || 0), 0);
                const obtainedMarks = allAssessments.reduce((sum, assessment) => sum + (assessment.obtained || 0), 0);
                const overallPercentage = calculatePercentage(obtainedMarks, totalMarks);
                const letterGrade = getLetterGrade(overallPercentage);

                return (
                 <Card key={courseId} className="glass-effect border-l-4 border-l-blue-500 w-full">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col xs:flex-row xs:justify-between xs:items-start gap-3 mb-3 sm:mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-gray-100 break-words">
                            {courseData.course?.course_name || 'Unknown Course'}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                            {courseData.course?.course_code}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                            {allAssessments.length} assessment{allAssessments.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-left xs:text-right flex-shrink-0">
                          <p className={`text-2xl sm:text-3xl font-bold ${getGradeColor(overallPercentage)}`}>
                            {letterGrade}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {overallPercentage.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {/* Individual Assessment Breakdown */}
                      <div className="space-y-3 sm:space-y-4">
                        <h4 className="font-medium text-sm sm:text-base text-foreground flex items-center gap-2">
                          <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent flex-shrink-0" />
                          Assessment Breakdown
                        </h4>

                        {/* Formal Grades (Midterm, Final, etc.) with detailed breakdown */}
                        {courseData.grades.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs sm:text-sm font-medium text-foreground/80 flex items-center gap-1">
                              <Award className="w-3 h-3 flex-shrink-0" />
                              Formal Assessments
                            </h5>
                            {courseData.grades.map((grade) => {
                              const percentage = calculatePercentage(grade.marks_obtained, grade.max_marks);
                              const hasBreakdown = grade.grade_breakdown &&
                                (typeof grade.grade_breakdown === 'object') &&
                                Object.keys(grade.grade_breakdown).length > 0;

                              return (
                                <div key={grade.id} className="rounded border w-full">
                                  <div
                                    className={`flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 p-2 sm:p-3 ${hasBreakdown ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                                    onClick={() => hasBreakdown && toggleGradeExpansion(grade.id)}
                                  >
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      {hasBreakdown && (
                                        <div className="flex-shrink-0 mt-0.5">
                                          {expandedGrades[grade.id] ?
                                            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" /> :
                                            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                                          }
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs sm:text-sm text-foreground font-medium break-words">
                                          {grade.grade_type?.charAt(0).toUpperCase() + grade.grade_type?.slice(1) || 'Assessment'}
                                        </span>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground break-words">
                                          Formal Grade • {new Date(grade.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          {hasBreakdown && <span className="text-accent ml-1">• Tap for details</span>}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-left xs:text-right flex-shrink-0 pl-6 xs:pl-0">
                                      <div className="flex flex-col xs:items-end gap-0.5">
                                        <div>
                                          <span className={`font-medium text-sm sm:text-base ${getGradeColor(percentage)}`}>
                                            {grade.marks_obtained.toFixed(2)}/{grade.max_marks.toFixed(2)}
                                          </span>
                                          <span className="text-[10px] sm:text-xs text-muted-foreground ml-2">
                                            ({percentage.toFixed(2)}%)
                                          </span>
                                        </div>
                                        {grade.grade_letter && (
                                          <div className={`text-xs font-bold ${getGradeColor(percentage)}`}>
                                            Grade: {grade.grade_letter}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expanded grade breakdown */}
                                  {hasBreakdown && expandedGrades[grade.id] && (
                                    <div className="px-3 sm:px-4 pb-3 border-t">
                                      {renderGradeBreakdown(grade.grade_breakdown)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Quiz Submissions */}
                        {courseData.quizzes.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs sm:text-sm font-medium text-foreground/80 flex items-center gap-1">
                              <BookOpen className="w-3 h-3 flex-shrink-0" />
                              Quiz Assessments
                            </h5>
                            {courseData.quizzes.map((quiz) => {
                              const percentage = calculatePercentage(quiz.score, quiz.total_possible);
                              return (
                                <div key={quiz.id} className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 p-2 sm:p-3 rounded border w-full">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs sm:text-sm text-foreground font-medium break-words block">
                                      {quiz.quizzes?.quiz_name || 'Quiz'}
                                    </span>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground break-words">
                                      Quiz • {new Date(quiz.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      {quiz.attempt_number > 1 && ` • Attempt #${quiz.attempt_number}`}
                                    </p>
                                  </div>
                                  <div className="text-left xs:text-right flex-shrink-0 pl-0 xs:pl-2">
                                    <div>
                                      <span className={`font-medium text-sm sm:text-base ${getGradeColor(percentage)}`}>
                                        {quiz.score}/{quiz.total_possible}
                                      </span>
                                      <span className="text-[10px] sm:text-xs text-muted-foreground ml-2">
                                        ({percentage.toFixed(1)}%)
                                      </span>
                                    </div>
                                    {quiz.quizzes?.weightage > 0 && (
                                      <p className="text-[10px] sm:text-xs text-accent">
                                        Weight: {quiz.quizzes.weightage}%
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Assignment Submissions */}
                        {courseData.assignments.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs sm:text-sm font-medium text-foreground/80 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 flex-shrink-0" />
                              Assignment Submissions
                            </h5>
                            {courseData.assignments.map((assignment) => {
                              const percentage = calculatePercentage(assignment.marks_obtained, assignment.assignments?.max_marks);
                              return (
                                <div key={assignment.id} className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 p-2 sm:p-3 bg-purple-50/50 rounded border border-purple-200/40 w-full">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs sm:text-sm text-foreground font-medium break-words block">
                                      {assignment.assignments?.title || 'Assignment'}
                                    </span>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground break-words">
                                      Assignment • {new Date(assignment.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </p>
                                  </div>
                                  <div className="text-left xs:text-right flex-shrink-0 pl-0 xs:pl-2">
                                    <div>
                                      <span className={`font-medium text-sm sm:text-base ${getGradeColor(percentage)}`}>
                                        {assignment.marks_obtained}/{assignment.assignments?.max_marks}
                                      </span>
                                      <span className="text-[10px] sm:text-xs text-muted-foreground ml-2">
                                        ({percentage.toFixed(1)}%)
                                      </span>
                                    </div>
                                    {assignment.feedback && (
                                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                                        Feedback available
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Summary */}
                        <div className="pt-2 border-t border-primary/20">
                          <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 text-xs sm:text-sm">
                            <span className="font-medium text-foreground">Total Average</span>
                            <span className={`font-bold ${getGradeColor(overallPercentage)}`}>
                              {obtainedMarks.toFixed(2)}/{totalMarks} ({overallPercentage.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Quiz Results */}
      {/* <Card className="card-minimal glass-effect border-primary/20">
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
          {quizSubmissions.length === 0 ? (
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
                const percentage = calculatePercentage(submission.score, submission.total_possible);
                
                return (
                  <div key={submission.id} className="flex justify-between items-center p-3 glass-effect rounded border border-primary/20 hover:border-accent/40 transition-all">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {submission.quizzes?.quiz_name || 'Unknown Quiz'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        📚 {submission.quizzes?.courses?.course_name} ({submission.quizzes?.courses?.course_code})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                      </p>
                      {submission.attempt_number > 1 && (
                        <p className="text-xs text-accent">
                          Attempt #{submission.attempt_number}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg p-2">
                        <p className={`font-bold ${getGradeColor(percentage)}`}>
                          {submission.score}/{submission.total_possible}
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
                      {submission.time_taken_minutes && (
                        <p className="text-xs text-muted-foreground">
                          Time: {submission.time_taken_minutes}min
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card> */}
    </div>
  );
};

export default StudentGrades;