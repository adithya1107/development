import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import {
  BookOpen, Calendar, MessageSquare, CreditCard, Building, HelpCircle,
  GraduationCap, Clock, FileText, Bell, Settings, User, Sparkle,
  LogOut, Mail, AlertCircle, CheckCircle, Info, X, Award,
  TrendingUp, UserCircle, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SidebarNavigation from '@/components/layout/SidebarNavigation';
import StudentDashboard from '@/components/student/StudentDashboard';
import ScheduleTimetable from '@/components/student/ScheduleTimetable';
import AttendanceOverview from '@/components/student/AttendanceOverview';
import CoursesLearningSnapshot from '@/components/student/CoursesLearningSnapshot';
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

// NEW: Added TypeScript type for a single notification
type Notification = {
  id: string;
  recipient_id: string;
  title: string;
  content: string;
  notification_type: 'success' | 'warning' | 'error' | 'info';
  is_read: boolean;
  created_at: string;
  [key: string]: any; // Allows for other properties not strictly typed
};

// NEW: Added TypeScript type for student data
type StudentData = {
  user_id: string;
  user_type: string;
  first_name: string;
  last_name: string;
  college_id: string;
  user_code: string;
  email: string;
};

const Student = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const navigate = useNavigate();

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check user authentication and profile
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.user_type === 'student') {
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
            navigate('/');
          }
        } else {
          navigate('/');
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

  // Real-time notification handling from Supabase
  useEffect(() => {
    if (!studentData?.user_id) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', studentData.user_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data as Notification[] || []);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${studentData.user_id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          toast({
            title: newNotification.title,
            description: newNotification.content,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${studentData.user_id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentData?.user_id]);

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

  const markNotificationAsRead = async (notificationId: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      )
    );
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      toast({ title: "Error", description: "Could not update notification.", variant: "destructive"});
    }
  };

  const clearAllNotifications = async () => {
    if (!studentData) return;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', studentData.user_id);

    if (error) {
      console.error('Error clearing notifications:', error);
      toast({ title: "Error", description: "Failed to clear notifications.", variant: "destructive"});
    } else {
      setNotifications([]);
      setShowNotifications(false);
      toast({
        title: 'Notifications Cleared',
        description: 'All notifications have been cleared.',
      });
    }
  };

  const getNotificationIcon = (type: string) => {
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

  const handleNavigateToChat = (channelId: string) => {
    setSelectedChannelId(channelId);
    setActiveView('communication');
    toast({
      title: 'Opening Chat',
      description: 'Redirecting you to the conversation...',
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <StudentDashboard studentData={studentData} onNavigate={setActiveView}/>;
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
    <div className="min-h-screen bg-background">
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
                  <div className="h-2 w-2 bg-role-student rounded-full animate-pulse-indicator"></div>
                  <span className="text-lg font-medium text-foreground">Student Portal</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {!isMobile && (
                <span className="text-sm text-muted-foreground">
                  Welcome, {studentData.first_name} {studentData.last_name}
                </span>
              )}
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
                              !notification.is_read ? 'bg-white/5' : ''
                            }`}
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-1">
                                {getNotificationIcon(notification.notification_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {notification.title}
                                  </p>
                                  {!notification.is_read && (
                                    <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.content}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(notification.created_at).toLocaleString()}
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
              
              {/* FIXED: Completed the User Menu JSX */}
              <div className="relative" ref={userMenuRef}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleUserMenuClick}
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <User className="h-5 w-5 text-foreground" />
                </Button>
                {showUserMenu && (
                  <div className="fixed right-4 top-20 w-64 bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999]">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 bg-role-student/20 rounded-full flex items-center justify-center">
                          <UserCircle className="h-8 w-8 text-role-student" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {studentData.first_name} {studentData.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {studentData.email}
                          </p>
                          <p className="text-xs text-role-student font-medium">
                            Student
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        onClick={() => { setShowUserMenu(false); setActiveView('courses'); }}
                        className="w-full justify-start text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
                      >
                        <BookOpen className="h-4 w-4 mr-3" /> My Courses
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setShowUserMenu(false); setActiveView('gradebook'); }}
                        className="w-full justify-start text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
                      >
                        <TrendingUp className="h-4 w-4 mr-3" /> My Grades
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setShowUserMenu(false); setActiveView('attendance'); }}
                        className="w-full justify-start text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
                      >
                        <Calendar className="h-4 w-4 mr-3" /> My Attendance
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setShowUserMenu(false); setActiveView('schedule'); }}
                        className="w-full justify-start text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
                      >
                        <Clock className="h-4 w-4 mr-3" /> My Schedule
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setShowUserMenu(false); setActiveView('support'); }}
                        className="w-full justify-start text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
                      >
                        <Settings className="h-4 w-4 mr-3" /> Settings & Support
                      </Button>
                      <div className="h-px bg-white/10 my-2"></div>
                      <Button
                        variant="ghost"
                        onClick={() => { setShowUserMenu(false); handleLogout(); }}
                        className="w-full justify-start text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                      >
                        <LogOut className="h-4 w-4 mr-3" /> Logout
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)]">
        <SidebarNavigation
          items={sidebarItems}
          activeItem={activeView}
          onItemClick={setActiveView}
          userType="student"
          collapsed={sidebarCollapsed || isMobile}
        />
        <div className={`flex-1 p-3 sm:p-6 ${isMobile ? 'ml-0' : ''}`}>
          {renderContent()}
        </div>
      </div>
      
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-[90] md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};

export default Student;