import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Award, BookOpen, Calculator, Target, GraduationCap, BarChart3, Users, Medal, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const StudentCGPADashboard = () => {
  const [academicRecords, setAcademicRecords] = useState([]);
  const [courseGrades, setCourseGrades] = useState([]);
  const [currentCGPA, setCurrentCGPA] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [comparativeStats, setComparativeStats] = useState(null);
  const [courseComparisons, setCourseComparisons] = useState([]);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch academic records
      const { data: records } = await supabase
        .from("student_academic_records")
        .select("*")
        .eq("student_id", user.user.id)
        .order("academic_year", { ascending: false })
        .order("semester", { ascending: false });

      setAcademicRecords(records || []);

      // Calculate current CGPA
      if (records && records.length > 0) {
        setCurrentCGPA(records[0].cgpa || 0);
        setTotalCredits(records[0].total_credits || 0);
      }

      // Fetch course grades
      const { data: grades } = await supabase
        .from("course_grades")
        .select(`
          *,
          courses (
            course_name,
            course_code,
            credits,
            mean_marks,
            standard_deviation,
            number_of_students
          )
        `)
        .eq("student_id", user.user.id)
        .eq("is_completed", true)
        .order("academic_year", { ascending: false })
        .order("semester", { ascending: false });

      setCourseGrades(grades || []);

      // Fetch comparative statistics
      await fetchComparativeStats(user.user.id, records);
      await fetchCourseComparisons(user.user.id, grades);

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparativeStats = async (studentId, records) => {
    if (!records || records.length === 0) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("college_id")
        .eq("id", user.user.id)
        .single();

      if (!profile) return;

      // Get all students' CGPAs from the same college and latest semester
      const latestRecord = records[0];
      const { data: allRecords } = await supabase
        .from("student_academic_records")
        .select("student_id, cgpa")
        .eq("academic_year", latestRecord.academic_year)
        .eq("semester", latestRecord.semester)
        .not("cgpa", "is", null);

      if (!allRecords || allRecords.length === 0) return;

      const cgpas = allRecords.map(r => r.cgpa).sort((a, b) => b - a);
      const studentCGPA = latestRecord.cgpa;
      const totalStudents = cgpas.length;
      const rank = cgpas.findIndex(c => c === studentCGPA) + 1;
      const percentile = ((totalStudents - rank + 1) / totalStudents) * 100;

      // Calculate statistics
      const sum = cgpas.reduce((a, b) => a + b, 0);
      const mean = sum / totalStudents;
      const variance = cgpas.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / totalStudents;
      const stdDev = Math.sqrt(variance);

      // Calculate z-score
      const zScore = stdDev !== 0 ? (studentCGPA - mean) / stdDev : 0;

      setComparativeStats({
        rank,
        totalStudents,
        percentile,
        classMean: mean,
        classMedian: cgpas[Math.floor(totalStudents / 2)],
        stdDev,
        zScore,
        topPercentage: (rank / totalStudents) * 100,
        studentsAbove: rank - 1,
        studentsBelow: totalStudents - rank
      });
    } catch (error) {
      console.error('Error fetching comparative stats:', error);
    }
  };

  const fetchCourseComparisons = async (studentId, grades) => {
    if (!grades || grades.length === 0) return;

    const comparisons = grades.map(grade => {
      const course = grade.courses;
      if (!course || !course.mean_marks || !course.standard_deviation) {
        return null;
      }

      const studentPercentage = grade.percentage;
      const classMean = course.mean_marks;
      const stdDev = course.standard_deviation;
      
      // Calculate z-score
      const zScore = stdDev !== 0 ? (studentPercentage - classMean) / stdDev : 0;
      
      // Determine performance level
      let performanceLevel;
      let performanceColor;
      if (zScore >= 2) {
        performanceLevel = "Exceptional";
        performanceColor = "text-purple-500";
      } else if (zScore >= 1) {
        performanceLevel = "Above Average";
        performanceColor = "text-green-500";
      } else if (zScore >= -0.5) {
        performanceLevel = "Average";
        performanceColor = "text-blue-500";
      } else if (zScore >= -1.5) {
        performanceLevel = "Below Average";
        performanceColor = "text-yellow-500";
      } else {
        performanceLevel = "Needs Improvement";
        performanceColor = "text-red-500";
      }

      return {
        ...grade,
        classMean,
        stdDev,
        zScore,
        performanceLevel,
        performanceColor,
        deviationFromMean: studentPercentage - classMean,
        totalStudents: course.number_of_students || 0
      };
    }).filter(Boolean);

    setCourseComparisons(comparisons);
  };

  const getGradeColor = (gradePoint) => {
    if (gradePoint >= 9) return 'text-green-500';
    if (gradePoint >= 8) return 'text-blue-500';
    if (gradePoint >= 7) return 'text-yellow-500';
    if (gradePoint >= 6) return 'text-orange-500';
    return 'text-red-500';
  };

  const getCGPAStatus = (cgpa) => {
    if (cgpa >= 9) return { text: 'Outstanding', color: 'bg-green-500' };
    if (cgpa >= 8) return { text: 'Excellent', color: 'bg-blue-500' };
    if (cgpa >= 7) return { text: 'Very Good', color: 'bg-yellow-500' };
    if (cgpa >= 6) return { text: 'Good', color: 'bg-orange-500' };
    return { text: 'Pass', color: 'bg-red-500' };
  };

  const getPerformanceIcon = (deviation) => {
    if (deviation > 5) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (deviation < -5) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const groupBySemester = () => {
    const grouped = {};
    courseGrades.forEach(grade => {
      const key = `${grade.academic_year}-${grade.semester}`;
      if (!grouped[key]) {
        grouped[key] = {
          academic_year: grade.academic_year,
          semester: grade.semester,
          courses: [],
          sgpa: academicRecords.find(r => 
            r.academic_year === grade.academic_year && r.semester === grade.semester
          )?.sgpa || 0
        };
      }
      grouped[key].courses.push(grade);
    });
    return Object.values(grouped);
  };

  if (loading) {
    return (
      <Card className="card-minimal">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading academic records...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = getCGPAStatus(currentCGPA);
  const semesterData = groupBySemester();

  return (
    <div className="space-y-6">
      {/* CGPA Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-effect border-primary/20">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <p className="text-4xl font-bold text-primary mb-1">
              {currentCGPA.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mb-2">Cumulative GPA</p>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
              {status.text}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-primary/20">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-8 h-8" />
            </div>
            <p className="text-4xl font-bold mb-1">{totalCredits}</p>
            <p className="text-sm text-muted-foreground">Total Credits</p>
            <p className="text-xs mt-1">
              {academicRecords[0]?.completed_credits || 0} Earned
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-primary/20">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-3">
              <Target className="w-8 h-8" />
            </div>
            <p className="text-4xl font-bold mb-1">
              {semesterData.length}
            </p>
            <p className="text-sm text-muted-foreground">Semesters</p>
            <p className="text-xs mt-1">
              {courseGrades.length} Courses Completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comparative Analytics */}
      {comparativeStats && (
        <Card className="glass-effect border-primary/20 bg-gradient-to-br from-accent/5 to-primary/5">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              Your Performance vs Peers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Rank */}
              <div className="text-center p-4">
                <Medal className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">#{comparativeStats.rank}</p>
                <p className="text-sm text-muted-foreground">Class Rank</p>
                <p className="text-xs mt-1">
                  out of {comparativeStats.totalStudents} students
                </p>
              </div>

              {/* Percentile */}
              <div className="text-center p-4">
                <Trophy className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">
                  {comparativeStats.percentile.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Percentile</p>
                <p className="text-xs mt-1">
                  Top {comparativeStats.topPercentage.toFixed(1)}%
                </p>
              </div>

              {/* Class Average */}
              <div className="text-center p-4">
                <BarChart3 className="w-8 h-8  mx-auto mb-2" />
                <p className="text-3xl font-bold">
                  {comparativeStats.classMean.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Class Average</p>
                <p className="text-xs mt-1">
                  You: {currentCGPA > comparativeStats.classMean ? '+' : ''}{(currentCGPA - comparativeStats.classMean).toFixed(2)}
                </p>
              </div>

              {/* Z-Score */}
              <div className="text-center p-4">
                <Calculator className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">
                  {comparativeStats.zScore.toFixed(2)}σ
                </p>
                <p className="text-sm text-muted-foreground">Standard Score</p>
                <p className="text-xs mt-1">
                  {comparativeStats.zScore > 0 ? 'Above' : 'Below'} mean
                </p>
              </div>
            </div>

            {/* Performance Breakdown */}
            <div className="mt-6 p-4 bg-accent/5 rounded-lg border border-accent/20">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                Statistical Breakdown
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Students Above</p>
                  <p className="font-bold text-foreground">{comparativeStats.studentsAbove}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Students Below</p>
                  <p className="font-bold text-foreground">{comparativeStats.studentsBelow}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Class Median</p>
                  <p className="font-bold text-foreground">{comparativeStats.classMedian.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Std Deviation</p>
                  <p className="font-bold text-foreground">{comparativeStats.stdDev.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course-wise Performance Comparison */}
      {courseComparisons.length > 0 && (
        <Card className="glass-effect border-primary/20">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Award className="w-5 h-5" />
              Course-wise Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {courseComparisons.map((course, idx) => (
                <Card key={idx} className="glass-effect border-l-4 border-l-accent">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          {course.courses.course_name}
                          {getPerformanceIcon(course.deviationFromMean)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {course.courses.course_code} • {course.totalStudents} students
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${course.performanceColor}`}>
                          {course.performanceLevel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Z-Score: {course.zScore.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="text-center p-3 bg-accent/5 rounded border border-primary/10">
                        <p className="text-xs text-muted-foreground mb-1">Your Score</p>
                        <p className={`text-2xl font-bold ${getGradeColor(course.grade_point)}`}>
                          {course.percentage.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-3 bg-accent/5 rounded border border-primary/10">
                        <p className="text-xs text-muted-foreground mb-1">Class Avg</p>
                        <p className="text-2xl font-bold text-blue-500">
                          {course.classMean.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-3 bg-accent/5 rounded border border-primary/10">
                        <p className="text-xs text-muted-foreground mb-1">Difference</p>
                        <p className={`text-2xl font-bold ${course.deviationFromMean > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {course.deviationFromMean > 0 ? '+' : ''}{course.deviationFromMean.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-3 bg-accent/5 rounded border border-primary/10">
                        <p className="text-xs text-muted-foreground mb-1">Grade</p>
                        <p className={`text-2xl font-bold ${getGradeColor(course.grade_point)}`}>
                          {course.grade_letter}
                        </p>
                      </div>
                    </div>

                    {/* Visual distribution indicator */}
                    <div className="mt-4 p-3 bg-gradient-to-r from-red-500/10 via-yellow-500/10 via-green-500/10 to-blue-500/10 rounded relative h-12">
                      <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-between px-2 text-xs text-muted-foreground">
                        <span>Below Avg</span>
                        <span>Average</span>
                        <span>Above Avg</span>
                      </div>
                      {/* Student position marker */}
                      <div 
                        className="absolute top-1 h-10 w-1 bg-primary rounded-full"
                        style={{ 
                          left: `${Math.max(0, Math.min(100, 50 + (course.zScore * 15)))}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-bold text-primary">
                          You
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Semester-wise Performance */}
      <Card className="glass-effect border-primary/20">
        <CardHeader className="border-b border-primary/20">
          <CardTitle className="flex items-center gap-2 text-primary">
            <BarChart3 className="w-5 h-5" />
            Semester-wise Academic Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {semesterData.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No academic records available yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {semesterData.map((semester, idx) => (
                <Card key={idx} className="glass-effect border-l-4 border-l-accent">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">
                          {semester.academic_year} - {semester.semester}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {semester.courses.length} courses
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">SGPA</p>
                        <p className={`text-3xl font-bold ${getGradeColor(semester.sgpa)}`}>
                          {semester.sgpa.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {semester.courses.map((course, cidx) => (
                        <div
                          key={cidx}
                          className="flex justify-between items-center p-3 bg-accent/5 rounded border border-primary/10"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {course.courses.course_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {course.courses.course_code} • {course.courses.credits} Credits
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className={`text-2xl font-bold ${getGradeColor(course.grade_point)}`}>
                                  {course.grade_letter}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {course.percentage.toFixed(1)}%
                                </p>
                              </div>
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getGradeColor(course.grade_point)} bg-current/10`}>
                                <span className={`text-lg font-bold ${getGradeColor(course.grade_point)}`}>
                                  {course.grade_point}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-primary/20">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Semester Credits:</span>
                        <span className="font-medium text-foreground">
                          {semester.courses.reduce((sum, c) => sum + (c.courses.credits || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CGPA Trend */}
      {academicRecords.length > 1 && (
        <Card className="glass-effect border-primary/20">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="flex items-center gap-2 text-primary">
              <TrendingUp className="w-5 h-5" />
              CGPA Progression
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              {[...academicRecords].reverse().map((record, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-muted-foreground">
                    {record.academic_year} {record.semester}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-accent/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent flex items-center justify-end px-2"
                        style={{ width: `${(record.cgpa / 10) * 100}%` }}
                      >
                        <span className="text-xs font-bold text-white">
                          {record.cgpa.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentCGPADashboard;