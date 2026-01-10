import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, FileText, Video, Download, ExternalLink, Clock, Award, TrendingUp, Trophy, Calculator, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PermissionWrapper from '@/components/PermissionWrapper';

// Import jsPDF for PDF conversion
import { jsPDF } from 'jspdf';

interface CoursesLearningSnapshotProps {
  studentData: any;
}

const CoursesLearningSnapshot: React.FC<CoursesLearningSnapshotProps> = ({ studentData }) => {
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseMaterials, setCourseMaterials] = useState<any[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<any[]>([]);
  const [courseGrades, setCourseGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  
  // StudentGrades state
  const [grades, setGrades] = useState<any[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<any[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  
  const { toast } = useToast();

  // PDF Conversion Functions
  const convertImageToPDF = async (blob: Blob, fileName: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const pdf = new jsPDF({
              orientation: img.width > img.height ? 'landscape' : 'portrait',
              unit: 'px',
              format: [img.width, img.height]
            });
            
            pdf.addImage(e.target?.result as string, 'JPEG', 0, 0, img.width, img.height);
            pdf.setProperties({
              title: fileName,
              subject: 'Course Material',
              author: 'Learning Management System',
            });
            
            const pdfBlob = pdf.output('blob');
            resolve(pdfBlob);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const convertTextToPDF = async (blob: Blob, fileName: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const pdf = new jsPDF();
          
          // Add title
          pdf.setFontSize(16);
          pdf.setFont(undefined, 'bold');
          pdf.text(fileName, 20, 20);
          
          // Add content
          pdf.setFontSize(11);
          pdf.setFont(undefined, 'normal');
          
          const lines = pdf.splitTextToSize(text, 170);
          let yPosition = 35;
          const lineHeight = 7;
          const pageHeight = pdf.internal.pageSize.height;
          
          lines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = 20;
            }
            pdf.text(line, 20, yPosition);
            yPosition += lineHeight;
          });
          
          pdf.setProperties({
            title: fileName,
            subject: 'Course Material',
            author: 'Learning Management System',
          });
          
          const pdfBlob = pdf.output('blob');
          resolve(pdfBlob);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  };

  const createInfoPDF = (fileName: string, fileType: string): Blob => {
    const pdf = new jsPDF();
    
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('Course Material Information', 20, 20);
    
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    pdf.text(`File Name: ${fileName}`, 20, 40);
    pdf.text(`File Type: ${fileType || 'Document'}`, 20, 50);
    pdf.text(`Course: ${selectedCourse?.course_name || 'N/A'}`, 20, 60);
    
    pdf.setFontSize(10);
    pdf.text('Note: This material has been packaged as a PDF for your convenience.', 20, 80);
    pdf.text('For the original file format, please access it through the course portal.', 20, 90);
    
    pdf.setProperties({
      title: `Info - ${fileName}`,
      subject: 'Course Material Information',
      author: 'Learning Management System',
    });
    
    return pdf.output('blob');
  };

  const convertToPDF = async (blob: Blob, fileName: string, fileType: string): Promise<Blob> => {
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    // If already a PDF, return as is
    if (fileExtension === 'pdf') {
      return blob;
    }
    
    // Handle images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension || '')) {
      return await convertImageToPDF(blob, fileName);
    }
    
    // Handle text files
    if (['txt', 'md', 'csv'].includes(fileExtension || '')) {
      return await convertTextToPDF(blob, fileName);
    }
    
    // For other formats (videos, presentations, etc.), create info PDF
    return createInfoPDF(fileName, fileType);
  };

  // StudentGrades data fetching functions
  const fetchGrades = async () => {
    setGradesLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setGrades([]);
        return;
      }

      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", user.user.id)
        .order("recorded_at", { ascending: false });

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        setGrades([]);
        return;
      }

      if (!gradesData || gradesData.length === 0) {
        setGrades([]);
        return;
      }

      const classIds = gradesData.map(g => g.class_id).filter(Boolean);
      
      if (classIds.length === 0) {
        setGrades(gradesData.map(grade => ({ ...grade, class_name: 'Unknown Class' })));
        return;
      }

      const { data: classesData } = await supabase
        .from("classes")
        .select("id, name")
        .in("id", classIds);

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

      const { data: submissions, error: submissionsError } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("student_id", user.user.id)
        .not("score", "is", null)
        .order("submitted_at", { ascending: false });

      if (submissionsError) {
        console.error('Error fetching quiz submissions:', submissionsError);
        setQuizSubmissions([]);
        return;
      }

      if (!submissions || submissions.length === 0) {
        setQuizSubmissions([]);
        return;
      }

      const quizIds = submissions.map(s => s.quiz_id).filter(Boolean);
      
      if (quizIds.length === 0) {
        setQuizSubmissions(submissions);
        return;
      }

      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("id, title, total_points, weightage, class_id")
        .in("id", quizIds);

      if (quizzesError) {
        console.error('Error fetching quizzes:', quizzesError);
        setQuizSubmissions(submissions);
        return;
      }

      const classIds = quizzesData?.map(q => q.class_id).filter(Boolean) || [];
      
      let classesData = [];
      if (classIds.length > 0) {
        const { data: classes } = await supabase
          .from("classes")
          .select("id, name")
          .in("id", classIds);
        classesData = classes || [];
      }

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

  const handleDownloadFile = async (material: any) => {
    if (!material.file_url) {
      toast({
        title: 'Error',
        description: 'File URL not available',
        variant: 'destructive',
      });
      return;
    }

    setDownloadingFile(material.id);
    
    try {
      const urlParts = material.file_url.split('/course-materials/');
      const filePath = urlParts[1];

      if (!filePath) {
        throw new Error('Invalid file path');
      }

      // Download the file from Supabase storage
      const { data, error } = await supabase.storage
        .from('course-materials')
        .download(filePath);

      if (error) {
        throw error;
      }

      // Convert to PDF
      toast({
        title: 'Converting to PDF',
        description: 'Please wait while we prepare your file...',
      });

      const pdfBlob = await convertToPDF(data, material.file_name || material.title, material.material_type);

      // Download the PDF
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create PDF filename
      const baseName = (material.title || material.file_name || 'material').replace(/\.[^/.]+$/, '');
      link.download = `${baseName}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'File downloaded as PDF successfully',
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    } finally {
      setDownloadingFile(null);
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

  const handleCourseClick = (course: any) => {
    setSelectedCourse(course.courses);
    setShowCourseDetails(true);
  };

  const handleBackToCourses = () => {
    setShowCourseDetails(false);
    setSelectedCourse(null);
  };

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
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 animate-fade-in-up overflow-x-hidden bg-black">
        <Card className="card-minimal glass-effect border-primary/20">
          <CardHeader className="border-b border-primary/20 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              Course Grades
              <Award className="w-4 h-4 text-accent ml-auto" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {!grades || grades.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm sm:text-base">No course grades available yet.</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">Grades will appear here once your educator assigns them.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {grades.map((grade) => (
                  <Card key={grade.id} className="glass-effect border-l-4 border-l-accent">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg text-foreground truncate">{grade.class_name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Last updated: {new Date(grade.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className={`text-2xl sm:text-3xl font-bold ${getGradeColor(grade.overall_grade)}`}>
                            {grade.overall_grade}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {grade.overall_score?.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {grade.grade_breakdown && typeof grade.grade_breakdown === 'object' && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm sm:text-base text-foreground flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-accent" />
                            Grade Breakdown
                          </h4>

                          {(grade.grade_breakdown as any)?.quiz_scores && Object.keys((grade.grade_breakdown as any).quiz_scores).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Quiz Scores:</p>
                              <div className="grid gap-2">
                                {Object.entries((grade.grade_breakdown as any).quiz_scores).map(([quizId, quizData]: [string, any]) => (
                                  <div key={quizId} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 bg-background/30 rounded border border-primary/20">
                                    <span className="text-xs sm:text-sm text-foreground truncate">{quizData.title}</span>
                                    <div className="text-right flex-shrink-0">
                                      <span className={`font-medium text-sm ${getScoreColor(quizData.percentage)}`}>
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

                          {(grade.grade_breakdown as any)?.custom_scores && Object.keys((grade.grade_breakdown as any).custom_scores).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Additional Assessments:</p>
                              <div className="grid gap-2">
                                {Object.entries((grade.grade_breakdown as any).custom_scores).map(([key, score]: [string, any]) => (
                                  <div key={key} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 bg-background/30 rounded border border-primary/20">
                                    <span className="text-xs sm:text-sm text-foreground truncate">
                                      {(grade.grade_breakdown as any).custom_names?.[key] || 'Assessment'}
                                    </span>
                                    <div className="text-right flex-shrink-0">
                                      <span className={`font-medium text-sm ${getScoreColor(score)}`}>
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

        <Card className="card-minimal glass-effect border-primary/20">
          <CardHeader className="border-b border-primary/20 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              Quiz Results
              <TrendingUp className="w-4 h-4 text-accent ml-auto" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {!quizSubmissions || quizSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm sm:text-base">No quiz results available yet.</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">Complete quizzes to see your results here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quizSubmissions.map((submission) => {
                  const percentage = submission.quizzes?.total_points > 0 
                    ? (submission.score / submission.quizzes.total_points) * 100 
                    : 0;
                  
                  return (
                    <div key={submission.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 glass-effect rounded border border-primary/20 hover:border-accent/40 transition-all">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base text-foreground truncate">{submission.quizzes?.title}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          📚 {submission.quizzes?.classes?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg p-2">
                          <p className={`font-bold text-sm sm:text-base ${getScoreColor(percentage)}`}>
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
      <div className="flex items-center justify-center py-8 px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showCourseDetails && selectedCourse) {
    return (
      <PermissionWrapper permission="view_submit_assignments">
        <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
          <Button variant="outline" onClick={handleBackToCourses}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl sm:text-2xl truncate">{selectedCourse.course_name}</CardTitle>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="outline">{selectedCourse.course_code}</Badge>
                    <Badge>{selectedCourse.credits} Credits</Badge>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2">{selectedCourse.description}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Course Materials</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">All materials will be downloaded as PDF files</p>
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
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getMaterialIcon(material.material_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{material.title}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{material.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-xs text-muted-foreground">
                              Uploaded: {new Date(material.uploaded_at).toLocaleDateString()}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {material.material_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
                        {material.file_url && (
                          <>
                            <Button size="sm" variant="outline" asChild>
                              <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                <span className="text-xs sm:text-sm">View</span>
                              </a>
                            </Button>
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleDownloadFile(material)}
                              disabled={downloadingFile === material.id}
                              className="bg-primary hover:bg-primary/90"
                            >
                              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="text-xs sm:text-sm">
                                {downloadingFile === material.id ? 'Converting...' : 'Download PDF'}
                              </span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Assignments</CardTitle>
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
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base truncate">{assignment.title}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{assignment.description}</p>
                        </div>
                        <Badge variant={assignment.assignment_submissions?.length > 0 ? 'default' : 'secondary'} className="text-xs self-start flex-shrink-0">
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
        </div>
      </PermissionWrapper>
    );
  }

  return (
    <PermissionWrapper permission="view_submit_assignments">
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Courses & Learning Snapshot</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Track your academic progress and course materials</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Enrolled Courses</p>
                  <p className="text-xl sm:text-2xl font-bold">{enrolledCourses.length}</p>
                </div>
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Overall Progress</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {enrolledCourses.length > 0 
                      ? Math.round(enrolledCourses.reduce((sum, course) => sum + course.progress.progress, 0) / enrolledCourses.length)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Current GPA</p>
                  <p className="text-xl sm:text-2xl font-bold">{calculateOverallGPA()}</p>
                </div>
                <Award className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Credits</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {enrolledCourses.reduce((sum, course) => sum + (course.courses.credits || 0), 0)}
                  </p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="space-y-4">
          <TabsContent value="courses" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {enrolledCourses.map((enrollment, index) => (
                <Card 
                  key={index} 
                  className="cursor-pointer hover:shadow-lg hover:scale-[1.02] sm:hover:scale-105 transition-all duration-200"
                  onClick={() => handleCourseClick(enrollment)}
                >
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{enrollment.courses.course_name}</CardTitle>
                        <Badge variant="outline" className="mt-2">{enrollment.courses.course_code}</Badge>
                      </div>
                      <Badge variant={enrollment.progress.progress >= 75 ? 'default' : 'secondary'} className="flex-shrink-0">
                        {enrollment.progress.progress}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="space-y-3">
                      <Progress value={enrollment.progress.progress} />
                      <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                        <p className="truncate">Instructor: {enrollment.courses.user_profiles?.first_name} {enrollment.courses.user_profiles?.last_name}</p>
                        <p>Credits: {enrollment.courses.credits}</p>
                        <p>Assignments: {enrollment.progress.submittedAssignments}/{enrollment.progress.totalAssignments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
};

export default CoursesLearningSnapshot;