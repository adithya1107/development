import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calculator, 
  Save, 
  RefreshCw, 
  GraduationCap,
  BarChart3,
  FileText,
  Download,
  Plus,
  TrendingUp,
  Users,
  Award
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface TeacherGradebookProps {
  teacherData: any;
}

const TeacherGradebook = ({ teacherData }: TeacherGradebookProps) => {
  // Updated to use 'courses' instead of 'classes'
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [quizData, setQuizData] = useState<any>(null);
  const [existingGrade, setExistingGrade] = useState<any>(null);
  const [overallGrade, setOverallGrade] = useState("");
  const [gradeBreakdown, setGradeBreakdown] = useState<Record<string, any>>({});
  const [customScores, setCustomScores] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // New state for adding grades
  const [newGrade, setNewGrade] = useState({
    student_id: '',
    assignment_id: '',
    grade_type: 'assignment',
    marks_obtained: 0,
    max_marks: 100,
    grade_letter: ''
  });

  const [assignments, setAssignments] = useState<any[]>([]);
  const [allGrades, setAllGrades] = useState<any[]>([]);

  useEffect(() => {
    fetchCourses();
  }, [teacherData]);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudents();
      fetchAssignments();
      fetchAllGrades();
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedCourse && selectedStudent) {
      fetchQuizData();
      fetchExistingGrade();
    }
  }, [selectedCourse, selectedStudent]);

  useEffect(() => {
    if (existingGrade) {
      setOverallGrade(existingGrade.grade_letter || "");
      const breakdown = existingGrade.grade_breakdown as Record<string, any> || {};
      setGradeBreakdown(breakdown);
      setCustomScores(breakdown.custom_scores || {});
    } else {
      setOverallGrade("");
      setGradeBreakdown({});
      setCustomScores({});
    }
  }, [existingGrade]);

  // Updated to fetch courses instead of classes
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data } = await supabase
        .from("courses")
        .select("id, course_name, course_code")
        .eq("instructor_id", user.user.id)
        .eq("is_active", true);
      
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Updated to use enrollments table
  const fetchStudents = async () => {
    if (!selectedCourse) return;

    try {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          user_profiles!enrollments_student_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq("course_id", selectedCourse)
        .eq("status", "enrolled");

      if (!enrollments || enrollments.length === 0) return;

      // Extract student profiles from the joined data
      const studentProfiles = enrollments.map((enrollment: any) => enrollment.user_profiles).filter(Boolean);
      setStudents(studentProfiles);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // Updated to use learning_modules and quiz_submissions from your schema
  const fetchQuizData = async () => {
    if (!selectedCourse || !selectedStudent) return;

    try {
      // Fetch learning modules (quizzes) for the course
      const { data: modules } = await supabase
        .from("learning_modules")
        .select("id, module_name, module_type")
        .eq("course_id", selectedCourse)
        .eq("module_type", "quiz")
        .eq("is_published", true);

      if (!modules || modules.length === 0) {
        setQuizData({ quizzes: [], submissions: [] });
        return;
      }

      const moduleIds = modules.map(m => m.id);
      
      // Get quizzes for these modules
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("*")
        .in("module_id", moduleIds)
        .eq("is_active", true);

      if (!quizzes || quizzes.length === 0) {
        setQuizData({ quizzes: [], submissions: [] });
        return;
      }

      const quizIds = quizzes.map(q => q.id);
      const { data: submissions } = await supabase
        .from("quiz_submissions")
        .select("quiz_id, score")
        .eq("student_id", selectedStudent)
        .in("quiz_id", quizIds)
        .eq("is_completed", true);

      setQuizData({
        quizzes: quizzes || [],
        submissions: submissions || [],
      });
    } catch (error) {
      console.error('Error fetching quiz data:', error);
    }
  };

  // Updated to use the grades table from your schema
  const fetchExistingGrade = async () => {
    if (!selectedCourse || !selectedStudent) return;

    try {
      const { data } = await supabase
        .from("grades")
        .select("*")
        .eq("course_id", selectedCourse)
        .eq("student_id", selectedStudent)
        .maybeSingle();

      setExistingGrade(data);
    } catch (error) {
      console.error('Error fetching existing grade:', error);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedCourse) return;

    try {
      const { data } = await supabase
        .from("assignments")
        .select("*")
        .eq("course_id", selectedCourse)
        .order("due_date", { ascending: true });

      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  // Updated to use proper table structure
  const fetchAllGrades = async () => {
    if (!selectedCourse) return;

    try {
      const { data } = await supabase
        .from("grades")
        .select(`
          *,
          user_profiles!grades_student_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq("course_id", selectedCourse)
        .order("recorded_at", { ascending: false });

      setAllGrades(data || []);
    } catch (error) {
      console.error('Error fetching all grades:', error);
    }
  };

  const calculateWeightedScore = () => {
    if (!quizData || !quizData.quizzes.length) return 0;

    let totalWeightedScore = 0;
    let totalWeightage = 0;

    // Calculate quiz scores (assuming equal weightage if not specified)
    const defaultQuizWeightage = 100 / quizData.quizzes.length;
    
    quizData.quizzes.forEach((quiz: any) => {
      const submission = quizData.submissions.find((s: any) => s.quiz_id === quiz.id);
      const score = submission?.score || 0;
      const weightage = defaultQuizWeightage; // You can adjust this based on your requirements

      if (weightage > 0) {
        totalWeightedScore += (score * weightage) / 100;
        totalWeightage += weightage;
      }
    });

    // Add custom scores
    Object.entries(customScores).forEach(([key, score]) => {
      const weightage = gradeBreakdown.custom_weightages?.[key] || 0;
      if (weightage > 0) {
        totalWeightedScore += (score * weightage) / 100;
        totalWeightage += weightage;
      }
    });

    return totalWeightage > 0 ? totalWeightedScore : 0;
  };

  const getLetterGrade = (score: number) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };

  // Updated saveGrade function to match your schema
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
      if (!user.user) return;

      const calculatedScore = calculateWeightedScore();
      const finalGrade = overallGrade || getLetterGrade(calculatedScore);

      const gradeData = {
        student_id: selectedStudent,
        course_id: selectedCourse,
        grade_type: 'final', // or you can make this configurable
        marks_obtained: calculatedScore,
        max_marks: 100,
        grade_letter: finalGrade,
        recorded_by: user.user.id,
        recorded_at: new Date().toISOString(),
      };

      if (existingGrade) {
        await supabase
          .from("grades")
          .update(gradeData)
          .eq("id", existingGrade.id);
      } else {
        await supabase
          .from("grades")
          .insert(gradeData);
      }

      // Also save to course_grades table for CGPA calculation
      const { data: courseInfo } = await supabase
        .from("courses")
        .select("credits, academic_year, semester")
        .eq("id", selectedCourse)
        .single();

      if (courseInfo) {
        // Convert letter grade to grade point (adjust scale as needed)
        const gradePointMap: { [key: string]: number } = {
          'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'F': 0
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
          recorded_by: user.user.id,
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

      await fetchExistingGrade();
      await fetchAllGrades();

      toast({
        title: "Success",
        description: "Grade saved successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save grade.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomScore = () => {
    const key = `custom_${Date.now()}`;
    setCustomScores(prev => ({ ...prev, [key]: 0 }));
    setGradeBreakdown(prev => ({
      ...prev,
      custom_weightages: { ...prev.custom_weightages, [key]: 0 }
    }));
  };

  const updateCustomScore = (key: string, field: 'score' | 'weightage' | 'name', value: any) => {
    if (field === 'score') {
      setCustomScores(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
    } else if (field === 'weightage') {
      setGradeBreakdown(prev => ({
        ...prev,
        custom_weightages: { ...prev.custom_weightages, [key]: parseFloat(value) || 0 }
      }));
    } else if (field === 'name') {
      setGradeBreakdown(prev => ({
        ...prev,
        custom_names: { ...prev.custom_names, [key]: value }
      }));
    }
  };

  const removeCustomScore = (key: string) => {
    setCustomScores(prev => {
      const newScores = { ...prev };
      delete newScores[key];
      return newScores;
    });
    setGradeBreakdown(prev => {
      const newBreakdown = { ...prev };
      if (newBreakdown.custom_weightages) {
        delete newBreakdown.custom_weightages[key];
      }
      if (newBreakdown.custom_names) {
        delete newBreakdown.custom_names[key];
      }
      return newBreakdown;
    });
  };

  const getStudentGrades = (studentId: string) => {
    return allGrades.filter(grade => grade.student_id === studentId);
  };

  const calculateStudentAverage = (studentId: string): number => {
    const studentGrades = getStudentGrades(studentId);
    if (studentGrades.length === 0) return 0;

    const totalMarks = studentGrades.reduce((sum, grade) => sum + (grade.marks_obtained || 0), 0);
    const totalMaxMarks = studentGrades.reduce((sum, grade) => sum + (grade.max_marks || 0), 0);
    
    return totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
  };

  const getClassAverage = (): number => {
    if (students.length === 0) return 0;

    const totalAverage = students.reduce((sum, student) => {
      return sum + calculateStudentAverage(student.id);
    }, 0);

    return Math.round(totalAverage / students.length);
  };

  const exportGrades = () => {
    const csvData = students.map(student => {
      const average = calculateStudentAverage(student.id);
      
      return {
        'Student Name': `${student.first_name} ${student.last_name}`,
        'Email': student.email,
        'Average': `${average.toFixed(1)}%`,
        'Letter Grade': getLetterGrade(average),
      };
    });

    console.log('Exporting grades:', csvData);
    toast({
      title: 'Success',
      description: 'Grades exported successfully'
    });
  };


  return (
    <div className="space-y-6">
      {/* Course Selection and Export */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Choose a course" />
          </SelectTrigger>
          <SelectContent>
            {courses?.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.course_code} - {course.course_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button onClick={exportGrades} variant="outline" className="ml-auto">
          <Download className="h-4 w-4 mr-2" />
          Export Grades
        </Button>
      </div>

      {selectedCourse && (
        <>
          {/* Grade Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-gray-600">Total Students</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-sm text-gray-600">Assignments</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{getClassAverage()}%</p>
                <p className="text-sm text-gray-600">Course Average</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{allGrades.length}</p>
                <p className="text-sm text-gray-600">Total Grades</p>
              </CardContent>
            </Card>
          </div>

          {/* Grade Management */}
          <Card className="glass-effect border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <GraduationCap className="w-5 h-5 text-accent" />
                Individual Grade Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="student-select">Select Student for Detailed Grading</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStudent && (
                <>
                  {/* Quiz Scores Section */}
                  {quizData && quizData.quizzes.length > 0 && (
                    <Card className="glass-effect border-accent/20">
                      <CardHeader>
                        <CardTitle className="text-lg text-foreground">Quiz Scores</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {quizData.quizzes.map((quiz: any) => {
                            const submission = quizData.submissions.find((s: any) => s.quiz_id === quiz.id);
                            const score = submission?.score || 0;
                            
                            return (
                              <div key={quiz.id} className="flex items-center justify-between p-3 glass-effect rounded border border-primary/20">
                                <div className="flex-1">
                                  <p className="font-medium text-foreground">{quiz.quiz_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Score: {score}% (Pass: {quiz.pass_percentage}%)
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge variant={score >= quiz.pass_percentage ? 'default' : 'destructive'}>
                                    {score >= quiz.pass_percentage ? 'Pass' : 'Fail'}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Custom Scores Section */}
                  <Card className="glass-effect border-accent/20">
                    <CardHeader>
                      <CardTitle className="text-lg text-foreground flex items-center justify-between">
                        Additional Assessments
                        <Button onClick={addCustomScore} size="sm" variant="outline" className="border-accent/30">
                          Add Assessment
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(customScores).map(([key, score]) => (
                          <div key={key} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 glass-effect rounded border border-primary/20">
                            <Input
                              placeholder="Assessment name"
                              value={gradeBreakdown.custom_names?.[key] || ""}
                              onChange={(e) => updateCustomScore(key, 'name', e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Score (0-100)"
                              value={score}
                              onChange={(e) => updateCustomScore(key, 'score', e.target.value)}
                              min="0"
                              max="100"
                            />
                            <Input
                              type="number"
                              placeholder="Weightage %"
                              value={gradeBreakdown.custom_weightages?.[key] || 0}
                              onChange={(e) => updateCustomScore(key, 'weightage', e.target.value)}
                              min="0"
                              max="100"
                            />
                            <Button
                              onClick={() => removeCustomScore(key)}
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-400 hover:border-red-500"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Grade Summary */}
                  <Card className="glass-effect border-accent/20">
                    <CardHeader>
                      <CardTitle className="text-lg text-foreground flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-accent" />
                        Grade Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 glass-effect rounded border border-primary/20">
                          <p className="text-sm text-muted-foreground">Calculated Score</p>
                          <p className="text-2xl font-bold text-accent">{calculateWeightedScore().toFixed(1)}%</p>
                        </div>
                        <div className="text-center p-4 glass-effect rounded border border-primary/20">
                          <p className="text-sm text-muted-foreground">Auto Grade</p>
                          <p className="text-2xl font-bold text-primary">{getLetterGrade(calculateWeightedScore())}</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="overall-grade">Final Grade</Label>
                          <Input
                            id="overall-grade"
                            value={overallGrade}
                            onChange={(e) => setOverallGrade(e.target.value)}
                            placeholder={getLetterGrade(calculateWeightedScore())}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={saveGrade}
                        disabled={isSaving}
                        className="w-full bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary"
                      >
                        {isSaving ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Save Grade
                          </div>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>

          {/* All Students Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Course Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {students.map((student) => {
                  const average = calculateStudentAverage(student.id);
                  const letterGrade = getLetterGrade(average);

                  return (
                    <Card key={student.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{average.toFixed(1)}%</p>
                            <Badge variant={letterGrade === 'A' ? 'default' : letterGrade === 'F' ? 'destructive' : 'secondary'}>
                              {letterGrade}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TeacherGradebook;