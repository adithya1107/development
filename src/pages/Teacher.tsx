import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
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
  PlusCircleIcon
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
import TeacherSupport from '@/components/teacher/TeacherSupport';
import { supabase } from '@/integrations/supabase/client';
import GradeManager from '@/components/teacher/GradeManager';
import StudentEnrollmentManagement from '@/components/teacher/StudentEnrollmentManagement';
import TeacherExtra from '@/components/teacher/TeacherExtra';

const Teacher = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  
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
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
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

  useEffect(() => {
    const checkUser = async () => {
      try {
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
      } catch (error) {
        console.error('Error checking user:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate]);

  const handleLogout = async() => {
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
    { id: 'enrollment', label: 'Enrollment', icon: Users },
    { id: 'attendance-tracking', label: 'Attendance Tracking', icon: ClipboardList },
    { id: 'enhanced-attendance', label: 'Enhanced Attendance Tracker', icon: ClipboardList },
    { id: 'courses', label: 'Course & Quiz', icon: BookOpen },
    { id: 'gradebook', label: 'Grading', icon: ClipboardList },
    { id: 'extra-classes', label: 'Extra Classes', icon: PlusCircleIcon },
    { id: 'events', label: 'Events & Calendar', icon: Calendar },
    { id: 'performance', label: 'Student Performance', icon: TrendingUp },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'parent-interaction', label: 'Parent Interaction', icon: Users },
    { id: 'absence', label: 'Absence Review', icon: Users },
    { id: 'documents', label: 'Document Management', icon: FileText },
    { id: 'recognition', label: 'Recognition & Feedback', icon: Award },
    { id: 'support', label: 'Support & Helpdesk', icon: HelpCircle },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <TeacherDashboard teacherData={teacherData} />;
      case 'schedule':
        return <TeacherSchedule teacherData={teacherData} />;
      case 'enrollment':
        return <StudentEnrollmentManagement teacherData={teacherData}/>;
      case 'attendance-tracking':
        return <AttendanceTracking teacherData={teacherData} />;
      case 'enhanced-attendance':
        return <EnhancedAttendanceTracker teacherData={teacherData} />;
      case 'courses':
        return <TeacherCourses teacherData={teacherData} />;
      case 'gradebook':
        return <GradeManager />;
      case 'extra-classes':
        return <TeacherExtra teacherData={teacherData} />;
      case 'events':
        return <TeacherEvents teacherData={teacherData} />;
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
      case 'support':
        return <TeacherSupport teacherData={teacherData} />;
      default:
        return <TeacherDashboard teacherData={teacherData} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      {/* Header */}
      <div className="relative z-[100] bg-background/95 backdrop-blur-sm border-b border-white/10 sticky top-0">
        <div className="container px-4 mx-auto">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-9 w-9 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="sr-only">Toggle sidebar</span>
                <div className="w-4 h-4 flex flex-col space-y-1">
                  <div className="w-full h-0.5 bg-foreground"></div>
                  <div className="w-full h-0.5 bg-foreground"></div>
                  <div className="w-full h-0.5 bg-foreground"></div>
                </div>
              </Button>
              <h1 className="text-2xl font-bold text-foreground">ColCord</h1>
              <div className="hidden sm:flex items-center space-x-2">
                <div className="h-6 w-px bg-white/20"></div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-role-teacher rounded-full animate-pulse-indicator"></div>
                  <span className="text-lg font-medium text-foreground">Teacher Portal</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {!isMobile && (
                <span className="text-sm text-muted-foreground">
                  Welcome, Prof. {teacherData.first_name} {teacherData.last_name}
                </span>
              )}
              
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
                  <div className="fixed right-4 top-20 w-80 sm:w-96 bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999]">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
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
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-muted-foreground">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors ${
                              !notification.read ? 'bg-white/5' : ''
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
                                    <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
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
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <User className="h-5 w-5 text-foreground" />
                </Button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="fixed right-4 top-20 w-64 bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999]">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 bg-role-teacher/20 rounded-full flex items-center justify-center">
                          <UserCircle className="h-8 w-8 text-role-teacher" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            Prof. {teacherData.first_name} {teacherData.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {teacherData.email}
                          </p>
                          <p className="text-xs text-role-teacher font-medium">
                            Faculty Member
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      
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
                        className="w-full justify-start text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
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

      {/* Main Layout */}
      <div className="relative z-10 flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <SidebarNavigation
          items={sidebarItems}
          activeItem={activeView}
          onItemClick={setActiveView}
          userType="faculty"
          collapsed={sidebarCollapsed || isMobile}
        />

        {/* Main Content */}
        <div className={`flex-1 p-3 sm:p-6 ${isMobile ? 'ml-0' : ''}`}>
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