import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, Save, RefreshCw, GraduationCap, Plus, Trash2 } from "lucide-react";

const GradeManager = () => {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [overallGrade, setOverallGrade] = useState("");
  const [gradeBreakdown, setGradeBreakdown] = useState({});
  const [customAssessments, setCustomAssessments] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // State for database data
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignmentData, setAssignmentData] = useState({ assignments: [], submissions: [] });
  const [existingGrade, setExistingGrade] = useState(null);

  // Fetch educator's courses
  const fetchEducatorCourses = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Error",
          description: "No authenticated user found.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("courses")
        .select("id, course_name, course_code")
        .eq("instructor_id", user.user.id)
        .eq("is_active", true);

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch courses: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch students enrolled in selected course
  const fetchCourseStudents = async (courseId) => {
    if (!courseId) {
      setStudents([]);
      return;
    }

    setLoading(true);
    try {
      const { data: enrollments, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId)
        .eq("status", "enrolled");

      if (enrollmentError) throw enrollmentError;

      if (!enrollments || enrollments.length === 0) {
        setStudents([]);
        return;
      }

      const studentIds = enrollments.map(e => e.student_id);
      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email")
        .in("id", studentIds);

      if (profileError) throw profileError;
      setStudents(profiles || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch students: " + error.message,
        variant: "destructive",
      });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assignments and submissions for selected course and student
  const fetchStudentAssignmentData = async (courseId, studentId) => {
    if (!courseId || !studentId) {
      setAssignmentData({ assignments: [], submissions: [] });
      return;
    }

    setLoading(true);
    try {
      // Get assignments for the course
      const { data: assignments, error: assignmentError } = await supabase
        .from("assignments")
        .select("id, title, max_marks")
        .eq("course_id", courseId);

      if (assignmentError) throw assignmentError;

      if (!assignments || assignments.length === 0) {
        setAssignmentData({ assignments: [], submissions: [] });
        return;
      }

      // Get submissions for the student
      const assignmentIds = assignments.map(a => a.id);
      const { data: submissions, error: submissionError } = await supabase
        .from("assignment_submissions")
        .select("assignment_id, marks_obtained")
        .eq("student_id", studentId)
        .in("assignment_id", assignmentIds);

      if (submissionError) throw submissionError;

      setAssignmentData({
        assignments: assignments || [],
        submissions: submissions || [],
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch assignment data: " + error.message,
        variant: "destructive",
      });
      setAssignmentData({ assignments: [], submissions: [] });
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing grade record
  const fetchExistingGrade = async (courseId, studentId) => {
    if (!courseId || !studentId) {
      setExistingGrade(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .eq("grade_type", "final")
        .maybeSingle();

      if (error) throw error;
      setExistingGrade(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch existing grade: " + error.message,
        variant: "destructive",
      });
      setExistingGrade(null);
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    fetchEducatorCourses();
  }, []);

  // Load students when course changes
  useEffect(() => {
    fetchCourseStudents(selectedCourse);
    setSelectedStudent(""); // Reset student selection
  }, [selectedCourse]);

  // Load assignment data and existing grade when course or student changes
  useEffect(() => {
    fetchStudentAssignmentData(selectedCourse, selectedStudent);
    fetchExistingGrade(selectedCourse, selectedStudent);
  }, [selectedCourse, selectedStudent]);

  // Load existing grade data when it changes
  useEffect(() => {
    if (existingGrade) {
      setOverallGrade(existingGrade.grade_letter || "");
      const breakdown = existingGrade.grade_breakdown || {};
      setGradeBreakdown(breakdown);
      
      // Load custom assessments from the database
      const customAssessmentsFromDB = breakdown.custom_assessments || [];
      setCustomAssessments(customAssessmentsFromDB);
    } else {
      setOverallGrade("");
      setGradeBreakdown({});
      setCustomAssessments([]);
    }
  }, [existingGrade]);

  const calculateWeightedScore = () => {
    let totalScore = 0;
    let totalItems = 0;

    // Calculate average from assignments
    assignmentData.assignments.forEach(assignment => {
      const submission = assignmentData.submissions.find(s => s.assignment_id === assignment.id);
      if (submission && assignment.max_marks > 0) {
        const percentage = (submission.marks_obtained / assignment.max_marks) * 100;
        totalScore += percentage;
        totalItems += 1;
      }
    });

    // Add custom assessments
    customAssessments.forEach(assessment => {
      if (assessment.score >= 0 && assessment.maxScore > 0) {
        const percentage = (assessment.score / assessment.maxScore) * 100;
        totalScore += percentage;
        totalItems += 1;
      }
    });

    return totalItems > 0 ? totalScore / totalItems : 0;
  };

  const getLetterGrade = (score) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };

  const addCustomAssessment = () => {
    const newAssessment = {
      id: Date.now().toString(),
      name: "",
      score: 0,
      maxScore: 100,
      date: new Date().toISOString().split('T')[0]
    };
    setCustomAssessments(prev => [...prev, newAssessment]);
  };

  const updateCustomAssessment = (id, field, value) => {
    setCustomAssessments(prev => 
      prev.map(assessment => 
        assessment.id === id 
          ? { ...assessment, [field]: field === 'score' || field === 'maxScore' ? parseFloat(value) || 0 : value }
          : assessment
      )
    );
  };

  const removeCustomAssessment = (id) => {
    setCustomAssessments(prev => prev.filter(assessment => assessment.id !== id));
  };

  const saveGrade = async () => {
    if (!selectedCourse || !selectedStudent) {
      toast({
        title: "Error",
        description: "Please select a course and student.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Error",
          description: "No authenticated user found.",
          variant: "destructive",
        });
        return;
      }

      const calculatedScore = calculateWeightedScore();
      const finalGrade = overallGrade || getLetterGrade(calculatedScore);

      const breakdown = {
        assignment_scores: {},
        custom_assessments: customAssessments, // Store the full custom assessments array
        calculated_score: calculatedScore,
        total_assessments: assignmentData.assignments.length + customAssessments.length,
        last_updated: new Date().toISOString()
      };

      // Add assignment scores to breakdown
      assignmentData.assignments.forEach(assignment => {
        const submission = assignmentData.submissions.find(s => s.assignment_id === assignment.id);
        breakdown.assignment_scores[assignment.id] = {
          title: assignment.title,
          score: submission?.marks_obtained || 0,
          max_marks: assignment.max_marks,
          percentage: assignment.max_marks > 0 ? ((submission?.marks_obtained || 0) / assignment.max_marks) * 100 : 0,
        };
      });

      // Ensure recorded_by references an existing profile or else set to null to avoid FK errors
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Failed to verify user profile before saving grade', profileError);
      }

      const recordedBy = profile ? user.user.id : null;

      const gradeData = {
        student_id: selectedStudent,
        course_id: selectedCourse,
        grade_type: 'final',
        marks_obtained: calculatedScore,
        max_marks: 100,
        grade_letter: finalGrade,
        recorded_by: recordedBy,
        grade_breakdown: breakdown,
      };

      let error;
      if (existingGrade) {
        const result = await supabase
          .from("grades")
          .update(gradeData)
          .eq("id", existingGrade.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("grades")
          .insert(gradeData);
        error = result.error;
      }

      if (error) throw error;

      // Also save to course_grades table for CGPA calculation
      const { data: courseInfo } = await supabase
        .from("courses")
        .select("credits, academic_year, semester")
        .eq("id", selectedCourse)
        .single();

      if (courseInfo) {
        // Convert letter grade to grade point (10-point scale)
        const gradePointMap: { [key: string]: number } = {
          'A': 10, 'B': 8, 'C': 6, 'D': 4, 'F': 0
        };
        const gradePoint = gradePointMap[finalGrade] || 0;

        const courseGradeData = {
          student_id: selectedStudent,
          course_id: selectedCourse,
          academic_year: courseInfo.academic_year || new Date().getFullYear().toString(),
          semester: courseInfo.semester || 'Fall',
          total_marks: calculatedScore,
          max_marks: 100,
          percentage: calculatedScore,
          grade_letter: finalGrade,
          grade_point: gradePoint,
          credits: courseInfo.credits || 0,
          is_completed: true,
          is_passed: gradePoint >= 4,
          recorded_by: recordedBy,
          recorded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await supabase
          .from("course_grades")
          .upsert(courseGradeData, {
            onConflict: 'student_id,course_id,academic_year,semester',
            ignoreDuplicates: false
          });
      }

      // Refresh the existing grade data
      await fetchExistingGrade(selectedCourse, selectedStudent);

      toast({
        title: "Success",
        description: `Grade saved: ${finalGrade} (${calculatedScore.toFixed(1)}%) - ${customAssessments.length} assessments stored. Saved to CGPA records.`,
      });
    } catch (error) {
      console.error('Failed to save grade', error);
      const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      const details = error?.details ? ` (${error.details})` : '';

      toast({
        title: "Error",
        description: "Failed to save grade: " + msg + details,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading courses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-6 min-h-screen">
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            Grade Management System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-3 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course-select" className="text-sm">Select Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.course_code} - {course.course_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-select" className="text-sm">Select Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedCourse || loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedCourse && selectedStudent && (
            <>
              {/* Assignment Scores Section */}
              {assignmentData.assignments.length > 0 && (
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Official Assignment Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-3">
                      {assignmentData.assignments.map((assignment) => {
                        const submission = assignmentData.submissions.find(s => s.assignment_id === assignment.id);
                        const score = submission?.marks_obtained || 0;
                        const percentage = assignment.max_marks > 0 ? (score / assignment.max_marks) * 100 : 0;
                        
                        return (
                          <div key={assignment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded border gap-2">
                            <div className="flex-1 w-full min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{assignment.title}</p>
                              <p className="text-xs sm:text-sm">
                                Score: {score}/{assignment.max_marks} ({percentage.toFixed(1)}%)
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Custom Assessments Section */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <span>Manual Assessments ({customAssessments.length})</span>
                    <Button 
                      onClick={addCustomAssessment} 
                      size="sm" 
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Assessment
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-4">
                    {customAssessments.map((assessment) => (
                      <div key={assessment.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3 sm:p-4 rounded border">
                        <div className="space-y-1">
                          <Label className="text-xs sm:text-sm">Assessment Name</Label>
                          <Input
                            placeholder="e.g., Quiz 1, Project"
                            value={assessment.name}
                            onChange={(e) => updateCustomAssessment(assessment.id, 'name', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs sm:text-sm">Score Obtained</Label>
                          <Input
                            type="number"
                            placeholder="Score"
                            value={assessment.score}
                            onChange={(e) => updateCustomAssessment(assessment.id, 'score', e.target.value)}
                            min="0"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs sm:text-sm">Max Score</Label>
                          <Input
                            type="number"
                            placeholder="Max"
                            value={assessment.maxScore}
                            onChange={(e) => updateCustomAssessment(assessment.id, 'maxScore', e.target.value)}
                            min="1"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs sm:text-sm">Date</Label>
                          <Input
                            type="date"
                            value={assessment.date}
                            onChange={(e) => updateCustomAssessment(assessment.id, 'date', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex items-end sm:col-span-1 col-span-1">
                          <Button
                            onClick={() => removeCustomAssessment(assessment.id)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {assessment.maxScore > 0 && (
                          <div className="sm:col-span-2 md:col-span-5 text-xs sm:text-sm">
                            Percentage: {((assessment.score / assessment.maxScore) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    ))}
                    {customAssessments.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm sm:text-base">No manual assessments added yet.</p>
                        <p className="text-xs sm:text-sm mt-1">Click "Add Assessment" to include additional scores like quizzes, projects, or participation grades.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Grade Summary */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
                    Grade Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-3 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 sm:p-4 rounded border">
                      <p className="text-xs sm:text-sm">Total Assessments</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {assignmentData.assignments.length + customAssessments.length}
                      </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded border">
                      <p className="text-xs sm:text-sm">Manual Assessments</p>
                      <p className="text-xl sm:text-2xl font-bold">{customAssessments.length}</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded border">
                      <p className="text-xs sm:text-sm">Calculated Score</p>
                      <p className="text-xl sm:text-2xl font-bold">{calculateWeightedScore().toFixed(1)}%</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded border">
                      <p className="text-xs sm:text-sm">Auto Grade</p>
                      <p className="text-xl sm:text-2xl font-bold">{getLetterGrade(calculateWeightedScore())}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="overall-grade" className="text-sm">Final Grade Override</Label>
                    <Input
                      id="overall-grade"
                      value={overallGrade}
                      onChange={(e) => setOverallGrade(e.target.value)}
                      placeholder={`Auto-calculated: ${getLetterGrade(calculateWeightedScore())}`}
                      className="text-center font-bold text-sm sm:text-base"
                    />
                    <p className="text-xs">Leave empty to use auto-calculated grade</p>
                  </div>

                  <Button
                    onClick={saveGrade}
                    disabled={isSaving || loading}
                    className="w-full text-sm sm:text-base"
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Saving Grade & Assessments...</span>
                        <span className="sm:hidden">Saving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        <span className="hidden sm:inline">Save Grade & {customAssessments.length} Custom Assessments</span>
                        <span className="sm:hidden">Save Grade</span>
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeManager;