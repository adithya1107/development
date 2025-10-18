import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import {
  BookOpen,
  Calendar,
  MessageSquare,
  CreditCard,
  Building,
  HelpCircle,
  GraduationCap,
  Clock,
  FileText,
  Bell,
  Menu, // ADD THIS
  Sun,
  Settings,
  User,
  Sparkle,
  LogOut,
  Mail,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Award,
  TrendingUp,
  UserCircle,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SidebarNavigation from '@/components/layout/SidebarNavigation';
import StudentDashboard from '@/components/student/StudentDashboard';
import ScheduleTimetable from '@/components/student/ScheduleTimetable';
import AttendanceOverview from '@/components/student/AttendanceOverview';
import CoursesLearningSnapshot from '@/components/student/CoursesLearningSnapshot';
import CalendarAttendance from '@/components/student/Events';
import CommunicationCenter from '@/components/student/CommunicationCenter';
import PaymentsFees from '@/components/student/PaymentsFeesIntegrated';
import HostelFacility from '@/components/student/HostelFacility';
import SupportHelp from '@/components/student/SupportHelp';
import { supabase } from '@/integrations/supabase/client';
import QuizTaker from '@/components/student/QuizTaker';
import StudentGrades from '@/components/student/StudentGrades';
import Events from '@/components/student/Events';
import Chatbot from '@/components/student/Chatbot';
import MarketplaceApp from '@/components/student/Marketplace';
import Anouncements from '@/components/student/Anouncements';

const Student = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // ADD THIS
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const navigate = useNavigate();

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Mock notifications data
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'warning',
      title: 'Assignment Due',
      message: 'Math assignment due tomorrow at 11:59 PM',
      time: '1 hour ago',
      read: false
    },
    {
      id: 2,
      type: 'info',
      title: 'New Quiz Available',
      message: 'Physics quiz is now available in your courses',
      time: '3 hours ago',
      read: false
    },
    {
      id: 3,
      type: 'success',
      title: 'Grade Updated',
      message: 'Your Chemistry exam grade has been posted',
      time: '1 day ago',
      read: false
    },
    {
      id: 4,
      type: 'warning',
      title: 'Low Attendance',
      message: 'Your attendance in History is below 75%',
      time: '2 days ago',
      read: true
    },
    {
      id: 5,
      type: 'info',
      title: 'Library Book Due',
      message: 'Return "Advanced Mathematics" by Friday',
      time: '3 days ago',
      read: true
    }
  ]);

  // UPDATED: Check for mobile view
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

  // Handle clicks outside dropdowns
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

          if (profile.user_type !== 'student') {
            toast({
              title: 'Access Denied',
              description: 'This area is for students only.',
              variant: 'destructive',
            });
            navigate('/');
            return;
          }

          setStudentData({
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
          if (parsedUser.user_type !== 'student') {
            toast({
              title: 'Access Denied',
              description: 'This area is for students only.',
              variant: 'destructive',
            });
            navigate('/');
            return;
          }

          setStudentData(parsedUser);
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
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Handler for navigating to chat from marketplace
  const handleNavigateToChat = (channelId) => {
    setSelectedChannelId(channelId);
    setActiveView('communication');
    toast({
      title: 'Opening Chat',
      description: 'Redirecting you to the conversation...',
    });
  };

  // ADD THIS: Handle sidebar toggle
  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-role-student" />
      </div>
    );
  }

  if (!studentData) {
    return null;
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'chatbot', label: 'Chatbot', icon: Bot },
    { id: 'quizzes', label: 'Quizzes', icon: Sparkle },
    { id: 'gradebook', label: 'Gradebook', icon: FileText },
    { id: 'events', label: 'Events', icon: Bell },
    { id: 'marketplace', label: 'Marketplace', icon: Award },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'announcements', label: 'Anouncements', icon: Mail },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'hostel', label: 'Hostel', icon: Building },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const isFullWidthView = () => {
    // Pages that handle their own padding and spacing internally
    const fullWidthPages = ['dashboard', 'courses'];
    return fullWidthPages.includes(activeView);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <StudentDashboard studentData={studentData} onNavigate={setActiveView} />;
      case 'schedule':
        return <ScheduleTimetable studentData={studentData} />;
      case 'attendance':
        return <AttendanceOverview studentData={studentData} />;
      case 'courses':
        return <CoursesLearningSnapshot studentData={studentData} />;
      case 'chatbot':
        return <Chatbot />;
      case 'quizzes':
        return <QuizTaker />;
      case 'gradebook':
        return <StudentGrades />;
      case 'events':
        return <Events studentData={studentData} />;
      case 'marketplace':
        return <MarketplaceApp onNavigateToChat={handleNavigateToChat} />;
      case 'communication':
        return <CommunicationCenter studentData={studentData} initialChannelId={selectedChannelId} />;
      case 'announcements':
        return <Anouncements studentData={studentData} />;
      case 'payments':
        return <PaymentsFees studentData={studentData} />;
      case 'hostel':
        return <HostelFacility studentData={studentData} />;
      case 'support':
        return <SupportHelp studentData={studentData} />;
      default:
        return <StudentDashboard studentData={studentData} />;
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-[100] bg-background/95 backdrop-blur-sm border-b border-white/10 sticky top-0">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex justify-between items-center h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-3 sm:space-x-6">
              {/* UPDATED: Sidebar Toggle */}
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
                    <div className="h-2 w-2 bg-role-student rounded-full animate-pulse-indicator"></div>
                    <span className="text-sm sm:text-lg font-medium text-foreground">Student Portal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Greeting (Hidden on Mobile) */}
              <span className="hidden lg:block text-sm text-muted-foreground truncate max-w-[350px]">
                Welcome, {studentData.first_name} {studentData.last_name}
              </span>

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
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <User className="h-5 w-5 text-foreground" />
                </Button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="fixed right-3 sm:right-4 top-20 w-60 sm:w-64 bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999]">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 sm:h-12 w-10 sm:w-12 bg-role-student/20 rounded-full flex items-center justify-center">
                          <UserCircle className="h-6 sm:h-8 w-6 sm:w-8 text-role-student" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {studentData.first_name} {studentData.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {studentData.email}
                          </p>
                          <p className="text-xs text-role-student font-medium">Student</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 space-y-1">
                      {[
                        { icon: BookOpen, label: "My Courses", view: "courses" },
                        { icon: TrendingUp, label: "My Grades", view: "gradebook" },
                        { icon: Calendar, label: "My Attendance", view: "attendance" },
                        { icon: Clock, label: "My Schedule", view: "schedule" },
                        { icon: Settings, label: "Settings & Support", view: "support" },
                      ].map(({ icon: Icon, label, view }) => (
                        <Button
                          key={view}
                          variant="ghost"
                          onClick={() => {
                            setShowUserMenu(false);
                            setActiveView(view);
                          }}
                          className="w-full justify-start text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          {label}
                        </Button>
                      ))}

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
        {/* UPDATED: Sidebar */}
        <SidebarNavigation
          items={sidebarItems}
          activeItem={activeView}
          onItemClick={setActiveView}
          userType="student"
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div className={`flex-1 w-full min-w-0 transition-all duration-300 ease-in-out ${isFullWidthView() ? '' : 'p-3 sm:p-6'}`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Student;