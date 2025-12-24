import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, Award, Home, Users, Bell } from 'lucide-react';
import PermissionWrapper from '@/components/PermissionWrapper';
import { supabase } from '@/integrations/supabase/client';

interface StudentDashboardProps {
  studentData: any;
  onNavigate?: (tab: string) => void;
}

const StudentDashboard = ({ studentData, onNavigate }: StudentDashboardProps) => {
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    upcomingAssignments: 0,
    cgpa: 0,
    upcomingEvents: 0
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dummy recent activities data
  const recentActivities = [
    {
      title: 'Assignment Submitted',
      description: 'Data Structures & Algorithms - Binary Tree Implementation',
      time: '2 hours ago',
      type: 'assignment',
      permission: 'view_submit_assignments' as const
    },
    {
      title: 'Grade Updated',
      description: 'Database Management Systems - A Grade',
      time: '1 day ago',
      type: 'grade',
      permission: 'view_grades' as const
    },
    {
      title: 'Attendance Marked',
      description: 'Computer Networks - Present',
      time: '2 days ago',
      type: 'attendance',
      permission: 'view_attendance' as const
    },
    {
      title: 'Assignment Submitted',
      description: 'Web Development - React Project',
      time: '3 days ago',
      type: 'assignment',
      permission: 'view_submit_assignments' as const
    }
  ];

  useEffect(() => {
    if (studentData?.user_id) {
      fetchDashboardData();
    }
  }, [studentData?.user_id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch enrolled courses
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(
            id,
            course_code,
            course_name,
            credits,
            instructor:user_profiles!courses_instructor_id_fkey(
              first_name,
              last_name
            )
          )
        `)
        .eq('student_id', studentData.user_id)
        .eq('status', 'enrolled');

      if (enrollmentsError) {
        console.error('Enrollments error:', enrollmentsError);
        throw enrollmentsError;
      }

      // Fetch upcoming assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*, course:courses(course_name)')
        .gt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(10);

      if (assignmentsError) {
        console.error('Assignments error:', assignmentsError);
        throw assignmentsError;
      }

      // Filter assignments for enrolled courses
      const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
      const upcomingAssignments = assignments?.filter(a => 
        enrolledCourseIds.includes(a.course_id)
      ) || [];

      // Fetch CGPA from student academic records
      const { data: academicRecords, error: academicError } = await supabase
        .from('student_academic_records')
        .select('cgpa')
        .eq('student_id', studentData.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (academicError && academicError.code !== 'PGRST116') {
        console.error('Academic records error:', academicError);
      }

      // Fetch upcoming events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('college_id', studentData.college_id)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      if (eventsError) {
        console.error('Events error:', eventsError);
      }

      const upcomingEventsCount = events?.length || 0;

      // Fetch course progress for enrolled courses
      const coursesWithProgress = await Promise.all(
        (enrollments || []).slice(0, 3).map(async (enrollment: any) => {
          const { data: modules } = await supabase
            .from('learning_modules')
            .select('id')
            .eq('course_id', enrollment.course_id);

          const { data: progress } = await supabase
            .from('student_progress')
            .select('completion_percentage')
            .eq('student_id', studentData.user_id)
            .in('module_id', modules?.map(m => m.id) || []);

          const avgProgress = progress && progress.length > 0
            ? progress.reduce((sum, p) => sum + Number(p.completion_percentage), 0) / progress.length
            : 0;

          return {
            id: enrollment.course?.id,
            name: enrollment.course?.course_name || 'Unknown Course',
            code: enrollment.course?.course_code || 'N/A',
            instructor: enrollment.course?.instructor 
              ? `${enrollment.course.instructor.first_name} ${enrollment.course.instructor.last_name}`
              : 'TBA',
            progress: Math.round(avgProgress)
          };
        })
      );

      setStats({
        enrolledCourses: enrollments?.length || 0,
        upcomingAssignments: upcomingAssignments.length,
        cgpa: academicRecords?.cgpa || 0,
        upcomingEvents: upcomingEventsCount
      });

      setCourses(coursesWithProgress);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickStats = [
    {
      title: 'Enrolled Courses',
      value: stats.enrolledCourses.toString(),
      icon: BookOpen,
      color: 'text-blue-600',
      permission: 'view_submit_assignments' as const
    },
    {
      title: 'Upcoming Assignments',
      value: stats.upcomingAssignments.toString(),
      icon: Calendar,
      color: 'text-orange-600',
      permission: 'view_submit_assignments' as const
    },
    {
      title: 'Current CGPA',
      value: stats.cgpa.toFixed(2),
      icon: Award,
      color: 'text-purple-600',
      permission: 'view_grades' as const
    },
    {
      title: 'Upcoming Events',
      value: stats.upcomingEvents.toString(),
      icon: Bell,
      color: 'text-green-600',
      permission: 'view_submit_assignments' as const
    }
  ];

  const quickActions = [
    {
      title: 'View Assignments',
      description: 'Check and submit pending assignments',
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      permission: 'view_submit_assignments' as const,
      navigateTo: 'courses'
    },
    {
      title: 'Apply for Hostel',
      description: 'Submit hostel accommodation request',
      icon: Home,
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
      permission: 'apply_hostel' as const,
      navigateTo: 'hostel'
    },
    {
      title: 'Join Discussion',
      description: 'Participate in course forums',
      icon: Users,
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      permission: 'join_forums' as const,
      navigateTo: 'communication'
    },
    {
      title: 'Request Certificate',
      description: 'Apply for academic certificates',
      icon: Award,
      color: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100',
      permission: 'request_certificates' as const,
      navigateTo: 'support'
    }
  ];

  const handleQuickActionClick = (navigateTo: string, actionTitle: string) => {
    if (onNavigate) {
      onNavigate(navigateTo);
    } else {
      console.warn(`Navigation not available for ${actionTitle}`);
    }
  };

  const handleStatCardClick = (statTitle: string) => {
    if (onNavigate) {
      switch (statTitle) {
        case 'Enrolled Courses':
          onNavigate('courses');
          break;
        case 'Upcoming Assignments':
          onNavigate('courses');
          break;
        case 'Current CGPA':
          onNavigate('gradebook');
          break;
        case 'Upcoming Events':
          onNavigate('events');
          break;
        default:
          break;
      }
    }
  };

  const handleCourseClick = () => {
    if (onNavigate) {
      onNavigate('courses');
    }
  };

  if (!studentData?.user_id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Loading student data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8 animate-fade-in-up px-3 sm:px-4 md:px-6 overflow-x-hidden w-full">
      {/* Welcome Section */}
      <div className="bg-card border border-white/10 rounded-lg p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 inline-block">
              Welcome, {studentData.first_name}
            </h1>
            <p>Student ID: {studentData.user_code}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 w-full">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <PermissionWrapper key={index} permission={stat.permission}>
              <Card
                className="bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-role-student/20 cursor-pointer hover-translate-up"
                onClick={() => handleStatCardClick(stat.title)}
              >
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground truncate mb-1">{stat.title}</p>
                      <p className="text-base sm:text-lg font-bold text-foreground truncate">{stat.value}</p>
                    </div>
                    <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ml-2`}>
                      <Icon className={`h-4 w-4 sm:h-5 ${stat.color} sm:w-5`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PermissionWrapper>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Activities */}
        <Card className="h-[450px] sm:h-[510px] border-white/20 bg-gradient-to-br from-card/60 to-card/40 overflow-hidden pb-2">
          <CardHeader className="sticky top-0 z-10 bg-neutral-800 border-b border-white/10 pb-4">
            <CardTitle className="text-card-foreground text-lg sm:text-xl">Recent Activities</CardTitle>
            <CardDescription className="text-sm">Your latest academic activities</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-100px)] custom-scrollbar overflow-x-hidden space-y-3 sm:space-y-4 p-4 sm:p-6">
            {recentActivities.map((activity, index) => (
              <PermissionWrapper key={index} permission={activity.permission}>
                <div className="flex flex-row items-start justify-start space-x-2 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 hover:shadow-sm hover:shadow-green-500/5 will-change-transform">
                  <div className="flex-shrink-0 mt-2 sm:mt-2.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                  </div>
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <p className="font-medium text-card-foreground text-sm sm:text-base truncate">{activity.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">{activity.description}</p>
                    <p className="text-[10px] sm:text-xs text-white/40 font-mono mt-1">{activity.time}</p>
                  </div>
                </div>
              </PermissionWrapper>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="h-[450px] sm:h-[510px] border-white/20 bg-gradient-to-br from-card/60 to-card/40 overflow-hidden">
          <CardHeader className="sticky top-0 z-10 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-sm bg-neutral-800 border-b border-white/10 pb-4">
            <CardTitle className="text-card-foreground text-lg sm:text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Frequently used features - click to navigate</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-100px)] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-3 sm:space-y-4 p-4 sm:p-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <PermissionWrapper key={index} permission={action.permission}>
                  <div className="flex flex-row items-start justify-start space-x-4 p-4 rounded-lg border border-white/10 bg-white/5 hover:border-green-400/40 hover:bg-white/10 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-0.5 will-change-transform"
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
            })}
          </CardContent>
        </Card>
      </div>

      {/* Current Courses Preview */}
      <PermissionWrapper permission="view_submit_assignments">
        <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl font-bold text-card-foreground">Current Courses</CardTitle>
            <CardDescription>Your enrolled courses this semester - click to view details</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading courses...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {courses.length > 0 ? (
                    courses.map((course, index) => (
                      <div
                        key={course.id || index}
                        className="p-6 border border-white/10 rounded-lg bg-white/5 hover:border-role-student/20 transition-all duration-300 hover-translate-up cursor-pointer hover:scale-[1.02] sm:hover:scale-105"
                        onClick={handleCourseClick}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-card-foreground">{course.name}</h4>
                          <Badge variant="secondary">{course.code}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{course.instructor}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="text-card-foreground font-medium">{course.progress}%</span>
                          </div>
                          <div className="w-full rounded-full h-2 bg-white/10">
                            <div
                              className="bg-role-student h-2 rounded-full transition-all duration-500"
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <p>No enrolled courses found</p>
                      <p className="text-sm mt-2">Contact your academic advisor for course enrollment</p>
                    </div>
                  )}
                </div>
                {courses.length > 0 && (
                  <div className="mt-8 text-center">
                    <Button
                      variant="outline"
                      onClick={handleCourseClick}
                      className="mt-8 hover:bg-role-student/10 hover:text-role-student hover:border-role-student/20 will-change-transform"
                    >
                      View All Courses
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </PermissionWrapper>
    </div>
  );
};

export default StudentDashboard;