import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QRCode from 'qrcode';
import { getCurrentLocation } from '@/lib/locationUtils';
import { 
  Calendar, 
  MapPin, 
  Users, 
  ChevronLeft,
  ChevronRight,
  Star,
  QrCode as QrCodeIcon,
  Copy,
  CheckCircle,
  Clock,
  Edit,
  AlertCircle,
  History,
  FileText,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';

interface TeacherScheduleProps {
  teacherData: any;
}

const TeacherSchedule = ({ teacherData }: TeacherScheduleProps) => {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMobileDay, setCurrentMobileDay] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const [courseAttendanceStats, setCourseAttendanceStats] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [canGenerateQR, setCanGenerateQR] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [minutesSinceStart, setMinutesSinceStart] = useState<number>(0);
  const [teacherCourseIds, setTeacherCourseIds] = useState<string[]>([]);
  const [hoveredClass, setHoveredClass] = useState<any>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number; showBelow?: boolean } | null>(null);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = React.useRef<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<any[]>([]);

const [pastSessions, setPastSessions] = useState<any[]>([]);
const [selectedHistorySession, setSelectedHistorySession] = useState<any>(null);
const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
const [loadingHistory, setLoadingHistory] = useState(false);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

  useEffect(() => {
    if (teacherData?.user_id) {
      fetchTeacherCourses();
    }
  }, [teacherData]);

  useEffect(() => {
    if (teacherData?.user_id) {
      fetchScheduleData();
    }
  }, [teacherData, currentWeek, currentMobileDay, teacherCourseIds]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isQRDialogOpen && currentSessionId) {
      fetchAttendanceForSession();
      fetchFailedAttempts();
      interval = setInterval(() => {
      fetchAttendanceForSession();
      fetchFailedAttempts(); 
    }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isQRDialogOpen, currentSessionId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isQRDialogOpen && selectedClass) {
        checkTimeValidity(selectedClass);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isQRDialogOpen, selectedClass]);

  // Fetch past sessions when tab changes or course filter changes
  useEffect(() => {
    if (teacherData?.user_id && teacherCourseIds.length > 0) {
      fetchPastSessions();
    }
  }, [teacherData, teacherCourseIds, selectedCourseFilter]);

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const generateSessionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const approveFailedAttempt = async (attempt: any) => {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const classStartTime = selectedClass.start_time;

    // Calculate status
    const [startHour, startMin] = classStartTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startHour, startMin, 0, 0);
    
    const attemptTime = new Date(attempt.attempted_at);
    const elapsedMs = attemptTime.getTime() - startDate.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    let status = 'present';
    if (elapsedMinutes > 10) {
      status = 'late';
    }

    // Create attendance record
    const attendanceData = {
      course_id: attempt.course_id,
      student_id: attempt.student_id,
      class_date: selectedClass.scheduled_date || new Date().toISOString().split('T')[0],
      status: status,
      session_id: attempt.session_id,
      marked_by: teacherData.user_id,
      marked_at: new Date().toISOString(),
      device_info: {
        approved_from_failed_attempt: true,
        original_attempt_time: attempt.attempted_at,
        failure_reason: attempt.failure_reason,
        distance_meters: attempt.distance_from_teacher,
        gps_accuracy: attempt.gps_accuracy
      },
      student_latitude: attempt.student_latitude,
      student_longitude: attempt.student_longitude,
      distance_from_teacher: attempt.distance_from_teacher
    };

    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert(attendanceData);

    if (attendanceError) throw attendanceError;

    // Update attempt status
    const { error: updateError } = await supabase
      .from('attendance_attempts')
      .update({
        status: 'approved',
        reviewed_by: teacherData.user_id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', attempt.id);

    if (updateError) throw updateError;

    toast.success('Attendance approved successfully');
    fetchAttendanceForSession();
    fetchFailedAttempts();
  } catch (error) {
    console.error('Error approving attempt:', error);
    toast.error('Failed to approve attendance');
  }
};

const rejectFailedAttempt = async (attemptId: string) => {
  try {
    const { error } = await supabase
      .from('attendance_attempts')
      .update({
        status: 'rejected',
        reviewed_by: teacherData.user_id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', attemptId);

    if (error) throw error;

    toast.success('Attempt rejected');
    fetchFailedAttempts();
  } catch (error) {
    console.error('Error rejecting attempt:', error);
    toast.error('Failed to reject attempt');
  }
};

  const checkTimeValidity = (classData: any) => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (currentTime >= classData.start_time && currentTime <= classData.end_time) {
      const startTimeParts = classData.start_time.split(':');
      const startDate = new Date();
      startDate.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0, 0);
      
      const elapsedMs = now.getTime() - startDate.getTime();
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      setMinutesSinceStart(elapsedMinutes);

      const endTimeParts = classData.end_time.split(':');
      const endDate = new Date();
      endDate.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0, 0);
      
      const remainingMs = endDate.getTime() - now.getTime();
      const remainingMinutes = Math.floor(remainingMs / 60000);
      
      setTimeRemaining(remainingMinutes);
      setCanGenerateQR(true);
    } else {
      setCanGenerateQR(false);
      setTimeRemaining(0);
      setMinutesSinceStart(0);
    }
  };

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchWeeklySchedule(),
        fetchTodayClasses()
      ]);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_name, course_code')
        .eq('instructor_id', teacherData.user_id)
        .eq('is_active', true);

      if (error) throw error;

      if (data) {
        setCourses(data);
        setTeacherCourseIds(data.map(c => c.id));
      }
    } catch (error) {
      console.error('Error fetching teacher courses:', error);
      toast.error('Failed to fetch your courses');
    }
  };

  const fetchWeeklySchedule = async () => {
    try {
      if (teacherCourseIds.length === 0) {
        setSchedule([]);
        return;
      }

      const { data: regularSchedule, error: regularError } = await supabase
        .from('class_schedule')
        .select(`
          *,
          courses (
            id,
            course_name,
            course_code,
            instructor_id,
            enrollments (count)
          )
        `)
        .in('course_id', teacherCourseIds);

      if (regularError) throw regularError;

      let allScheduleData = [];

      if (regularSchedule) {
        const regularScheduleData = regularSchedule
          .filter(schedule => schedule.courses?.instructor_id === teacherData.user_id)
          .map(schedule => ({
            ...schedule,
            is_extra_class: false,
            class_type: 'regular'
          }));
        allScheduleData = [...regularScheduleData];
      }

      const weekStart = new Date(currentWeek);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const mobileStart = new Date(currentMobileDay);
      mobileStart.setDate(mobileStart.getDate() - 3);
      const mobileEnd = new Date(currentMobileDay);
      mobileEnd.setDate(mobileEnd.getDate() + 3);

      const earliestDate = weekStart < mobileStart ? weekStart : mobileStart;
      const latestDate = weekEnd > mobileEnd ? weekEnd : mobileEnd;

      const { data: extraClasses, error: extraError } = await supabase
        .from('extra_class_schedule')
        .select(`
          id,
          course_id,
          teacher_id,
          title,
          description,
          scheduled_date,
          start_time,
          end_time,
          room_location,
          class_type,
          status,
          courses (
            course_name,
            course_code,
            instructor_id
          )
        `)
        .eq('teacher_id', teacherData.user_id)
        .eq('status', 'scheduled')
        .gte('scheduled_date', earliestDate.toISOString().split('T')[0])
        .lte('scheduled_date', latestDate.toISOString().split('T')[0]);

      if (!extraError && extraClasses && extraClasses.length > 0) {
        const extraScheduleData = extraClasses.map(extraClass => {
          const scheduledDate = new Date(extraClass.scheduled_date);
          return {
            id: extraClass.id,
            day_of_week: scheduledDate.getDay(),
            scheduled_date: extraClass.scheduled_date,
            start_time: extraClass.start_time,
            end_time: extraClass.end_time,
            room_location: extraClass.room_location || '',
            course_id: extraClass.course_id,
            class_type: extraClass.class_type,
            title: extraClass.title,
            description: extraClass.description,
            status: extraClass.status,
            is_extra_class: true,
            courses: {
              id: extraClass.course_id,
              course_name: extraClass.courses?.course_name || extraClass.title,
              course_code: extraClass.courses?.course_code || 'EXTRA',
              instructor_id: extraClass.teacher_id,
              enrollments: []
            }
          };
        });
        
        allScheduleData = [...allScheduleData, ...extraScheduleData];
      }

      setSchedule(allScheduleData);

    } catch (error) {
      console.error('Error fetching weekly schedule:', error);
      toast.error('Failed to fetch schedule');
    }
  };

  const fetchTodayClasses = async () => {
    const today = new Date();
    const todayDay = today.getDay();
    
    try {
      if (teacherCourseIds.length === 0) {
        setTodayClasses([]);
        return;
      }

      const { data: regularClasses, error: regularError } = await supabase
        .from('class_schedule')
        .select(`
          *,
          courses (
            id,
            course_name,
            course_code,
            instructor_id,
            enrollments (count)
          )
        `)
        .in('course_id', teacherCourseIds)
        .eq('day_of_week', todayDay);

      let allTodayClasses = [];

      if (!regularError && regularClasses) {
        const regularClassesData = regularClasses
          .filter(cls => cls.courses?.instructor_id === teacherData.user_id)
          .map(cls => ({
            ...cls,
            is_extra_class: false,
            class_type: 'regular'
          }));
        allTodayClasses = [...regularClassesData];
      }

      const todayString = today.toISOString().split('T')[0];
      const { data: extraClasses, error: extraError } = await supabase
        .from('extra_class_schedule')
        .select(`
          id,
          course_id,
          teacher_id,
          title,
          description,
          scheduled_date,
          start_time,
          end_time,
          room_location,
          class_type,
          status,
          courses (
            course_name,
            course_code,
            instructor_id
          )
        `)
        .eq('teacher_id', teacherData.user_id)
        .eq('status', 'scheduled')
        .eq('scheduled_date', todayString);

      if (!extraError && extraClasses && extraClasses.length > 0) {
        const extraClassesData = extraClasses.map(extraClass => ({
          id: extraClass.id,
          day_of_week: todayDay,
          scheduled_date: extraClass.scheduled_date,
          start_time: extraClass.start_time,
          end_time: extraClass.end_time,
          room_location: extraClass.room_location || '',
          course_id: extraClass.course_id,
          class_type: extraClass.class_type,
          title: extraClass.title,
          description: extraClass.description,
          status: extraClass.status,
          is_extra_class: true,
          courses: {
            id: extraClass.course_id,
            course_name: extraClass.courses?.course_name || extraClass.title,
            course_code: extraClass.courses?.course_code || 'EXTRA',
            instructor_id: extraClass.teacher_id,
            enrollments: []
          }
        }));
        
        allTodayClasses = [...allTodayClasses, ...extraClassesData];
      }

      allTodayClasses.sort((a, b) => a.start_time.localeCompare(b.start_time));
      setTodayClasses(allTodayClasses);

    } catch (error) {
      console.error('Error fetching today classes:', error);
    }
  };

  const fetchFailedAttempts = async () => {
  if (!currentSessionId) return;
  await fetchFailedAttemptsForSession(currentSessionId);
  };
  const fetchFailedAttemptsForSession = async (sessionId: string) => {
  try {
    const { data, error } = await supabase
      .from('attendance_attempts')
      .select(`
        *,
        user_profiles!attendance_attempts_student_id_fkey (
          id,
          first_name,
          last_name,
          user_code
        )
      `)
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .order('attempted_at', { ascending: false });

    if (error) throw error;
    setFailedAttempts(data || []);
  } catch (error) {
    console.error('Error fetching failed attempts:', error);
  }
};

  const generateQRCode = async (classData: any) => {
  try {
    if (!teacherCourseIds.includes(classData.course_id)) {
      toast.error('You are not authorized to generate QR code for this course');
      return;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (currentTime < classData.start_time) {
      toast.error('Cannot generate QR code before class starts');
      return;
    }

    if (currentTime > classData.end_time) {
      toast.error('Class has already ended. Cannot generate QR code');
      return;
    }

    // Get teacher's location
    let teacherLocation: { latitude: number; longitude: number } | null = null;
    
    try {
      const location = await getCurrentLocation();
      teacherLocation = location;
      toast.success('📍 Location captured for attendance verification');
    } catch (locationError: any) {
      toast.error(locationError.message || 'Failed to get location. Attendance will work without location verification.');
      console.error('Location error:', locationError);
      // Continue without location - you can make this required by adding 'return;' here
    }

    const today = new Date().toISOString().split('T')[0];
    const sessionDate = classData.scheduled_date || today;

    const { data: existingSession } = await supabase
      .from('attendance_sessions')
      .select('id, qr_code, is_active')
      .eq('course_id', classData.course_id)
      .eq('session_date', sessionDate)
      .eq('start_time', classData.start_time)
      .eq('instructor_id', teacherData.user_id)
      .single();

    let session;
    let qrCodeData;

    if (existingSession) {
      session = existingSession;
      qrCodeData = existingSession.qr_code;
      
      // Update session with location if captured
      const updateData: any = { is_active: true };
      if (teacherLocation) {
        updateData.teacher_latitude = teacherLocation.latitude;
        updateData.teacher_longitude = teacherLocation.longitude;
      }
      
      await supabase
        .from('attendance_sessions')
        .update(updateData)
        .eq('id', existingSession.id);
      
      toast.info('Reopening existing session with updated location');
    } else {
      let sessionCode;
      let isUnique = false;
      
      while (!isUnique) {
        sessionCode = generateSessionCode();
        
        const { data: existingCode } = await supabase
          .from('attendance_sessions')
          .select('id')
          .eq('qr_code', sessionCode)
          .eq('session_date', sessionDate)
          .single();
        
        if (!existingCode) {
          isUnique = true;
        }
      }

      const sessionData: any = {
        course_id: classData.course_id,
        instructor_id: teacherData.user_id,
        session_date: sessionDate,
        start_time: classData.start_time,
        end_time: classData.end_time,
        session_type: classData.is_extra_class ? classData.class_type : 'lecture',
        topic: classData.title || classData.courses?.course_name,
        qr_code: sessionCode,
        is_active: true,
        room_location: classData.room_location
      };

      // Add location if captured
      if (teacherLocation) {
        sessionData.teacher_latitude = teacherLocation.latitude;
        sessionData.teacher_longitude = teacherLocation.longitude;
      }

      const { data: newSession, error: sessionError } = await supabase
        .from('attendance_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (sessionError) throw sessionError;

      qrCodeData = sessionCode;
      session = newSession;
      
      if (teacherLocation) {
        toast.success('✅ QR Code generated with location verification!');
      } else {
        toast.success('QR Code generated! (Location verification unavailable)');
      }
    }

    setSelectedClass(classData);
    setCurrentSessionId(session.id);

    const qrDataUrl = await QRCode.toDataURL(qrCodeData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#3b82f6',
        light: '#ffffff',
      },
    });

    setQrCode(qrDataUrl);
    setSessionId(qrCodeData);
    setIsQRDialogOpen(true);
    setAttendanceRecords([]);
    setCourseAttendanceStats([]);
    checkTimeValidity(classData);
    
    setTimeout(() => fetchAttendanceForSession(), 500);

    const endTimeParts = classData.end_time.split(':');
    const endDate = new Date();
    endDate.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0, 0);
    const remainingMs = endDate.getTime() - now.getTime();

    if (remainingMs > 0) {
      setTimeout(async () => {
        await closeSession(session.id, classData.course_id, sessionDate);
      }, remainingMs);
    }

  } catch (error: any) {
    console.error('Error generating QR code:', error);
    toast.error(error.message || 'Failed to generate QR code');
  }
};

  const closeSession = async (sessionId: string, courseId: string, sessionDate: string) => {
    try {
      await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      const { data: attendedStudents } = await supabase
        .from('attendance')
        .select('student_id')
        .eq('session_id', sessionId);

      const attendedIds = new Set((attendedStudents || []).map(a => a.student_id));

      const { data: enrolledStudents } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId)
        .eq('status', 'enrolled');

      const absentStudents = (enrolledStudents || [])
        .filter(e => !attendedIds.has(e.student_id))
        .map(e => ({
          course_id: courseId,
          student_id: e.student_id,
          class_date: sessionDate,
          status: 'absent',
          session_id: sessionId,
          marked_by: teacherData.user_id,
          marked_at: new Date().toISOString()
        }));

      if (absentStudents.length > 0) {
        await supabase
          .from('attendance')
          .insert(absentStudents);
      }

      if (isQRDialogOpen) {
        toast.info(`Session closed. ${absentStudents.length} students marked absent.`);
        await fetchAttendanceForSession();
      }
    } catch (error) {
      console.error('Error closing session:', error);
    }
  };

  const fetchAttendanceForSession = async () => {
    if (!currentSessionId || !selectedClass?.course_id) return;

    try {
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select(`
          student_id,
          status,
          marked_at,
          session_id,
          device_info,
          user_profiles!attendance_student_id_fkey (
            id,
            first_name,
            last_name,
            user_code
          )
        `)
        .eq('session_id', currentSessionId)
        .order('marked_at', { ascending: false });

      if (attError) throw attError;

      const { data: allEnrolled, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          user_profiles!enrollments_student_id_fkey (
            id,
            first_name,
            last_name,
            user_code
          )
        `)
        .eq('course_id', selectedClass.course_id)
        .eq('status', 'enrolled');

      if (enrollError) throw enrollError;

      const allStudentsWithStatus = (allEnrolled || []).map(enrollment => {
        const attendanceRecord = (attendance || []).find(a => a.student_id === enrollment.student_id);

        return {
          student_id: enrollment.student_id,
          user_profiles: enrollment.user_profiles,
          status: attendanceRecord?.status || 'waiting',
          marked_at: attendanceRecord?.marked_at || null,
          session_id: currentSessionId,
          device_info: attendanceRecord?.device_info
        };
      });

      setAttendanceRecords(allStudentsWithStatus);
      
      if (attendance && attendance.length > 0) {
        await fetchCourseAttendanceStats(selectedClass.course_id, attendance);
      }
    } catch (error) {
      console.error('Error in fetchAttendanceForSession:', error);
    }
  };

  const fetchCourseAttendanceStats = async (courseId: string, currentAttendance: any[]) => {
    try {
      const studentIds = currentAttendance.map(a => a.student_id);
      
      if (studentIds.length === 0) return;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('course_id', courseId)
        .in('student_id', studentIds);

      if (!attendanceError && attendanceData) {
        const statsMap = new Map();
        
        attendanceData.forEach(record => {
          if (!statsMap.has(record.student_id)) {
            statsMap.set(record.student_id, { present: 0, late: 0, total: 0 });
          }
          const stats = statsMap.get(record.student_id);
          stats.total += 1;
          if (record.status === 'present') {
            stats.present += 1;
          } else if (record.status === 'late') {
            stats.late += 1;
          }
        });

        const stats = Array.from(statsMap.entries()).map(([studentId, data]: [string, any]) => {
          const effectivePresent = data.present + (data.late * 0.5);
          return {
            student_id: studentId,
            present_count: data.present,
            late_count: data.late,
            total_count: data.total,
            percentage: data.total > 0 ? ((effectivePresent / data.total) * 100).toFixed(1) : '0.0'
          };
        });

        setCourseAttendanceStats(stats);
      }
    } catch (error) {
      console.error('Error fetching course attendance stats:', error);
    }
  };

  const updateStudentAttendance = async (studentId: string, newStatus: 'present' | 'late') => {
  if (!currentSessionId) return;

  try {
    const { data: existing } = await supabase
      .from('attendance')
      .select('id, status')
      .eq('session_id', currentSessionId)
      .eq('student_id', studentId)
      .single();

    if (existing) {
      // Allow Late → Present and Absent → Late transitions
      const allowedTransitions = {
        'late': ['present'],
        'absent': ['late']
      };

      if (allowedTransitions[existing.status]?.includes(newStatus)) {
        const { error } = await supabase
          .from('attendance')
          .update({ 
            status: newStatus,
            marked_by: teacherData.user_id,
            marked_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;

        toast.success(`Attendance updated to ${newStatus}`);
        await fetchAttendanceForSession();
        setEditingStudent(null);
      } else {
        toast.error('Invalid status transition');
      }
    }
  } catch (error) {
    console.error('Error updating attendance:', error);
    toast.error('Failed to update attendance');
  }
};

  // Fetch past attendance sessions
const fetchPastSessions = async () => {
  if (teacherCourseIds.length === 0) return;

  try {
    setLoadingHistory(true);

    let query = supabase
      .from('attendance_sessions')
      .select(`
        *,
        courses (
          id,
          course_name,
          course_code
        )
      `)
      .eq('instructor_id', teacherData.user_id)
      .order('session_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(50);

    if (selectedCourseFilter !== 'all') {
      query = query.eq('course_id', selectedCourseFilter);
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    if (sessions) {
      // Fetch attendance counts for each session
      const sessionsWithStats = await Promise.all(
        sessions.map(async (session) => {
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('status')
            .eq('session_id', session.id);

          const presentCount = attendanceData?.filter(a => a.status === 'present').length || 0;
          const lateCount = attendanceData?.filter(a => a.status === 'late').length || 0;
          const absentCount = attendanceData?.filter(a => a.status === 'absent').length || 0;
          const totalStudents = attendanceData?.length || 0;

          return {
            ...session,
            present_count: presentCount,
            late_count: lateCount,
            absent_count: absentCount,
            total_students: totalStudents
          };
        })
      );

      setPastSessions(sessionsWithStats);
    }
  } catch (error) {
    console.error('Error fetching past sessions:', error);
    toast.error('Failed to load attendance history');
  } finally {
    setLoadingHistory(false);
  }
};

// View details of a past session
const viewSessionDetails = async (session: any) => {
  try {
    setSelectedHistorySession(session);
    setCurrentSessionId(session.id);
    setHistoryDialogOpen(true);

    // Fetch attendance for this session
    await fetchAttendanceForHistorySession(session.id, session.course_id);
  } catch (error) {
    console.error('Error viewing session details:', error);
    toast.error('Failed to load session details');
  }
};

// Fetch attendance for a historical session
const fetchAttendanceForHistorySession = async (sessionId: string, courseId: string) => {
  try {
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select(`
        student_id,
        status,
        marked_at,
        marked_by,
        session_id,
        device_info,
        user_profiles!attendance_student_id_fkey (
          id,
          first_name,
          last_name,
          user_code
        )
      `)
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: false });

    if (attError) throw attError;

    const { data: allEnrolled, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        user_profiles!enrollments_student_id_fkey (
          id,
          first_name,
          last_name,
          user_code
        )
      `)
      .eq('course_id', courseId)
      .eq('status', 'enrolled');

    if (enrollError) throw enrollError;

    const allStudentsWithStatus = (allEnrolled || []).map(enrollment => {
      const attendanceRecord = (attendance || []).find(a => a.student_id === enrollment.student_id);

      return {
        student_id: enrollment.student_id,
        user_profiles: enrollment.user_profiles,
        status: attendanceRecord?.status || 'absent',
        marked_at: attendanceRecord?.marked_at || null,
        marked_by: attendanceRecord?.marked_by || null,
        session_id: sessionId,
        device_info: attendanceRecord?.device_info
      };
    });

    setAttendanceRecords(allStudentsWithStatus);

    await fetchFailedAttemptsForSession(sessionId);

    if (attendance && attendance.length > 0) {
      await fetchCourseAttendanceStats(courseId, attendance);
    }
  } catch (error) {
    console.error('Error fetching historical attendance:', error);
  }
};

  const getAttendancePercentage = (studentId: string) => {
    const stats = courseAttendanceStats.find(s => s.student_id === studentId);
    return stats ? stats.percentage : '0.0';
  };

  const getAttendanceColor = (percentage: string) => {
    const percent = parseFloat(percentage);
    if (percent >= 75) return 'text-green-600';
    if (percent >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'border-green-300 text-green-700';
      case 'late':
        return 'border-yellow-300 text-yellow-700';
      case 'absent':
        return 'border-red-300 text-red-700';
      default:
        return 'border-gray-300 text-gray-700';
    }
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopiedSessionId(true);
    toast.success('Session ID copied to clipboard');
    setTimeout(() => setCopiedSessionId(false), 2000);
  };

  const getWeekDays = (startDate: Date) => {
    const week = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const navigateMobileDay = (direction: 'prev' | 'next') => {
    const newDay = new Date(currentMobileDay);
    newDay.setDate(currentMobileDay.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentMobileDay(newDay);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

const formatTimeShort = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';  
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes}${ampm}`;
};

const getClassesForDay = (dayOfWeek: number, specificDate?: Date) => {
  return schedule.filter(cls => {
    if (cls.is_extra_class && cls.scheduled_date && specificDate) {
      const classDate = new Date(cls.scheduled_date);
      return classDate.toDateString() === specificDate.toDateString();
    }
    return cls.day_of_week === dayOfWeek;
  });
};

const detectOverlaps = (classes: any[]) => {
  const sortedClasses = [...classes].sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  const overlaps = [];  
  for (let i = 0; i < sortedClasses.length; i++) {
    const current = sortedClasses[i];
    const currentStart = timeToMinutes(current.start_time);
    const currentEnd = timeToMinutes(current.end_time);
    
    let overlapGroup = [current];
    
    for (let j = i + 1; j < sortedClasses.length; j++) {
      const next = sortedClasses[j];
      const nextStart = timeToMinutes(next.start_time);
      
      if (nextStart < currentEnd) {
        overlapGroup.push(next);
      }
    }
    
    if (overlapGroup.length > 1) {
      overlaps.push(overlapGroup);
    }
  }
  
  return overlaps;
};  

const calculateOverlapPositions = (classes: any[]) => {
  const positions = new Map();
  const overlaps = detectOverlaps(classes);
  
  overlaps.forEach(group => {
    group.forEach((cls, index) => {
      positions.set(cls, {
        totalInGroup: group.length,
        position: index
      });
    });
  });
  
  return positions;
};

  const getClassTypeStyle = (cls: any) => {
    if (!cls.is_extra_class) {
      return 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20';
    }
    
    switch (cls.class_type) {
      case 'extra':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'remedial':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
      case 'makeup':
        return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
      case 'special':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isClassActive = (classItem: any) => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= classItem.start_time && currentTime <= classItem.end_time;
  };

  const canGenerateQRForClass = (classItem: any) => {
    if (!teacherCourseIds.includes(classItem.course_id)) {
      return false;
    }
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= classItem.start_time && currentTime <= classItem.end_time;
  };

  const getClassPosition = (startTime: string, endTime: string) => {
  const dayStartMinutes = 0 * 60;
  const dayEndMinutes = 24 * 60;
  const totalMinutes = dayEndMinutes - dayStartMinutes;
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const duration = endMinutes - startMinutes;
  
  const topPercent = ((startMinutes - dayStartMinutes) / totalMinutes) * 100;
  const heightPercent = (duration / totalMinutes) * 100;
  
  return {
    top: `${Math.max(0, topPercent)}%`,
    height: `${Math.max(3, heightPercent)}%`,
    durationMinutes: duration  // ← ADD THIS LINE
  };
};

  const generateTimeLabels = () => {
    const labels = [];
    for (let hour = 0; hour < 25; hour++) {
      labels.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        display: formatTime(`${hour.toString().padStart(2, '0')}:00`)
      });
    }
    return labels;
  };

  const handleClassHover = (cls: any, event: React.MouseEvent) => {
    // If already hovering the same class, don't recalculate
    if (isHoveringRef.current && hoveredClass?.id === cls.id) {
      return;
    }
    
    // Mark that we're hovering
    isHoveringRef.current = true;
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const cardWidth = 320;
    const cardHeight = 220;
    
    // Calculate horizontal position
    let xPos = rect.left + rect.width / 2;
    
    // Prevent card from going off screen on the left
    if (xPos - cardWidth / 2 < 10) {
      xPos = cardWidth / 2 + 10;
    }
    
    // Prevent card from going off screen on the right
    if (xPos + cardWidth / 2 > viewportWidth - 10) {
      xPos = viewportWidth - cardWidth / 2 - 10;
    }
    
    // Calculate vertical position - show below if not enough space above
    let yPos = rect.top;
    let showBelow = false;
    
    // Add extra padding to prevent card from triggering leave events
    if (rect.top < cardHeight + 40) {
      // Not enough space above, show below
      yPos = rect.bottom;
      showBelow = true;
    }
    
    // Set immediately without delay to prevent flickering
    setHoveredClass(cls);
    setHoverPosition({
      x: xPos,
      y: yPos,
      showBelow: showBelow
    });
  };

  const handleClassLeave = () => {
    // Mark that we're not hovering anymore
    isHoveringRef.current = false;
    
    // Clear timeout if exists
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Add delay before hiding
    hoverTimeoutRef.current = setTimeout(() => {
      // Only hide if we're still not hovering
      if (!isHoveringRef.current) {
        setHoveredClass(null);
        setHoverPosition(null);
      }
    }, 200);
  };

  const hasNoCourses = courses.length === 0 && !loading;

  if (loading && courses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {hasNoCourses && (
        <Alert>
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            You don't have any courses assigned yet. Once courses are assigned to you, they will appear here.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Hover Card */}
      {hoveredClass && hoverPosition && (
        <div
          className="fixed z-[9999]"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
            transform: hoverPosition.showBelow 
              ? 'translate(-50%, 15px)' 
              : 'translate(-50%, calc(-100% - 10px))',
            pointerEvents: 'none',
            willChange: 'transform',
            isolation: 'isolate',
            
          }}
          onMouseEnter={() => {
            isHoveringRef.current = true;
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
        >
          <div className="bg-black border-1 border-primary shadow-xl rounded-lg p-2 w-80">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {hoveredClass.is_extra_class && (
                  <Star className="h-4 w-4 flex-shrink-0" />
                )}
                <h4 className="font-bold text-sm text-primary truncate">
                  {hoveredClass.courses?.course_code}
                </h4>
                {isClassActive(hoveredClass) && (
                  <Badge variant="default" className="text-xs flex-shrink-0">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium line-clamp-2">
                {hoveredClass.courses?.course_name}
              </p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="font-medium">
                    {formatTime(hoveredClass.start_time)} - {formatTime(hoveredClass.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{hoveredClass.room_location || 'Room TBD'}</span>
                </div>
                {hoveredClass.is_extra_class && (
                  <div className="flex items-center gap-1 capitalize">
                    <Badge variant="outline" className="text-xs">
                      {hoveredClass.class_type}
                    </Badge>
                  </div>
                )}
                {!hoveredClass.is_extra_class && hoveredClass.courses?.enrollments?.[0]?.count > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 flex-shrink-0" />
                    <span>{hoveredClass.courses.enrollments[0].count} students</span>
                  </div>
                )}
              </div>
              <div className="pt-1 border-t text-xs text-gray-500 flex items-center gap-1">
                <QrCodeIcon className="h-3 w-3 flex-shrink-0" />
                <span>Click to generate QR</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger> 
        </TabsList>
        <TabsContent value="schedule" className="space-y-4">
          {/* Schedule Component */}
          <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] mt-2 overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Attendance Session - {selectedClass?.courses?.course_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {!canGenerateQR ? (
                  <Alert className="border-red-200">
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Class has ended. Session is now closed.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className={minutesSinceStart <= 10 ? '' : ''}>
                    <CheckCircle className={`h-4 w-4 ${minutesSinceStart <= 10 ? '' : ''}`} />
                    <AlertDescription className={minutesSinceStart <= 10 ? '' : ''}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span>
                          Session active • {timeRemaining} min remaining
                          {minutesSinceStart <= 10 ? (
                            <> • {10 - minutesSinceStart} min left for full credit</>
                          ) : (
                            <> • Late period (0.5x credit)</>
                          )}
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col items-center gap-4 p-4 sm:p-6 bg-muted/50 rounded-lg">
                  <div className="p-4 rounded-lg shadow-md">
                    {qrCode && <img src={qrCode} alt="Attendance QR Code" className="w-[200px] h-[200px] sm:w-[300px] sm:h-[300px]" />}
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xs sm:text-sm font-medium">
                      Session Code: <span className="font-mono text-primary text-2xl font-bold tracking-wider">{sessionId}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Students can scan QR or enter this 6-character code
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <span className="font-medium">
                        First 10 min = Present | After 10 min = Late (0.5x)
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={copySessionId}>
                      {copiedSessionId ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copiedSessionId ? 'Copied!' : 'Copy Code'}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    Live Attendance ({attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length} / {attendanceRecords.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {attendanceRecords.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Loading student list...
                      </p>
                    ) : (
                      attendanceRecords.map((record, index) => {
                        const attendancePercentage = getAttendancePercentage(record.student_id);
                        const isMarked = record.status !== 'waiting';
                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isMarked ? getStatusColor(record.status) : 'border-muted bg-background'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm sm:text-base">
                                {record.user_profiles?.first_name} {record.user_profiles?.last_name}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                ID: {record.user_profiles?.user_code}
                              </p>
                            </div>
                            <div className="text-right space-y-1 flex items-center gap-2 sm:gap-3">
                              {isMarked ? (
                              <>
                                <div>
                                  <p className="text-xs sm:text-sm font-medium">
                                    {new Date(record.marked_at).toLocaleTimeString()}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {record.status}
                                      {record.status === 'late' && ' (0.5x)'}
                                    </Badge>
                                    <span className={`text-xs font-semibold ${getAttendanceColor(attendancePercentage)}`}>
                                      {attendancePercentage}%
                                    </span>
                                  </div>
                                </div>

                                {/* Edit buttons for LATE status */}
                                {record.status === 'late' && (
                                  <div className="flex gap-2">
                                    {editingStudent === record.student_id ? (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => updateStudentAttendance(record.student_id, 'present')}
                                          className="h-8 bg-green-50 hover:bg-green-100 border-green-300"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Present
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingStudent(null)}
                                          className="h-8"
                                        >
                                          Cancel
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingStudent(record.student_id)}
                                        className="h-8"
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Edit
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {/* Edit buttons for ABSENT status */}
                                {record.status === 'absent' && (
                                  <div className="flex gap-2">
                                    {editingStudent === record.student_id ? (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => updateStudentAttendance(record.student_id, 'late')}
                                          className="h-8 bg-yellow-50 hover:bg-yellow-100 border-yellow-300"
                                        >
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Late
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => updateStudentAttendance(record.student_id, 'present')}
                                          className="h-8 bg-green-50 hover:bg-green-100 border-green-300"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Present
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingStudent(null)}
                                          className="h-8"
                                        >
                                          Cancel
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingStudent(record.student_id)}
                                        className="h-8"
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Edit
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {/* Present status - no edit button */}
                                {record.status === 'present' && (
                                  <Badge variant="outline" className="text-green-700 border-green-300">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Confirmed
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                                Waiting...
                              </Badge>
                            )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden lg:inline">Weekly Schedule Timeline</span>
                  <span className="lg:hidden">Daily Schedule</span>
                </CardTitle>
                
                {/* Desktop Week Navigation */}
                <div className="hidden lg:flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs sm:text-sm font-medium min-w-[100px] sm:min-w-[140px] text-center">
                    {currentWeek.toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Mobile Day Navigation */}
                <div className="flex lg:hidden items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMobileDay('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium min-w-[140px] text-center">
                    {currentMobileDay.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric' 
                    })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigateMobileDay('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-hidden">
              {hasNoCourses ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No Schedule Available</p>
                  <p className="text-sm">Your schedule will appear here once courses are assigned to you.</p>
                </div>
              ) : (
                <>
                  {/* Desktop View - Timeline */}
                  <div className="hidden lg:grid grid-cols-8 gap-2 min-h-[800px]">
                    <div className="space-y-0 relative">
                      <div className="h-12"></div>
                      <div className="relative" style={{ height: 'calc(100% - 48px)' }}>
                        {generateTimeLabels().map((label, index) => (
                          <div 
                            key={label.time}
                            className="absolute text-xs text-muted-foreground w-full pr-2 text-right"
                            style={{ 
                              top: `${(index / (generateTimeLabels().length - 1)) * 100}%`,
                              transform: 'translateY(-50%)'
                            }}
                          >
                            {label.display}
                          </div>
                        ))}
                      </div>
                    </div>

                    {getWeekDays(currentWeek).map((date, dayIndex) => {
                      const dayClasses = getClassesForDay(dayIndex, date);
                      const overlapPositions = calculateOverlapPositions(dayClasses); 
                      
                      return (
                        <div key={dayIndex} className="space-y-2">
                        <div className={`h-12 text-center p-2 rounded-lg ${
                          isToday(date) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <div className="text-sm font-medium">{daysOfWeek[dayIndex]}</div>
                          <div className="text-xs">{date.getDate()}</div>
                        </div>
                        
                        <div className="relative border rounded-lg overflow-hidden" style={{ height: 'calc(100% - 56px)', minHeight: '700px' }}>
                          {generateTimeLabels().map((_, index) => (
                            <div 
                              key={index}
                              className="absolute w-full border-t border-muted"
                              style={{ top: `${(index / (generateTimeLabels().length - 1)) * 100}%` }}
                            />
                          ))}
                          
                          {dayClasses.map((cls, clsIndex) => {
                            const position = getClassPosition(cls.start_time, cls.end_time);
                            const active = isClassActive(cls);
                            const overlapInfo = overlapPositions.get(cls);  // ← GET OVERLAP INFO
                            
                            // Calculate width and left offset for overlapping classes
                            let widthPercent = 100;
                            let leftPercent = 0;
                            
                            if (overlapInfo) {
                              widthPercent = 100 / overlapInfo.totalInGroup;
                              leftPercent = widthPercent * overlapInfo.position;
                            }
                            
                            // Determine if class is too small to show details
                            const isSmallSlot = position.durationMinutes < 45;
                            const isVerySmallSlot = position.durationMinutes < 30;
                            
                            return (
                              <div 
                                key={clsIndex}
                                className={`absolute p-1.5 rounded text-xs border cursor-pointer transition-colors duration-150 overflow-hidden ${getClassTypeStyle(cls)} ${
                                  active ? 'ring-2 ring-offset-1' : ''
                                }`}
                                style={{
                                  top: position.top,
                                  height: position.height,
                                  left: `${leftPercent}%`,   
                                  width: `${widthPercent - 1}%`,  
                                  minHeight: '28px'
                                }}
                                onClick={() => generateQRCode(cls)}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  handleClassHover(cls, e);
                                }}
                                onMouseLeave={(e) => {
                                  e.stopPropagation();
                                  handleClassLeave();
                                }}
                              >
                                {isVerySmallSlot ? (
                                  // Very small slot - only show course code
                                  <div className="flex items-center justify-center h-full pointer-events-none">
                                    <div className="font-semibold text-[10px] truncate flex items-center gap-0.5">
                                      {cls.is_extra_class && (
                                        <Star className="h-2 w-2 flex-shrink-0" />
                                      )}
                                      <span className="truncate">{cls.courses?.course_code}</span>
                                    </div>
                                  </div>
                                ) : isSmallSlot ? (
                                  // Small slot - show code and time
                                  <div className="space-y-0.5 pointer-events-none">
                                    <div className="font-medium text-[10px] truncate flex items-center gap-0.5">
                                      {cls.is_extra_class && (
                                        <Star className="h-2 w-2 flex-shrink-0" />
                                      )}
                                      <span className="truncate">{cls.courses?.course_code}</span>
                                    </div>
                                    <div className="text-[9px] truncate">
                                      {formatTimeShort(cls.start_time)}
                                    </div>
                                  </div>
                                ) : (
                                  // Normal slot - show all details
                                  <div className="space-y-0.5 pointer-events-none">
                                    <div className="font-medium text-[10px] truncate flex items-center gap-0.5">
                                      {cls.is_extra_class && (
                                        <Star className="h-2 w-2 flex-shrink-0" />
                                      )}
                                      <span className="truncate">{cls.courses?.course_code}</span>
                                    </div>
                                    <div className="text-[9px] truncate">
                                      {formatTimeShort(cls.start_time)}
                                    </div>
                                    {position.durationMinutes >= 60 && (
                                      <>
                                        <div className="text-[9px] truncate">
                                          {cls.room_location || 'TBD'}
                                        </div>
                                        {cls.is_extra_class && position.durationMinutes >= 75 && (
                                          <div className="text-[9px] truncate capitalize">
                                            {cls.class_type}
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {active && position.durationMinutes >= 60 && (
                                      <div className="text-[9px] font-semibold text-green-600 pointer-events-none">
                                        ACTIVE
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  {/* Mobile View - Daily List Format */}
                  <div className="lg:hidden space-y-3">
                    <div className={`p-4 rounded-lg ${
                      isToday(currentMobileDay) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <div className="text-lg font-semibold">
                        {currentMobileDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      {isToday(currentMobileDay) && (
                        <div className="text-sm opacity-90 mt-1">Today</div>
                      )}
                    </div>
                    
                    {(() => {
                      const mobileDayOfWeek = currentMobileDay.getDay();
                      const dayClasses = getClassesForDay(mobileDayOfWeek, currentMobileDay);
                      
                      if (dayClasses.length === 0) {
                        return (
                          <div className="text-center py-12 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No classes scheduled</p>
                            <p className="text-sm mt-1">You have no classes on this day</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {dayClasses.map((cls, clsIndex) => {
                            const active = isClassActive(cls);
                            return (
                              <div 
                                key={clsIndex}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${getClassTypeStyle(cls)} ${
                                  active ? 'ring-2 ring-primary' : ''
                                }`}
                                onClick={() => generateQRCode(cls)}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      {cls.is_extra_class && (
                                        <Star className="h-4 w-4 flex-shrink-0" />
                                      )}
                                      <span className="font-bold text-base truncate">{cls.courses?.course_code}</span>
                                      {active && (
                                        <Badge className="text-xs" variant="default">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Active
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm font-medium truncate mb-3">{cls.courses?.course_name}</div>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 opacity-70" />
                                        <span className="font-medium">{formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 opacity-70" />
                                        <span>{cls.room_location || 'Room TBD'}</span>
                                      </div>
                                      {cls.is_extra_class && (
                                        <div className="text-xs mt-2 opacity-70 capitalize font-medium">
                                          📚 {cls.class_type} class
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-2">
                                    <QrCodeIcon className="h-6 w-6 opacity-50" />
                                    <span className="text-xs opacity-70">Tap for QR</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Today's Classes ({new Date().toLocaleDateString()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayClasses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {hasNoCourses ? 'No courses assigned yet' : 'No classes scheduled for today'}
                </p>
              ) : (
                <div className="space-y-4">
                  {todayClasses.map((classItem) => {
                    const isActive = isClassActive(classItem);
                    return (
                      <Card key={classItem.id} className={`p-3 sm:p-4 ${
                        classItem.is_extra_class ? 'border-l-4' : ''
                      } ${isActive ? 'ring-2 ring-primary' : ''}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full">
                            <div className="text-center">
                              <div className="text-base sm:text-lg font-bold text-primary">
                                {formatTime(classItem.start_time)}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                {formatTime(classItem.end_time)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <h3 className="font-semibold text-base sm:text-lg">{classItem.courses?.course_name}</h3>
                                {classItem.is_extra_class && (
                                  <Badge variant="secondary" className="text-xs capitalize flex items-center">
                                    <Star className="h-3 w-3 mr-1" />
                                    {classItem.class_type}
                                  </Badge>
                                )}
                                {isActive && (
                                  <Badge className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Active Now
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {classItem.courses?.course_code}
                              </p>
                              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                                  {classItem.room_location || 'Room TBD'}
                                </div>
                                {!classItem.is_extra_class && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                                    {classItem.courses?.enrollments?.[0]?.count || 0} students
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button 
                            onClick={() => generateQRCode(classItem)}
                            variant="default"
                            disabled={!canGenerateQRForClass(classItem)}
                          >
                            <QrCodeIcon className="h-4 w-4 mr-2" />
                            {canGenerateQRForClass(classItem) ? 'Generate QR' : 'Not Started'}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Attendance History</h2>
              <p className="text-sm text-muted-foreground">View and edit past session attendance</p>
            </div>
            <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
              <SelectTrigger className="w-full sm:w-48">
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

          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pastSessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No attendance sessions found</p>
                <p className="text-sm mt-2">Past sessions will appear here once you conduct classes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastSessions.map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => viewSessionDetails(session)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{session.courses?.course_name}</h3>
                          <Badge variant="outline">{session.courses?.course_code}</Badge>
                          {!session.is_active && (
                            <Badge variant="secondary" className="text-xs">Closed</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{session.topic || 'No topic specified'}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(session.session_date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                          </div>
                          {session.room_location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{session.room_location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <div className="text-2xl font-bold">{session.total_students}</div>
                          <div className="text-xs text-muted-foreground">Total Students</div>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <Badge variant="outline" >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {session.present_count}
                          </Badge>
                          <Badge variant="outline">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {session.late_count}
                          </Badge>
                          <Badge variant="outline">
                            <XCircle className="h-3 w-3 mr-1" />
                            {session.absent_count}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          

          {/* History Dialog - Same structure as QR Dialog but for past sessions */}
          <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
                  {selectedHistorySession?.courses?.course_name} - Session Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Session Info:</strong> {new Date(selectedHistorySession?.session_date).toLocaleDateString()} • 
                    {' '}{formatTime(selectedHistorySession?.start_time)} - {formatTime(selectedHistorySession?.end_time)}
                    {selectedHistorySession?.room_location && ` • ${selectedHistorySession.room_location}`}
                  </AlertDescription>
                </Alert>
                {/* Failed Attempts Section */}
                {failedAttempts.length > 0 && (
                  <div className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base text-yellow-900">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      Failed Location Attempts ({failedAttempts.length})
                    </h3>
                    <div className="space-y-3">
                      {failedAttempts.map((attempt) => (
                        <div
                          key={attempt.id}
                          className="flex flex-col sm:flex-row items-start justify-between p-3 rounded-lg border-2 border-yellow-300 bg-white gap-3"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm sm:text-base">
                              {attempt.user_profiles?.first_name} {attempt.user_profiles?.last_name}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              ID: {attempt.user_profiles?.user_code}
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              ❌ {attempt.failure_reason}
                            </p>
                            {attempt.gps_accuracy && (
                              <p className="text-xs text-muted-foreground mt-1">
                                GPS Accuracy: ±{Math.round(attempt.gps_accuracy)}m
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Attempted: {new Date(attempt.attempted_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveFailedAttempt(attempt)}
                              className="flex-1 sm:flex-none bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectFailedAttempt(attempt.id)}
                              className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 border-red-300 text-red-700"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    Attendance Records ({attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length} / {attendanceRecords.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {attendanceRecords.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Loading attendance records...
                      </p>
                    ) : (
                      attendanceRecords.map((record, index) => {
                        const attendancePercentage = getAttendancePercentage(record.student_id);
                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(record.status)}`}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm sm:text-base">
                                {record.user_profiles?.first_name} {record.user_profiles?.last_name}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                ID: {record.user_profiles?.user_code}
                              </p>
                              {record.marked_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Marked: {new Date(record.marked_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right space-y-1 flex items-center gap-2 sm:gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {record.status}
                                    {record.status === 'late' && ' (0.5x)'}
                                  </Badge>
                                  <span className={`text-xs font-semibold ${getAttendanceColor(attendancePercentage)}`}>
                                    {attendancePercentage}%
                                  </span>
                                </div>
                              </div>

                              {/* Same edit buttons as live session */}
                              {record.status === 'late' && (
                                <div className="flex gap-2">
                                  {editingStudent === record.student_id ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateStudentAttendance(record.student_id, 'present')}
                                        className="h-8"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Present
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingStudent(null)}
                                        className="h-8"
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingStudent(record.student_id)}
                                      className="h-8"
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                              )}

                              {record.status === 'absent' && (
                                <div className="flex gap-2">
                                  {editingStudent === record.student_id ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateStudentAttendance(record.student_id, 'late')}
                                        className="h-8"
                                      >
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Late
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateStudentAttendance(record.student_id, 'present')}
                                        className="h-8"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Present
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingStudent(null)}
                                        className="h-8"
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingStudent(record.student_id)}
                                      className="h-8"
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                              )}

                              {record.status === 'present' && (
                                <Badge variant="outline" >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Confirmed
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherSchedule;