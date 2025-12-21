import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, FileText, Calendar, Award, Upload } from 'lucide-react';
import PermissionWrapper from '@/components/PermissionWrapper';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
interface TeacherDashboardProps {
  teacherData: any;
  onNavigate?: (tab: string) => void;
}

interface TeacherStats {
  coursesTeaching: number;
  totalStudents: number;
  pendingAssignments: number;
  classesThisWeek: number;
}

interface TodayClass {
  course: string;
  time: string;
  room: string;
  students: number;
  courseId: string;
  startTime: string;
  endTime: string;
}

interface CourseInfo {
  id: string;
  course_code: string;
  course_name: string;
  credits: number;
  semester: string;
  academic_year: string;
  studentCount: number;
}
interface TeacherActivity {
  activity_type: string;
  reference_id: string;
  title: string;
  description: string;
  activity_time: string;
  metadata: any;
}
// Recent activities configuration
// const RECENT_ACTIVITIES = [
//   {
//     title: 'Assignment Graded',
//     description: 'Data Structures - 15 submissions reviewed',
//     time: '1 hour ago',
//     permission: 'review_assignments' as const
//   },
//   {
//     title: 'Attendance Marked',
//     description: 'Computer Networks - 30 students present',
//     time: '3 hours ago',
//     permission: 'mark_attendance' as const
//   },
//   {
//     title: 'Material Uploaded',
//     description: 'Database Systems - Lecture slides added',
//     time: '1 day ago',
//     permission: 'upload_materials' as const
//   },
//   {
//     title: 'Grade Updated',
//     description: 'Midterm scores published for CS301',
//     time: '2 days ago',
//     permission: 'assign_grades' as const
//   }
// ];

// Quick actions configuration with navigation targets
const QUICK_ACTIONS = [
  {
    title: 'Grade Stduents',
    description: 'Review and grade pending submissions',
    icon: Award,
    color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    permission: 'review_assignments' as const,
    navigateTo: 'gradebook'
  },
  {
    title: 'Mark Attendance',
    description: 'Record student attendance for classes',
    icon: Users,
    color: 'bg-green-50 text-green-600 hover:bg-green-100',
    permission: 'mark_attendance' as const,
    navigateTo: 'schedule'
  },
  {
    title: 'Upload Materials',
    description: 'Share lecture notes and resources',
    icon: Upload,
    color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    permission: 'upload_materials' as const,
    navigateTo: 'courses'
  },
  {
    title: 'Join Discussion',
    description: 'Participate in teacher forums',
    icon: FileText,
    color: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100',
    permission: 'join_forums' as const,
    navigateTo: 'communication'
  }
];

