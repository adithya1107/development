import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, AlertTriangle, Clock, Hash, Scan, QrCode as QrCodeIcon, AlertCircle, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import QrScanner from 'qr-scanner';

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

  const [sessionCode, setSessionCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [markingLoading, setMarkingLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);

  useEffect(() => {
    if (studentData?.user_id) {
      fetchAttendanceData();
      fetchCourses();
      fetchTodayAttendance();
      fetchActiveSessions();
      
      const interval = setInterval(fetchActiveSessions, 30000);
      return () => clearInterval(interval);
    }
  }, [studentData, selectedCourse]);

  useEffect(() => {
    if (isScanning && videoRef && !qrScanner) {
      const scanner = new QrScanner(
        videoRef,
        (result) => handleQRScan(result.data),
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      setQrScanner(scanner);
      scanner.start();
    }
    
    return () => {
      if (qrScanner) {
        qrScanner.stop();
        qrScanner.destroy();
        setQrScanner(null);
      }
    };
  }, [isScanning, videoRef]);

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          courses (
            course_name,
            course_code
          ),
          attendance_sessions (
            session_date,
            start_time,
            end_time,
            topic
          )
        `)
        .eq('student_id', studentData.user_id)
        .eq('class_date', today);

      if (error) throw error;
      setTodayAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().slice(0, 5);

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentData.user_id)
        .eq('status', 'enrolled');

      if (!enrollments || enrollments.length === 0) return;

      const courseIds = enrollments.map(e => e.course_id);

      const { data: sessions, error } = await supabase
        .from('attendance_sessions')
        .select(`
          *,
          courses (
            course_name,
            course_code
          ),
          user_profiles!attendance_sessions_instructor_id_fkey (
            first_name,
            last_name
          )
        `)
        .in('course_id', courseIds)
        .eq('session_date', today)
        .eq('is_active', true)
        .lte('start_time', currentTime)
        .gte('end_time', currentTime);

      if (error) throw error;

      const sessionsWithStatus = await Promise.all(
        (sessions || []).map(async (session) => {
          const { data: attendance } = await supabase
            .from('attendance')
            .select('status')
            .eq('session_id', session.id)
            .eq('student_id', studentData.user_id)
            .single();

          const startTimeParts = session.start_time.split(':');
          const startDate = new Date();
          startDate.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0, 0);
          
          const now = new Date();
          const elapsedMs = now.getTime() - startDate.getTime();
          const elapsedMinutes = Math.floor(elapsedMs / 60000);

          return {
            ...session,
            alreadyMarked: !!attendance,
            markedStatus: attendance?.status,
            minutesSinceStart: elapsedMinutes,
            isLateWindow: elapsedMinutes > 10
          };
        })
      );

      setActiveSessions(sessionsWithStatus);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  const markAttendance = async (code: string) => {
    try {
      setMarkingLoading(true);

      const today = new Date().toISOString().split('T')[0];

      // Find session by code and today's date
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select(`
          *,
          courses (
            course_name,
            course_code
          ),
          user_profiles!attendance_sessions_instructor_id_fkey (
            first_name,
            last_name,
            id
          )
        `)
        .eq('qr_code', code.toUpperCase())
        .eq('session_date', today)
        .eq('is_active', true)
        .single();

      if (sessionError || !session) {
        toast.error('Invalid session code or session has expired');
        return;
      }

      // Check if already marked for this session
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id, status')
        .eq('session_id', session.id)
        .eq('student_id', studentData.user_id)
        .single();

      if (existingAttendance) {
        toast.info(`Already marked as ${existingAttendance.status} for this class`);
        return;
      }

      // Verify enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', session.course_id)
        .eq('student_id', studentData.user_id)
        .eq('status', 'enrolled')
        .single();

      if (!enrollment) {
        toast.error('You are not enrolled in this course');
        return;
      }

      // Determine status based on time
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const classStartTime = session.start_time;
      const classEndTime = session.end_time;

      if (currentTime > classEndTime) {
        toast.error('Class has ended. Cannot mark attendance.');
        return;
      }

      // Calculate minutes since class start
      const [startHour, startMin] = classStartTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(startHour, startMin, 0, 0);
      
      const elapsedMs = now.getTime() - startDate.getTime();
      const elapsedMinutes = Math.floor(elapsedMs / 60000);

      let status = 'present';
      let statusMessage = '✓ Attendance marked as PRESENT!';
      
      if (elapsedMinutes > 10) {
        status = 'late';
        statusMessage = '⚠ Marked as LATE (0.5x credit) - Arrived after 10 minutes';
      }

      // Insert attendance record
      const { error: attendanceError } = await supabase
        .from('attendance')
        .insert({
          course_id: session.course_id,
          student_id: studentData.user_id,
          class_date: session.session_date,
          status: status,
          session_id: session.id,
          marked_by: studentData.user_id,
          marked_at: new Date().toISOString(),
          device_info: {
            timestamp: new Date().toISOString(),
            minutes_since_start: elapsedMinutes
          }
        });

      if (attendanceError) throw attendanceError;

      toast.success(statusMessage);
      
      setSessionCode('');
      setScanDialogOpen(false);
      fetchAttendanceData();
      fetchTodayAttendance();
      fetchActiveSessions();

    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast.error(error.message || 'Failed to mark attendance');
    } finally {
      setMarkingLoading(false);
    }
  };

  const handleManualEntry = async () => {
    if (!sessionCode || sessionCode.length !== 6) {
      toast.error('Please enter a valid 6-character session code');
      return;
    }

    await markAttendance(sessionCode);
  };

  const handleQRScan = async (code: string) => {
    await markAttendance(code);
  };

  const startScanning = () => {
    setScanDialogOpen(true);
    setIsScanning(true);
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'text-green-700 border-green-200';
      case 'late':
        return 'text-yellow-700 border-yellow-200';
      case 'absent':
        return 'text-red-700 border-red-200';
      default:
        return 'text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'late':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
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

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 overflow-x-hidden">
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

      <Tabs defaultValue="mark" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          <TabsTrigger value="summary">Course Summary</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attendance Rules:</strong> Mark within first 10 minutes for full credit (Present). After 10 minutes = Late (0.5x credit).
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCodeIcon className="h-5 w-5" />
                Mark Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Enter 6-Character Session Code
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="ABC123"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="font-mono text-lg tracking-wider"
                      disabled={markingLoading}
                    />
                    <Button 
                      onClick={handleManualEntry}
                      disabled={markingLoading || sessionCode.length !== 6}
                    >
                      <Hash className="h-4 w-4 mr-2" />
                      Submit
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button 
                  onClick={startScanning}
                  className="w-full"
                  variant="outline"
                  disabled={markingLoading}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              </div>
            </CardContent>
          </Card>

          {activeSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  Active Classes ({activeSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeSessions.map((session) => (
                  <div 
                    key={session.id}
                    className={`p-4 rounded-lg border-2 ${
                      session.alreadyMarked 
                        ? 'border-gray-200' 
                        : session.isLateWindow
                        ? 'border-yellow-200'
                        : 'border-green-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{session.courses.course_name}</h4>
                        <p className="text-sm text-muted-foreground">{session.courses.course_code}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(session.start_time)} - {formatTime(session.end_time)}
                          </span>
                        </div>
                        {session.topic && (
                          <p className="text-sm text-muted-foreground mt-1">{session.topic}</p>
                        )}
                        {!session.alreadyMarked && (
                          <div className={`text-xs font-medium mt-2 flex items-center gap-1 ${
                            session.isLateWindow ? 'text-yellow-700' : 'text-green-700'
                          }`}>
                            <AlertCircle className="h-3 w-3" />
                            {session.isLateWindow 
                              ? `Late window - Will be marked as Late (0.5x credit)` 
                              : `${10 - session.minutesSinceStart} min left for full credit`
                            }
                          </div>
                        )}
                      </div>
                      <div>
                        {session.alreadyMarked ? (
                          <Badge variant="outline" className="capitalize flex items-center gap-1">
                            {getStatusIcon(session.markedStatus)}
                            <span>{session.markedStatus}</span>
                            {session.markedStatus === 'late' && <span className="text-xs">(0.5x)</span>}
                          </Badge>
                        ) : session.isLateWindow ? (
                          <Badge className="bg-yellow-600">
                            Mark (Late)
                          </Badge>
                        ) : (
                          <Badge className="bg-green-600">
                            Mark Now
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {todayAttendance.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No attendance marked today
                </p>
              ) : (
                <div className="space-y-3">
                  {todayAttendance.map((record) => (
                    <div 
                      key={record.id}
                      className={`p-4 rounded-lg border ${getStatusColor(record.status)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{record.courses.course_name}</h4>
                          <p className="text-sm opacity-80">{record.courses.course_code}</p>
                          <div className="text-xs opacity-70 mt-1">
                            Marked at {new Date(record.marked_at).toLocaleTimeString()}
                          </div>
                          {record.device_info?.minutes_since_start !== undefined && (
                            <div className="text-xs opacity-70 mt-1">
                              {record.device_info.minutes_since_start <= 10 
                                ? `Marked within first 10 minutes` 
                                : `Marked ${record.device_info.minutes_since_start} minutes after start`
                              }
                            </div>
                          )}
                          {record.marked_by && record.marked_by !== record.student_id && (
                            <div className="text-xs mt-1 flex items-center gap-1 text-blue-600">
                              <Edit className="h-3 w-3" />
                              Modified by instructor
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <Badge variant="outline" className="capitalize">
                            {record.status}
                            {record.status === 'late' && <span className="ml-1 text-xs">(0.5x)</span>}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={scanDialogOpen} onOpenChange={(open) => {
            setScanDialogOpen(open);
            if (!open) {
              setIsScanning(false);
              if (qrScanner) {
                qrScanner.stop();
                qrScanner.destroy();
                setQrScanner(null);
              }
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Scan QR Code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                  <video
                    ref={setVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                  />
                  <div className="absolute inset-0 border-2 border-white/30 pointer-events-none">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary" />
                  </div>
                </div>
                <Alert>
                  <Scan className="h-4 w-4" />
                  <AlertDescription>
                    Position the QR code within the frame to mark your attendance.
                  </AlertDescription>
                </Alert>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course-wise Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {courseStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No attendance data available</p>
              ) : (
                courseStats.map((course, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{course.course_name}</h4>
                      <p className="text-sm text-muted-foreground">{course.course_code}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs">
                        <span className="text-green-600">Present: {course.present}</span>
                        <span className="text-yellow-600">Late: {course.late} (0.5x)</span>
                        <span className="text-red-600">Absent: {course.absent}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Effective</div>
                        <Badge variant={getStatusBadgeVariant(course.effectivePercentage)}>
                          {course.effectivePercentage}%
                        </Badge>
                      </div>
                      <div className="w-24">
                        <Progress value={course.effectivePercentage} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="w-full space-y-3 sm:space-y-4">
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
                          {record.marked_by && record.marked_by !== record.student_id && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Edit className="h-3 w-3" />
                              Modified by instructor
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={`${getAttendanceStatusColor(record.status)} flex-shrink-0 text-xs`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        {record.status === 'late' && ' (0.5x)'}
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