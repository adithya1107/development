import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, AlertTriangle, Camera, X, ScanLine, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';

interface AttendanceOverviewProps {
  studentData: any;
}

const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({ studentData }) => {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalClasses: 0,
    attendedClasses: 0,
    lateClasses: 0,
    percentage: 0,
    effectiveAttendance: 0,
    status: 'good'
  });
  const [courseStats, setCourseStats] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isScanning, setIsScanning] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [isMarked, setIsMarked] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-reader-student';

  useEffect(() => {
    if (studentData?.user_id) {
      fetchAttendanceData();
      fetchCourses();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [studentData, selectedCourse]);

  const fetchCourses = async () => {
    if (!studentData?.user_id) return;

    try {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          courses (
            id,
            course_name,
            course_code
          )
        `)
        .eq('student_id', studentData.user_id)
        .eq('status', 'enrolled');

      if (error) throw error;

      if (enrollments) {
        setCourses(enrollments.map(e => e.courses).filter(Boolean));
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAttendanceData = async () => {
    if (!studentData?.user_id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          courses (
            course_name,
            course_code
          )
        `)
        .eq('student_id', studentData.user_id)
        .order('class_date', { ascending: false });

      if (selectedCourse !== 'all') {
        query = query.eq('course_id', selectedCourse);
      }

      const { data: attendance, error } = await query;

      if (error) throw error;

      if (attendance) {
        setAttendanceData(attendance);
        calculateStats(attendance);
        calculateCourseStats(attendance);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (attendance: any[]) => {
    const totalClasses = attendance.length;
    const presentClasses = attendance.filter(a => a.status === 'present').length;
    const lateClasses = attendance.filter(a => a.status === 'late').length;

    const effectivePresent = presentClasses + (lateClasses * 0.5);
    const percentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
    const effectivePercentage = totalClasses > 0 ? Math.round((effectivePresent / totalClasses) * 100) : 0;

    let status = 'good';
    if (effectivePercentage < 65) status = 'critical';
    else if (effectivePercentage < 75) status = 'warning';

    setOverallStats({
      totalClasses,
      attendedClasses: presentClasses,
      lateClasses,
      percentage,
      effectiveAttendance: effectivePercentage,
      status
    });
  };

  const calculateCourseStats = (attendance: any[]) => {
    const courseMap = new Map();

    attendance.forEach(record => {
      const courseId = record.course_id;
      const courseName = record.courses?.course_name || 'Unknown Course';
      const courseCode = record.courses?.course_code || 'N/A';

      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          course_id: courseId,
          course_name: courseName,
          course_code: courseCode,
          total: 0,
          present: 0,
          absent: 0,
          late: 0
        });
      }

      const courseData = courseMap.get(courseId);
      courseData.total++;

      switch (record.status) {
        case 'present':
          courseData.present++;
          break;
        case 'absent':
          courseData.absent++;
          break;
        case 'late':
          courseData.late++;
          break;
      }
    });

    const stats = Array.from(courseMap.values()).map(course => {
      const effectivePresent = course.present + (course.late * 0.5);
      return {
        ...course,
        percentage: course.total > 0 ? Math.round((course.present / course.total) * 100) : 0,
        effectivePercentage: course.total > 0 ? Math.round((effectivePresent / course.total) * 100) : 0
      };
    });

    setCourseStats(stats);
  };

  const startScanner = async () => {
    try {
      setIsScanning(true);

      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => { });
        scannerRef.current = null;
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const html5QrCode = new Html5Qrcode(scannerDivId);
      scannerRef.current = html5QrCode;

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error('No cameras found on this device');
      }

      const cameraId = cameras.length > 1 ? cameras[cameras.length - 1].id : cameras[0].id;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setQrCodeInput(decodedText);
          stopScanner();
          toast.success('QR Code scanned successfully!');
        },
        () => { }
      );
    } catch (error: any) {
      console.error('Scanner error:', error);
      let errorMessage = 'Failed to start camera. Please check permissions.';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      setIsScanning(false);
      scannerRef.current = null;
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  };

  const handleMarkAttendance = async () => {
    if (!qrCodeInput.trim()) {
      toast.error('Please scan or enter session ID');
      return;
    }

    if (!studentData?.user_id) {
      toast.error('Student data not found');
      return;
    }

    const loadingToast = toast.loading('Verifying session...');

    try {
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('qr_code', qrCodeInput)
        .eq('is_active', true)
        .single();

      if (sessionError || !session) {
        toast.error('Invalid or expired session ID', { id: loadingToast });
        return;
      }

      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentData.user_id)
        .eq('course_id', session.course_id)
        .eq('status', 'enrolled')
        .single();

      if (enrollmentError || !enrollment) {
        toast.error('You are not enrolled in this course', { id: loadingToast });
        return;
      }

      const { data: existing } = await supabase
        .from('attendance')
        .select('id, status')
        .eq('session_id', session.id)
        .eq('student_id', studentData.user_id)
        .single();

      if (existing) {
        toast.error(`Attendance already marked as ${existing.status}`, { id: loadingToast });
        return;
      }

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const isLate = currentTime > session.end_time;
      const attendanceStatus = isLate ? 'late' : 'present';

      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          course_id: session.course_id,
          student_id: studentData.user_id,
          class_date: session.session_date,
          status: attendanceStatus,
          session_id: session.id,
          marked_by: studentData.user_id,
          device_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        });

      if (insertError) throw insertError;

      if (isLate) {
        toast.success(
          `Attendance marked as LATE (0.5x points)`,
          { id: loadingToast }
        );
      } else {
        toast.success(
          `Attendance marked successfully!`,
          { id: loadingToast }
        );
      }

      setIsMarked(true);

      await fetchAttendanceData();

      setTimeout(() => {
        setQrCodeInput('');
        setIsMarked(false);
      }, 3000);

    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast.error(error.message || 'Failed to mark attendance', { id: loadingToast });
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'text-green-600 bg-green-50';
      case 'absent':
        return 'text-red-600 bg-red-50';
      case 'late':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (percentage: number) => {
    if (percentage >= 75) return 'default';
    if (percentage >= 65) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Attendance Overview</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Track your class attendance and statistics</p>
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-full sm:w-48 h-9 sm:h-10">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map(course => (
              <SelectItem key={course.id} value={course.id}>
                {course.course_code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>



      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 w-full max-w-full">
        <Card className="xs:col-span-2 sm:col-span-3 lg:col-span-1">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Effective Attendance</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{overallStats.effectiveAttendance}%</p>
                <p className="text-xs text-muted-foreground mt-1">Late = 0.5x points</p>
              </div>
            </div>
            <Progress value={overallStats.effectiveAttendance} className="mt-2 sm:mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Classes</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">{overallStats.totalClasses}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Present</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 mt-1">{overallStats.attendedClasses}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Late (0.5x)</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-600 mt-1">{overallStats.lateClasses}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Absent</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 mt-1">
                {overallStats.totalClasses - overallStats.attendedClasses - overallStats.lateClasses}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mark" className="w-full space-y-3 sm:space-y-4">
        <div className="w-full overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
          <TabsList className="inline-flex w-full sm:w-auto min-w-full sm:min-w-0 h-auto">
            <TabsTrigger value="mark" className="flex-1 text-[10px] xs:text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-2 whitespace-nowrap">
              Mark Attendance
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex-1 text-[10px] xs:text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-2 whitespace-nowrap">
              Course Summary
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-[10px] xs:text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-2 whitespace-nowrap">
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="mark" className="w-full">
          <Card className="w-full p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ScanLine className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Mark Attendance</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Scan QR code to mark your attendance</p>
              </div>
            </div>

            {isMarked ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <div className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full bg-green-50 flex items-center justify-center mb-4 animate-in zoom-in">
                  <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-green-600" />
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 mb-2">Attendance Marked!</h3>
                <p className="text-sm sm:text-base text-muted-foreground">You're all set for today</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium text-blue-900">Late Attendance</p>
                      <p className="text-xs sm:text-sm text-blue-700">After class ends: Late status (0.5x points). Only faculty can change absent to late.</p>
                    </div>
                  </div>
                </div>


                <div className="space-y-2">
                  <Label htmlFor="qrCode" className="flex items-center gap-2 text-sm sm:text-base">
                    <ScanLine className="h-4 w-4" />
                    QR Code Session ID
                  </Label>

                  {isScanning ? (
                    <div className="space-y-3 sm:space-y-4">
                      <div
                        id={scannerDivId}
                        className="rounded-lg overflow-hidden border-2 border-primary w-full max-w-sm mx-auto"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopScanner}
                        className="w-full h-10 sm:h-11 text-sm sm:text-base"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel Scanning
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 w-full">
                        <Input
                          id="qrCode"
                          placeholder="Scan or paste session ID here"
                          value={qrCodeInput}
                          onChange={(e) => setQrCodeInput(e.target.value)}
                          className="h-10 sm:h-11 md:h-12 font-mono text-xs sm:text-sm flex-1 min-w-0 w-full"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={startScanner}
                          className="h-10 sm:h-11 md:h-12 px-3 sm:px-4 md:px-6 flex-shrink-0"
                        >
                          <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Click the camera icon to scan QR code or enter session ID manually
                      </p>
                    </>
                  )}
                </div>

                <Button
                  onClick={handleMarkAttendance}
                  size="lg"
                  className="w-full h-10 sm:h-11 md:h-12 text-sm sm:text-base"
                  disabled={!qrCodeInput.trim()}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Attendance
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="w-full space-y-3 sm:space-y-4">
          <Card className="w-full">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Course-wise Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              {courseStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">No attendance data available</p>
              ) : (
                courseStats.map((course, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm sm:text-base truncate">{course.course_name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{course.course_code}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                        <span className="text-green-600 whitespace-nowrap">Present: {course.present}</span>
                        <span className="text-yellow-600 whitespace-nowrap">Late: {course.late} (0.5x)</span>
                        <span className="text-red-600 whitespace-nowrap">Absent: {course.absent}</span>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-xs sm:text-sm text-muted-foreground">Effective</div>
                        <Badge variant={getStatusBadgeVariant(course.effectivePercentage)} className="text-xs">
                          {course.effectivePercentage}%
                        </Badge>
                      </div>
                      <div className="w-20 sm:w-24">
                        <Progress value={course.effectivePercentage} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history"  className="w-full space-y-3 sm:space-y-4">
          <Card className="w-full">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Recent Attendance</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                {attendanceData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">No attendance records found</p>
                ) : (
                  attendanceData.slice(0, 20).map((record, index) => (
                    <div key={index} className="flex items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                      <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5">
                          {getAttendanceIcon(record.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs sm:text-sm md:text-base truncate">{record.courses?.course_name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(record.class_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          {record.status === 'late' && (
                            <p className="text-xs text-yellow-600 mt-1">Points: 0.5x (Half credit)</p>
                          )}
                        </div>
                      </div>
                      <Badge className={`${getAttendanceStatusColor(record.status)} flex-shrink-0 text-xs`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceOverview;