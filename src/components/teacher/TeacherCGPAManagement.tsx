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
  const [students, setStudents] = useState([]);
  const [gradeScale, setGradeScale] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(undefined);
  const [gradeData, setGradeData] = useState({
    academic_year: "",
    semester: ""
  });
  const [studentCGPAData, setStudentCGPAData] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableSemesters, setAvailableSemesters] = useState([]);

  useEffect(() => {
    fetchStudents();
    fetchGradeScale();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchAvailableYearsAndSemesters();
      setGradeData({ academic_year: "", semester: "" });
      setStudentCGPAData(null);
    } else {
      setAvailableYears([]);
      setAvailableSemesters([]);
      setGradeData({ academic_year: "", semester: "" });
      setStudentCGPAData(null);
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (selectedStudent && gradeData.academic_year && gradeData.semester) {
      fetchStudentCGPA();
    } else {
      setStudentCGPAData(null);
    }
  }, [selectedStudent, gradeData.academic_year, gradeData.semester]);

  const fetchStudents = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("college_id")
        .eq("id", user.user.id)
        .single();

      if (!profile) return;

      // Get all courses from the same college
      const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .eq("college_id", profile.college_id);

      if (!courses || courses.length === 0) {
        console.log('No courses found for college');
        setStudents([]);
        return;
      }

      const courseIds = courses.map(c => c.id);

      // Get unique students enrolled in any course from this college
      const { data: enrollments, error } = await supabase
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
        .in("course_id", courseIds)
        .eq("status", "enrolled");

      if (error) {
        console.error('Error fetching students:', error);
        return;
      }

      if (!enrollments || enrollments.length === 0) {
        console.log('No enrollments found');
        setStudents([]);
        return;
      }

      // Get unique students
      const uniqueStudents = Array.from(
        new Map(
          enrollments
            .map((e: any) => e.user_profiles)
            .filter(Boolean)
            .map((student: any) => [student.id, student])
        ).values()
      );

      console.log('Fetched students:', uniqueStudents);
      setStudents(uniqueStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchAvailableYearsAndSemesters = async () => {
    if (!selectedStudent) return;

    try {
      const { data: grades, error } = await supabase
        .from("course_grades")
        .select("academic_year, semester")
        .eq("student_id", selectedStudent);

      if (error) {
        console.error('Error fetching years and semesters:', error);
        return;
      }

      if (!grades || grades.length === 0) {
        setAvailableYears([]);
        setAvailableSemesters([]);
        toast({
          title: "No Data",
          description: "This student has no grade records yet.",
          variant: "destructive",
        });
        return;
      }

      // Extract unique years
      const years = [...new Set(grades.map(g => g.academic_year))].sort();
      setAvailableYears(years);

      // Extract unique semesters
      const semesters = [...new Set(grades.map(g => g.semester))];
      setAvailableSemesters(semesters);

      console.log('Available years:', years);
      console.log('Available semesters:', semesters);
    } catch (error) {
      console.error('Error fetching years and semesters:', error);
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

  const fetchStudentCGPA = async () => {
    if (!selectedStudent || !gradeData.academic_year || !gradeData.semester) return;

    try {
      // Fetch course grades for the selected student, year, and semester
      const { data: courseGrades } = await supabase
        .from("course_grades")
        .select(`
          *,
          courses (
            course_code,
            course_name,
            credits
          )
        `)
        .eq("student_id", selectedStudent)
        .eq("academic_year", gradeData.academic_year)
        .eq("semester", gradeData.semester);

      if (!courseGrades || courseGrades.length === 0) {
        setStudentCGPAData(null);
        toast({
          title: "No Data",
          description: "No course grades found for the selected student, year, and semester.",
          variant: "destructive",
        });
        return;
      }

      // Calculate SGPA for this semester
      let totalCredits = 0;
      let totalGradePoints = 0;

      courseGrades.forEach(grade => {
        const credits = grade.credits || 0;
        totalCredits += credits;
        totalGradePoints += (grade.grade_point * credits);
      });

      const sgpa = totalCredits > 0 ? (totalGradePoints / totalCredits) : 0;

      // Fetch overall CGPA (across all semesters)
      const { data: allGrades } = await supabase
        .from("course_grades")
        .select("grade_point, credits")
        .eq("student_id", selectedStudent);

      let allTotalCredits = 0;
      let allTotalGradePoints = 0;

      if (allGrades) {
        allGrades.forEach(grade => {
          const credits = grade.credits || 0;
          allTotalCredits += credits;
          allTotalGradePoints += (grade.grade_point * credits);
        });
      }

      const cgpa = allTotalCredits > 0 ? (allTotalGradePoints / allTotalCredits) : 0;

      setStudentCGPAData({
        courseGrades,
        sgpa: sgpa.toFixed(2),
        cgpa: cgpa.toFixed(2),
        totalCredits,
        allTotalCredits
      });

    } catch (error) {
      console.error('Error fetching student CGPA:', error);
      toast({
        title: "Error",
        description: "Failed to fetch student CGPA data.",
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
      {/* Student, Year, and Semester Selection */}
      <Card className="glass-effect border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <GraduationCap className="w-5 h-5 text-accent" />
            CGPA Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="academic-year">Academic Year</Label>
              <Select 
                value={gradeData.academic_year} 
                onValueChange={(value) => setGradeData(prev => ({ ...prev, academic_year: value }))}
                disabled={!selectedStudent || availableYears.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedStudent ? (availableYears.length === 0 ? "No data available" : "Select year") : "Select student first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Select 
                value={gradeData.semester} 
                onValueChange={(value) => setGradeData(prev => ({ ...prev, semester: value }))}
                disabled={!selectedStudent || availableSemesters.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedStudent ? (availableSemesters.length === 0 ? "No data available" : "Select semester") : "Select student first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSemesters.map((semester) => (
                    <SelectItem key={semester} value={semester}>
                      {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CGPA Display Section */}
      {selectedStudent && studentCGPAData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SGPA Card */}
            <Card className="glass-effect border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Calculator className="w-5 h-5 text-accent" />
                  Semester GPA (SGPA)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-6xl font-bold text-primary mb-2">
                    {studentCGPAData.sgpa}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {gradeData.semester} {gradeData.academic_year}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total Credits: {studentCGPAData.totalCredits}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* CGPA Card */}
            <Card className="glass-effect border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  Cumulative GPA (CGPA)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-6xl font-bold text-primary mb-2">
                    {studentCGPAData.cgpa}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Overall Performance
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total Credits: {studentCGPAData.allTotalCredits}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Grades Table */}
          <Card className="glass-effect border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Award className="w-5 h-5 text-accent" />
                Course Grades for {gradeData.semester} {gradeData.academic_year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-primary/20">
                      <th className="text-left p-3 text-muted-foreground">Course Code</th>
                      <th className="text-left p-3 text-muted-foreground">Course Name</th>
                      <th className="text-center p-3 text-muted-foreground">Credits</th>
                      <th className="text-center p-3 text-muted-foreground">Grade</th>
                      <th className="text-center p-3 text-muted-foreground">Grade Point</th>
                      <th className="text-center p-3 text-muted-foreground">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentCGPAData.courseGrades.map((grade, index) => (
                      <tr key={index} className="border-b border-primary/10">
                        <td className="p-3 font-mono">{grade.courses?.course_code || 'N/A'}</td>
                        <td className="p-3">{grade.courses?.course_name || 'N/A'}</td>
                        <td className="p-3 text-center">{grade.credits || 0}</td>
                        <td className="p-3 text-center">
                          <Badge className={getGradeColor(grade.grade_point)}>
                            {grade.grade_letter}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-bold">{grade.grade_point}</td>
                        <td className="p-3 text-center">{grade.percentage?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Grade Scale Reference */}
          <Card className="glass-effect border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Award className="w-5 h-5 text-accent" />
                Grade Scale Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {gradeScale.map((grade) => (
                  <div
                    key={grade.id}
                    className="p-3 bg-background rounded border text-center"
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
            </CardContent>
          </Card>
        </>
      )}

      {!studentCGPAData && (
        <Card className="glass-effect border-primary/20">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {selectedStudent 
                ? "Select academic year and semester to view CGPA data."
                : "Select a student, year, and semester to view CGPA data."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherCGPAManagement;