import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  Calendar,
  Users,
  BookOpen,
  ClipboardList,
  MessageSquare,
  FileText,
  Settings,
  Bell,
  User,
  TrendingUp,
  Award,
  HelpCircle,
  LogOut,
  X,
  Check,
  AlertTriangle,
  Info,
  UserCircle,
  PlusCircle,
  PlusCircleIcon,
  Menu,
  Building2Icon
} from 'lucide-react';
import SidebarNavigation from '@/components/layout/SidebarNavigation';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import TeacherSchedule from '@/components/teacher/TeacherSchedule';
import TeacherCalendarAttendance from '@/components/teacher/TeacherCalendarAttendance';
import AttendanceTracking from '@/components/teacher/AttendanceTracking/AttendanceTracking';
import EnhancedAttendanceTracker from '@/components/teacher/AttendanceTracking/EnhancedAttendanceTracker';
import TeacherCourses from '@/components/teacher/TeacherCourses';
import TeacherCommunication from '@/components/teacher/TeacherCommunication';
import TeacherDocuments from '@/components/teacher/TeacherDocuments';
import TeacherPerformance from '@/components/teacher/TeacherPerformance';
import TeacherRecognition from '@/components/teacher/TeacherRecognition';
import TeacherEvents from '@/components/teacher/TeacherEvents';
import TeacherParentInteraction from '@/components/teacher/TeacherParentInteraction';
import TeacherDepartment from '@/components/teacher/TeacherDepartment';
import TeacherSupport from '@/components/teacher/TeacherSupport';
import { supabase } from '@/integrations/supabase/client';
import GradeManager from '@/components/teacher/GradeManager';
import TeacherExtra from '@/components/teacher/TeacherExtra';
import ClubAdvisor from '@/components/teacher/ClubAdvisor';
import TeacherCGPAManagement from '@/components/teacher/TeacherCGPAManagement';

const Teacher = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Mock notifications data
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'info',
      title: 'New Assignment Submissions',
      message: '5 students have submitted their Math assignments',
      time: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'warning',
      title: 'Low Attendance Alert',
      message: 'Class 10-A has 65% attendance this week',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      type: 'success',
      title: 'Grade Report Generated',
      message: 'Monthly grade report is ready for review',
      time: '3 hours ago',
      read: true
    },
    {
      id: 4,
      type: 'info',
      title: 'Parent-Teacher Meeting',
      message: 'Scheduled for tomorrow at 2:00 PM',
      time: '1 day ago',
      read: true
    },
    {
      id: 5,
      type: 'warning',
      title: 'System Maintenance',
      message: 'Scheduled maintenance this weekend',
      time: '2 days ago',
      read: false
    }
  ]);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Close mobile menu when switching to desktop
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        // First check Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          navigate('/');
          return;
        }

        if (session?.user) {
          // Get user profile from database
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError || !profile) {
            console.error('Profile error:', profileError);
            navigate('/');
            return;
          }

          if (profile.user_type !== 'faculty') {
            toast({
              title: 'Access Denied',
              description: 'This area is for teachers only.',
              variant: 'destructive',
            });
            navigate('/');
            return;
          }

          setTeacherData({
            user_id: profile.id,
            user_type: profile.user_type,
            first_name: profile.first_name,
            last_name: profile.last_name,
            college_id: profile.college_id,
            user_code: profile.user_code,
            email: profile.email
          });
        } else {
          // Fallback to localStorage
          const userData = localStorage.getItem('colcord_user');
          if (!userData) {
            navigate('/');
            return;
          }

          const parsedUser = JSON.parse(userData);
          if (parsedUser.user_type !== 'faculty') {
            toast({
              title: 'Access Denied',
              description: 'This area is for teachers only.',
              variant: 'destructive',
            });
            navigate('/');
            return;
          }

          setTeacherData(parsedUser);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('colcord_user');
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
    navigate('/');
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
    toast({
      title: 'Notifications Cleared',
      description: 'All notifications have been cleared.',
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-role-teacher" />
      </div>
    );
  }

  if (!teacherData) {
    return null;
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    // { id: 'attendance-tracking', label: 'Attendance Tracking', icon: ClipboardList },
    // { id: 'enhanced-attendance', label: 'Enhanced Attendance Tracker', icon: ClipboardList },
    { id: 'courses', label: 'Course & Quiz', icon: BookOpen },
    { id: 'gradebook', label: 'Grading', icon: ClipboardList },
    { id: 'cgpa', label: 'CGPA Calculator', icon: GraduationCap },
    { id: 'extra-classes', label: 'Extra Classes', icon: PlusCircleIcon },
    { id: 'events', label: 'Events', icon: Calendar },
    // { id: 'club', label: 'Clubs', icon: Users },
    { id: 'performance', label: 'Student Performance', icon: TrendingUp },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'parent-interaction', label: 'Parent Interaction', icon: Users },
    { id: 'absence', label: 'Absence Review', icon: Users },
    // { id: 'documents', label: 'Document Management', icon: FileText },
    { id: 'recognition', label: 'Recognition & Feedback', icon: Award },
    { id: 'department', label: 'Department', icon: Building2Icon},
    { id: 'support', label: 'Support & Helpdesk', icon: HelpCircle },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <TeacherDashboard teacherData={teacherData} onNavigate={setActiveView} />;
      case 'schedule':
        return <TeacherSchedule teacherData={teacherData} />;
      // case 'attendance-tracking':
      //   return <AttendanceTracking teacherData={teacherData} />;
      // case 'enhanced-attendance':
      //   return <EnhancedAttendanceTracker teacherData={teacherData} />;
      case 'courses':
        return <TeacherCourses teacherData={teacherData} />;
      case 'gradebook':
        return <GradeManager />;
      case 'cgpa':
        return <TeacherCGPAManagement teacherData={teacherData} />;
      case 'extra-classes':
        return <TeacherExtra teacherData={teacherData} />;
      case 'events':
        return <TeacherEvents teacherData={teacherData} />;
      case 'club':
        return <ClubAdvisor teacherData={teacherData} />;
      case 'performance':
        return <TeacherPerformance teacherData={teacherData} />;
      case 'communication':
        return <TeacherCommunication teacherData={teacherData} />;
      case 'parent-interaction':
        return <TeacherParentInteraction teacherData={teacherData} />;
      case 'absence':
        return <TeacherCalendarAttendance teacherData={teacherData} />;
      case 'documents':
        return <TeacherDocuments teacherData={teacherData} />;
      case 'recognition':
        return <TeacherRecognition teacherData={teacherData} />;
      case 'department':
        return <TeacherDepartment teacherData={teacherData}/>;
      case 'support':
        return <TeacherSupport teacherData={teacherData} />;
      default:
        return <TeacherDashboard teacherData={teacherData} />;
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* Header */}
      <div className="fixed w-full z-[100] bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex justify-between items-center h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-3 sm:space-x-6">
              {/* Sidebar Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSidebarToggle}
                className="h-9 w-9 rounded-lg hover:bg-white/10 transition-all duration-200 ease-in-out"
              >
                <span className="sr-only">Toggle sidebar</span>
                <Menu className="h-7 w-7" />
              </Button>

              {/* Logo + Portal Name */}
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">ColCord</h1>
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="h-6 w-px bg-white/20"></div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-role-teacher rounded-full animate-pulse-indicator"></div>
                    <span className="text-sm sm:text-lg font-medium text-foreground">Faculty Portal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2 sm:space-x-3">

              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNotificationClick}
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-colors relative"
                >
                  <Bell className="h-5 w-5 text-foreground" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">{unreadCount}</span>
                    </div>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="fixed right-3 sm:right-4 top-20 w-72 sm:w-96 bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999]">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground">Notifications</h3>
                      <div className="flex items-center space-x-2">
                        {notifications.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllNotifications}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Clear All
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowNotifications(false)}
                          className="h-6 w-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-80 sm:max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <Bell className="h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-sm text-muted-foreground">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors ${!notification.read ? 'bg-white/5' : ''
                              }`}
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-1">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <div className="h-2 w-2 bg-blue-500 rounded-full ml-2"></div>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUserMenuClick}
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-all will-change-transform"
                >
                  <User className="h-9 w-9 text-foreground" />
                </Button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="fixed right-3 sm:right-4 top-20 w-60 sm:w-64 bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999]">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 sm:h-12 w-10 sm:w-12 bg-role-teacher/20 rounded-full flex items-center justify-center">
                          <UserCircle className="h-6 sm:h-8 w-6 sm:w-8 text-role-teacher" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            Prof. {teacherData.first_name} {teacherData.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {teacherData.email}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 font-medium text-xs pointer-events-none">
                              Faculty
                            </Badge>
                            <span className="text-blue-300 border-blue-400/30 text-xs font-medium">
                              {teacherData.user_code}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 space-y-1">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowUserMenu(false);
                          setActiveView('support');
                        }}
                        className="w-full justify-start text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Settings & Support
                      </Button>

                      <div className="h-px bg-white/10 my-2"></div>

                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full justify-start text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex mt-[64px] min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <SidebarNavigation
          items={sidebarItems}
          activeItem={activeView}
          onItemClick={setActiveView}
          userType="faculty"
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />


        {/* Main Content */}
        <div className={cn(
          "flex-1 w-full min-w-0 transition-all duration-300 ease-in-out",
          "px-4 py-4 sm:px-12 sm:py-6 mx-auto",
          sidebarCollapsed ? "md:ml-16" : "md:ml-64",
        )}>
          {renderContent()}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobile && !sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-[90] md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};

export default Teacher;