const TeacherDashboard = ({ teacherData, onNavigate }: TeacherDashboardProps) => {
  const [stats, setStats] = useState<TeacherStats>({
    coursesTeaching: 0,
    totalStudents: 0,
    pendingAssignments: 0,
    classesThisWeek: 0
  });
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [recentActivities, setRecentActivities] = useState<TeacherActivity[]>([]);
  useEffect(() => {

    // Try multiple possible ID fields
    const teacherId = teacherData?.id || teacherData?.user_id;

    fetchTeacherStats();
    fetchTodayClasses();
    fetchTeacherCourses();
    fetchTeacherActivities();
  }, [teacherData?.id, teacherData?.user_id]);

  const fetchTeacherStats = async () => {
    try {
      const teacherId = teacherData?.id || teacherData?.user_id;


      // Get current academic year and semester
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const currentSemester = currentMonth >= 7 ? 'Fall' : 'Spring';
      const academicYear = currentMonth >= 7 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;


      // 1. Count courses teaching
      const { data: coursesData, count: coursesCount, error: coursesError } = await supabase
        .from('courses')
        .select('*', { count: 'exact' })
        .eq('instructor_id', teacherId)
        .eq('is_active', true);


      // 2. Count total unique students across all courses
      const courseIds = coursesData?.map(c => c.id) || [];
      let totalStudents = 0;

      if (courseIds.length > 0) {
        const { data: enrollmentsData, error: enrollError } = await supabase
          .from('enrollments')
          .select('student_id')
          .in('course_id', courseIds)
          .eq('status', 'enrolled');

        const uniqueStudents = new Set(enrollmentsData?.map(e => e.student_id) || []);
        totalStudents = uniqueStudents.size;
      }

      // 3. Count pending assignments (submissions without grades)
      let pendingCount = 0;
      if (courseIds.length > 0) {
        const { data: assignmentsData, error: assignError } = await supabase
          .from('assignments')
          .select('id')
          .in('course_id', courseIds);

        if (assignError) {
          console.error('Assignments query error:', assignError);
        } else {
          const assignmentIds = assignmentsData?.map(a => a.id) || [];

          if (assignmentIds.length > 0) {
            const { count, error: subError } = await supabase
              .from('assignment_submissions')
              .select('*', { count: 'exact', head: true })
              .in('assignment_id', assignmentIds)
              .is('marks_obtained', null);

            if (subError) {
              console.error('Submissions query error:', subError);
            } else {
              console.log('Pending submissions count:', count);
              pendingCount = count || 0;
            }
          }
        }
      }

      // 4. Count classes this week from timetable_slots
      const daysThisWeek = Array.from({ length: 7 }, (_, i) => i);

      const { data: slotsData, count: classesCount, error: slotsError } = await supabase
        .from('timetable_slots')
        .select('*', { count: 'exact' })
        .eq('instructor_id', teacherId)
        .eq('is_active', true)
        .in('day_of_week', daysThisWeek);


      const newStats = {
        coursesTeaching: coursesCount || 0,
        totalStudents: totalStudents,
        pendingAssignments: pendingCount,
        classesThisWeek: classesCount || 0
      };

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
    }
  };

  const fetchTodayClasses = async () => {
    try {
      const teacherId = teacherData?.id || teacherData?.user_id;

      if (!teacherId) {
        console.error('Cannot fetch today classes: No teacher ID available');
        return;
      }

      const today = new Date();
      const dayOfWeek = today.getDay();
      const todayDate = today.toISOString().split('T')[0];


      // Fetch regular timetable slots - simplified query first, then join manually
      const { data: timetableData, error: timetableError } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('instructor_id', teacherId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time', { ascending: true });


      // Fetch extra classes for today
      const { data: extraClassesData, error: extraError } = await supabase
        .from('extra_class_schedule')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('scheduled_date', todayDate)
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true });


      const allClasses: TodayClass[] = [];

      // Process regular timetable slots
      if (timetableData && timetableData.length > 0) {
        for (const slot of timetableData) {
          // Fetch course details
          const { data: courseData } = await supabase
            .from('courses')
            .select('id, course_name, course_code')
            .eq('id', slot.course_id)
            .single();

          // Fetch room details
          const { data: roomData } = await supabase
            .from('rooms')
            .select('room_number, building')
            .eq('id', slot.room_id)
            .single();

          if (courseData) {
            // Get student count
            const { count: studentCount } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', courseData.id)
              .eq('status', 'enrolled');

            const roomLocation = roomData
              ? `${roomData.building ? roomData.building + ' - ' : ''}Room ${roomData.room_number}`
              : 'TBA';

            allClasses.push({
              course: `${courseData.course_code} - ${courseData.course_name}`,
              time: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
              room: roomLocation,
              students: studentCount || 0,
              courseId: courseData.id,
              startTime: slot.start_time,
              endTime: slot.end_time
            });
          }
        }
      }

      // Process extra classes
      if (extraClassesData && extraClassesData.length > 0) {
        for (const extraClass of extraClassesData) {
          let courseInfo = null;
          let studentCount = 0;

          if (extraClass.course_id) {
            const { data: courseData } = await supabase
              .from('courses')
              .select('id, course_name, course_code')
              .eq('id', extraClass.course_id)
              .single();

            if (courseData) {
              courseInfo = courseData;
              const { count } = await supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', courseData.id)
                .eq('status', 'enrolled');
              studentCount = count || 0;
            }
          }

          allClasses.push({
            course: courseInfo
              ? `${courseInfo.course_code} - ${courseInfo.course_name} (${extraClass.class_type})`
              : `${extraClass.title} (${extraClass.class_type})`,
            time: `${formatTime(extraClass.start_time)} - ${formatTime(extraClass.end_time)}`,
            room: extraClass.room_location || 'TBA',
            students: studentCount,
            courseId: courseInfo?.id || '',
            startTime: extraClass.start_time,
            endTime: extraClass.end_time
          });
        }
      }

      allClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTodayClasses(allClasses);
    } catch (error) {
      console.error('Error fetching today classes:', error);
    }
  };

  const fetchTeacherCourses = async () => {
    try {
      const teacherId = teacherData?.id || teacherData?.user_id;

      if (!teacherId) {
        return;
      }


      // Fetch courses taught by this teacher
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', teacherId)
        .eq('is_active', true)
        .order('course_code', { ascending: true });

      if (error) {
        console.error('Courses error:', error);
        throw error;
      }


      // Fetch student count for each course
      const coursesWithCounts = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .eq('status', 'enrolled');


          return {
            id: course.id,
            course_code: course.course_code,
            course_name: course.course_name,
            credits: course.credits || 0,
            semester: course.semester,
            academic_year: course.academic_year,
            studentCount: count || 0
          };
        })
      );

      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Error fetching teacher courses:', error);
    }
  };

  const formatTime = (timeString: string): string => {
    if (!timeString) return 'TBA';
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleQuickActionClick = (navigateTo: string, actionTitle: string) => {
    if (onNavigate) {
      onNavigate(navigateTo);
    } else {
      console.warn(`Navigation not available for ${actionTitle}`);
    }
  };

  const handleAttendanceClick = () => {
    if (onNavigate) {
      onNavigate('attendance-tracking');
    } else {
      console.warn('Navigation not available for attendance');
    }
  };

  const fetchTeacherActivities = async () => {
    try {
      const teacherId = teacherData?.id || teacherData?.user_id;
      if (!teacherId) return;

      const { data, error } = await supabase.rpc('get_teacher_activities', {
        p_teacher_id: teacherId,
        p_limit: 10
      });

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      setRecentActivities(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };


  // Dashboard statistics configuration
  const TEACHER_STATS = [
    {
      title: 'Courses Teaching',
      value: stats.coursesTeaching.toString(),
      icon: BookOpen,
      color: 'text-blue-600',
      permission: 'review_assignments' as const
    },
    {
      title: 'Total Students',
      value: stats.totalStudents.toString(),
      icon: Users,
      color: 'text-green-600',
      permission: 'view_attendance' as const
    },
    {
      title: 'Pending Assignments',
      value: stats.pendingAssignments.toString(),
      icon: FileText,
      color: 'text-orange-600',
      permission: 'review_assignments' as const
    },
    {
      title: 'Classes This Week',
      value: stats.classesThisWeek.toString(),
      icon: Calendar,
      color: 'text-purple-600',
      permission: 'mark_attendance' as const
    }
  ];

  const renderStatCard = (stat: typeof TEACHER_STATS[0], index: number) => {
    const Icon = stat.icon;
    return (
      <PermissionWrapper key={index} permission={stat.permission}>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <Icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      </PermissionWrapper>
    );
  };

  const renderActivity = (activity: TeacherActivity, index: number) => (
    <div key={activity.reference_id} >
      <div className="flex flex-row items-start justify-start space-x-2 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 hover:shadow-md hover:shadow-blue-500/5 will-change-transform">
        <div className="flex-shrink-0 mt-2 sm:mt-2.5">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
        </div>
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <p className="font-medium text-card-foreground text-sm sm:text-base truncate">{activity.title}</p>
           <p className="font-medium text-card-foreground text-sm sm:text-base truncate">{activity.activity_type}</p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">{activity.description}</p>
          <p className="text-[10px] sm:text-xs text-white/40 font-mono mt-1">{dayjs(activity.activity_time).fromNow()}</p>
        </div>
      </div>
    </div>
  );

  const renderQuickAction = (action: typeof QUICK_ACTIONS[0], index: number) => {
    const Icon = action.icon;
    return (
      <PermissionWrapper key={index} permission={action.permission}>
        <div
          className="flex flex-row items-center justify-start space-x-4 p-4 rounded-lg border border-white/10 hover:border-blue-400/40 hover:bg-white/10 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 will-change-transform"
          onClick={() => handleQuickActionClick(action.navigateTo, action.title)}
        >
          <div className={`flex-shrink-0 p-2 ${action.color} transition-colors flex items-start self-start mt-1 mr-2`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="flex flex-col justify-center flex-1 min-w-0">
            <p className="font-medium text-card-foreground text-sm sm:text-base truncate">{action.title}</p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">{action.description}</p>
          </div>
        </div>
      </PermissionWrapper>
    );
  };

  const renderClassItem = (classItem: TodayClass, index: number) => (
    <div key={index} className="flex items-center justify-between p-4 border rounded-lg transition-colors">
      <div>
        <h4 className="font-medium">{classItem.course}</h4>
        <p className="text-sm">{classItem.time} • {classItem.room}</p>
      </div>
      <div className="text-right">
        <Badge variant="secondary">{classItem.students} students</Badge>
        <div className="mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAttendanceClick}
            className="hover:bg-role-teacher/10 hover:text-role-teacher hover:border-role-teacher/20 will-change-transform"
          >
            Mark Attendance
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in-up space-y-6 bg-black">
      {/* Welcome Section */}
      <Card className="border-0 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Welcome, Prof. {teacherData?.first_name} {teacherData?.last_name}!</span>
          </CardTitle>
          <CardDescription>
            Teacher ID: {teacherData?.user_code}
          </CardDescription>
          <Badge className="bg-blue-600/30 text-blue-100 border border-blue-300/40 font-bold px-5 py-1.5 w-fit self-start md:self-auto rounded-full hover:bg-blue-600/40 hover:border-blue-300/60 hover:cursor-pointer hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 mt-4">
            FACULTY
          </Badge>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TEACHER_STATS.map(renderStatCard)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card className="h-[450px] sm:h-[510px] border-white/20 bg-gradient-to-br from-card/60 to-card/40 overflow-hidden pb-2">
          <CardHeader className="sticky top-0 z-10 bg-neutral-800 border-b border-white/10 pb-4">
            <CardTitle className="text-card-foreground text-lg sm:text-xl">Recent Activities</CardTitle>
            <CardDescription className="text-sm">Your latest teaching activities</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-100px)] custom-scrollbar overflow-x-hidden space-y-3 sm:space-y-4 p-4 sm:p-6">
            {recentActivities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No recent activity found
              </p>
            )}
            {recentActivities.map(renderActivity)}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="h-[450px] sm:h-[510px] border-white/20 bg-gradient-to-br from-card/60 to-card/40 overflow-hidden">
          <CardHeader className="sticky top-0 z-10 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-sm bg-neutral-800 border-b border-white/10 pb-4">
            <CardTitle className="text-card-foreground text-lg sm:text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Commonly used features - click to navigate</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-100px)] custom-scrollbar overflow-x-hidden space-y-3 sm:space-y-4 p-4 sm:p-6">
            {QUICK_ACTIONS.map(renderQuickAction)}
          </CardContent>
        </Card>
      </div>

      {/* Teaching Schedule */}
      {/* <PermissionWrapper permission="mark_attendance">
        <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Today's Classes
            </CardTitle>
            <CardDescription>Your scheduled classes for today</CardDescription>
          </CardHeader>
          <CardContent>
            {todayClasses.length > 0 ? (
              <div className="space-y-3">
                {todayClasses.map(renderClassItem)}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No classes scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionWrapper> */}

      {/* My Courses */}
      <PermissionWrapper permission="review_assignments">
        <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              My Courses
            </CardTitle>
            <CardDescription>Courses you are teaching this semester</CardDescription>
          </CardHeader>
          <CardContent>
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow border-white/10 bg-gradient-to-br from-card/60 to-card/40">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base font-semibold text-card-foreground">
                            {course.course_code}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1 line-clamp-2">
                            {course.course_name}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {course.credits} Credits
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{course.studentCount} Students</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onNavigate && onNavigate('courses')}
                          className="hover:bg-blue-500/10 hover:text-blue-400"
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No courses assigned for this semester</p>
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionWrapper>
    </div>
  );
};

export default TeacherDashboard;