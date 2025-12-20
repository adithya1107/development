import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import { cn } from '@/lib/utils';
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
  Menu,  Users,
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
import ClubActivityCenter from '@/components/student/ClubActivityCenter';
import StudentProfile from '@/pages/student_profile.tsx';
import Furlong from '@/components/student/Furlong';
import StudentCGPADashboard from '@/components/student/StudentCGPADashboard';

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
export type StudentData = {
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
  const [hasClubAccess, setHasClubAccess] = useState(false);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Check for mobile view
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

  // Function to check if user has club access
  const checkClubAccess = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_tag_assignments')
        .select(`
          tag_id,
          user_tags (
            tag_name,
            tag_category
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching club access:', error);
        setHasClubAccess(false);
        return;
      }


      // Check if any tag has category 'club'
      const hasClubTags = data?.some(
        assignment => assignment.user_tags?.tag_category === 'student_role'
      );

      setHasClubAccess(hasClubTags || false);
    } catch (error) {
      console.error('Error checking club access:', error);
      setHasClubAccess(false);
    }
  };

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
            const userData = {
              user_id: profile.id,
              user_type: profile.user_type,
              first_name: profile.first_name,
              last_name: profile.last_name,
              college_id: profile.college_id,
              user_code: profile.user_code,
              email: profile.email
            };
            setStudentData(userData);
            
            // NEW: Check club access after setting student data
            await checkClubAccess(profile.id);
            
            // Fetch profile photo
            const { data: studentProfile } = await supabase
              .from('student')
              .select('photo_path')
              .eq('id', profile.id)
              .single();
            
            if (studentProfile?.photo_path) {
              const { data: signedUrl } = await supabase.storage
                .from('profile_photo')
                .createSignedUrl(studentProfile.photo_path, 60 * 60);
              if (signedUrl) {
                setProfilePhotoUrl(signedUrl.signedUrl);
              }
            }
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
    // { id: 'chatbot', label: 'Chatbot', icon: Bot },
    { id: 'quizzes', label: 'Quizzes', icon: Sparkle },
    { id: 'gradebook', label: 'Gradebook', icon: FileText },
    { id: 'cgpa', label: 'CGPA', icon: TrendingUp },
    { id: 'events', label: 'Events', icon: Bell },
    { id: 'marketplace', label: 'Marketplace', icon: Award },
    { id: 'furlong', label: 'Furlong', icon: Sun },
    // NEW: Conditionally add club activity center
    ...(hasClubAccess ? [{ id: 'clubs', label: 'Club Activities', icon: Users }] : []),
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'announcements', label: 'Anouncements', icon: Mail },
    // { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'hostel', label: 'Hostel', icon: Building },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const isFullWidthView = () => {
    // Pages that handle their own padding and spacing internally
    const fullWidthPages = ['dashboard', 'courses', 'profile'];
    return fullWidthPages.includes(activeView);
  };

  // NEW: Handler for the profile icon click
  // REPLACE your old function with this:
   // REPLACE your old function with this new version:
   const handleProfileIconClick = () => {
    console.log('Profile icon clicked! Setting view to profile...');
    setShowUserMenu(false); // This closes the small dropdown
    setActiveView('profile'); // This sets the main content to the profile page
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
      // case 'chatbot':
      //   return <Chatbot />;
      case 'quizzes':
        return <QuizTaker />;
      case 'gradebook':
        return <StudentGrades />;
      case 'cgpa':
        return <StudentCGPADashboard studentData={studentData} />;
      case 'events':
        return <Events studentData={studentData} />;
      case 'marketplace':
        return <MarketplaceApp onNavigateToChat={handleNavigateToChat} />;
      case 'furlong':
        return <Furlong studentData={studentData} />;
      // NEW: Club activity center case
      case 'clubs':
        return hasClubAccess ? <ClubActivityCenter studentData={studentData} /> : <StudentDashboard studentData={studentData} onNavigate={setActiveView}/>;
      case 'communication':
        return <CommunicationCenter studentData={studentData} initialChannelId={selectedChannelId} />;
      case 'announcements':
        return <Anouncements studentData={studentData} />;
      // case 'payments':
      //   return <PaymentsFees studentData={studentData} />;
      case 'hostel':
        return <HostelFacility studentData={studentData} />;
      case 'support':
        return <SupportHelp studentData={studentData} />;
      case 'profile':
        return <StudentProfile studentData={studentData} onNavigate={setActiveView} />;
      default:
        return <StudentDashboard studentData={studentData} onNavigate={setActiveView}/>;
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
                                    <div className="h-2 w-2 bg-blue-500 rounded-full ml-2"></div>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
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
              
              <div className="relative" ref={userMenuRef}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleUserMenuClick}
                  className="h-9 w-9 rounded-full hover:bg-white/10 transition-colors p-0 overflow-hidden !rounded-full"
                >
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt="Profile"
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    <User className="h-5 w-5 text-foreground" />
                  )}
                </Button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="fixed right-3 sm:right-4 top-20 w-60 sm:w-64 bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999]">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">

                        <button
                          type="button"
                          onClick={handleProfileIconClick}
                          className="h-10 sm:h-12 w-10 sm:w-12 rounded-full overflow-hidden transition-all duration-200 ease-in-out hover:ring-2 hover:ring-role-student active:scale-95 focus:outline-none focus:ring-2 focus:ring-role-student focus:ring-offset-2 focus:ring-offset-background"
                        >
                          {profilePhotoUrl ? (
                            <img
                              src={profilePhotoUrl}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-role-student/20 flex items-center justify-center">
                              <UserCircle className="h-6 sm:h-8 w-6 sm:w-8 text-role-student" />
                            </div>
                          )}
                        </button>
                        
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
      <div className="relative z-10 flex mt-[64px] min-h-[calc(100vh-4rem)]">
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
        <div className={cn(
          "flex-1 w-full min-w-0 transition-all duration-300 ease-in-out",
          "px-4 py-4 sm:px-12 sm:py-6 mx-auto",
          sidebarCollapsed ? "md:ml-16" : "md:ml-64",
        )}>
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