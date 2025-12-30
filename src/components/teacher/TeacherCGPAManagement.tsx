import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, Save, GraduationCap, Award, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const TeacherCGPAManagement = ({ teacherData }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [students, setStudents] = useState([]);
  const [gradeScale, setGradeScale] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [gradeData, setGradeData] = useState({
    percentage: 0,
    grade_letter: '',
    grade_point: 0,
    academic_year: new Date().getFullYear().toString(),
    semester: 'Fall'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [existingGrade, setExistingGrade] = useState(null);

  useEffect(() => {
    fetchCourses();
    fetchGradeScale();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudents();
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedCourse && selectedStudent) {
      fetchExistingCourseGrade();
    }
  }, [selectedCourse, selectedStudent, gradeData.academic_year, gradeData.semester]);

  const fetchCourses = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("instructor_id", user.user.id)
        .eq("is_active", true);
      
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchGradeScale = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("college_id")
        .eq("id", user.user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from("grade_scales")
        .select("*")
        .eq("college_id", profile.college_id)
        .eq("is_active", true)
        .order("min_percentage", { ascending: false });

      setGradeScale(data || []);
    } catch (error) {
      console.error('Error fetching grade scale:', error);
    }
  };

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

      if (!enrollments) return;

      const studentProfiles = enrollments
        .map((e) => e.user_profiles)
        .filter(Boolean);
      setStudents(studentProfiles);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchExistingCourseGrade = async () => {
    if (!selectedCourse || !selectedStudent) return;

    try {
      const { data } = await supabase
        .from("course_grades")
        .select("*")
        .eq("course_id", selectedCourse)
        .eq("student_id", selectedStudent)
        .eq("academic_year", gradeData.academic_year)
        .eq("semester", gradeData.semester)
        .maybeSingle();

      if (data) {
        setExistingGrade(data);
        setGradeData({
          percentage: data.percentage,
          grade_letter: data.grade_letter,
          grade_point: data.grade_point,
          academic_year: data.academic_year,
          semester: data.semester
        });
      } else {
        setExistingGrade(null);
      }
    } catch (error) {
      console.error('Error fetching existing grade:', error);
    }
  };

  const calculateGradeFromPercentage = (percentage) => {
    const percentageNum = parseFloat(percentage) || 0;
    const grade = gradeScale.find(
      (g) => percentageNum >= g.min_percentage && percentageNum <= g.max_percentage
    );
    
    // Always update percentage, only update grade if found
    if (grade) {
      setGradeData(prev => ({
        ...prev,
        percentage: percentageNum,
        grade_letter: grade.grade_letter,
        grade_point: grade.grade_point
      }));
    } else {
      // Update only percentage, clear grade if no match
      setGradeData(prev => ({
        ...prev,
        percentage: percentageNum,
        grade_letter: '',
        grade_point: 0
      }));
    }
  };

  const saveCourseGrade = async () => {
    if (!selectedCourse || !selectedStudent) {
      toast({
        title: "Error",
        description: "Please select a course and student.",
        variant: "destructive",
      });
      return;
    }

    if (gradeData.percentage < 0 || gradeData.percentage > 100) {
      toast({
        title: "Error",
        description: "Percentage must be between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const selectedCourseData = courses.find(c => c.id === selectedCourse);
      const isPassed = gradeData.grade_point >= 4; // Assuming 4 is passing grade

      const courseGradeData = {
        student_id: selectedStudent,
        course_id: selectedCourse,
        academic_year: gradeData.academic_year,
        semester: gradeData.semester,
        total_marks: gradeData.percentage,
        max_marks: 100,
        percentage: gradeData.percentage,
        grade_letter: gradeData.grade_letter,
        grade_point: gradeData.grade_point,
        credits: selectedCourseData?.credits || 0,
        is_completed: true,
        is_passed: isPassed,
        recorded_by: user.user.id,
        recorded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Use upsert with the unique constraint
      const { error } = await supabase
        .from("course_grades")
        .upsert(courseGradeData, {
          onConflict: 'student_id,course_id,academic_year,semester',
          ignoreDuplicates: false
        })
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course grade saved successfully! CGPA will be updated automatically.",
      });

      await fetchExistingCourseGrade();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save grade.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fetchAutoCalculatedGrade = async () => {
    if (!selectedCourse || !selectedStudent) return;

    try {
      const { data, error } = await supabase.rpc('calculate_course_marks', {
        p_student_id: selectedStudent,
        p_course_id: selectedCourse
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const marks = data[0];
        calculateGradeFromPercentage(marks.percentage);
        
        toast({
          title: "Auto-calculated Grade",
          description: `Based on quizzes and assessments: ${marks.percentage.toFixed(2)}%`,
        });
      } else {
        toast({
          title: "No Assessment Data",
          description: "No quizzes or assessments found for this student in this course.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching auto-calculated grade:', error);
      toast({
        title: "Error",
        description: "Failed to calculate grade from assessments.",
        variant: "destructive",
      });
    }
  };

  const getGradeColor = (gradePoint) => {
    if (gradePoint >= 9) return 'text-green-500';
    if (gradePoint >= 8) return 'text-blue-500';
    if (gradePoint >= 7) return 'text-yellow-500';
    if (gradePoint >= 6) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Course and Student Selection */}
      <Card className="glass-effect border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <GraduationCap className="w-5 h-5 text-accent" />
            CGPA Grade Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course-select">Select Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.course_code} - {course.course_name} ({course.credits} credits)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-select">Select Student</Label>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="academic-year">Academic Year</Label>
              <Input
                id="academic-year"
                type="text"
                value={gradeData.academic_year}
                onChange={(e) => setGradeData(prev => ({ ...prev, academic_year: e.target.value }))}
                placeholder="2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Select 
                value={gradeData.semester} 
                onValueChange={(value) => setGradeData(prev => ({ ...prev, semester: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fall">Fall</SelectItem>
                  <SelectItem value="Spring">Spring</SelectItem>
                  <SelectItem value="Summer">Summer</SelectItem>
                  <SelectItem value="Winter">Winter</SelectItem>
                  <SelectItem value="Semester 1">Semester 1</SelectItem>
                  <SelectItem value="Semester 2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Entry Section */}
      {selectedCourse && selectedStudent && (
        <>
          {existingGrade && (
            <Card className="glass-effect border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Existing Grade Found</p>
                    <p className="text-sm text-muted-foreground">
                      Current grade: <span className={`font-bold ${getGradeColor(existingGrade.grade_point)}`}>
                        {existingGrade.grade_letter}
                      </span> ({existingGrade.percentage}%) - Updating will recalculate CGPA
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-effect border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Calculator className="w-5 h-5 text-accent" />
                Grade Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Grade Scale Reference */}
              <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-accent" />
                  Grade Scale Reference
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {gradeScale.map((grade) => (
                    <div
                      key={grade.id}
                      className="p-2 bg-background rounded border text-center"
                    >
                      <p className={`text-lg font-bold ${getGradeColor(grade.grade_point)}`}>
                        {grade.grade_letter}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {grade.min_percentage}-{grade.max_percentage}%
                      </p>
                      <p className="text-xs text-accent font-medium">
                        GP: {grade.grade_point}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Percentage Input */}
              <div className="space-y-2">
                <Label htmlFor="percentage">Enter Percentage (0-100)</Label>
                <div className="flex gap-3">
                  <Input
                    id="percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={gradeData.percentage}
                    onChange={(e) => calculateGradeFromPercentage(e.target.value)}
                    placeholder="Enter marks percentage"
                    className="text-lg"
                  />
                  <Button
                    onClick={() => calculateGradeFromPercentage(gradeData.percentage)}
                    variant="outline"
                    className="border-accent/30"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate
                  </Button>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={fetchAutoCalculatedGrade}
                    variant="outline"
                    className="w-full border-accent/30"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Auto-Calculate from Assessments
                  </Button>
                </div>
              </div>

              {/* Calculated Grade Display */}
              {gradeData.grade_letter && (
                <Card className="glass-effect border-l-4 border-l-accent">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Grade Letter</p>
                        <p className={`text-4xl font-bold ${getGradeColor(gradeData.grade_point)}`}>
                          {gradeData.grade_letter}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Grade Point</p>
                        <p className={`text-4xl font-bold ${getGradeColor(gradeData.grade_point)}`}>
                          {gradeData.grade_point}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Percentage</p>
                        <p className={`text-4xl font-bold ${getGradeColor(gradeData.grade_point)}`}>
                          {gradeData.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {gradeData.grade_point < 4 && (
                      <div className="mt-4 p-3 bg-red-500/10 rounded border border-red-500/30">
                        <p className="text-sm text-red-600 font-medium">
                          ⚠️ This is a failing grade (below passing threshold)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Save Button */}
              <Button
                onClick={saveCourseGrade}
                disabled={isSaving || !gradeData.grade_letter}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary"
                size="lg"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving Grade...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {existingGrade ? 'Update Course Grade' : 'Save Course Grade'}
                  </div>
                )}
              </Button>

              <div className="p-3 bg-blue-500/10 rounded border border-blue-500/30">
                <p className="text-sm text-blue-600">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  The student's CGPA and SGPA will be automatically recalculated after saving this grade.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TeacherCGPAManagement;