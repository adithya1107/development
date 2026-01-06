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
  Menu,
  Users,
  Sun,
  Settings,
  User,
  UserCircle,
  Sparkle,
  LogOut,
  Mail,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Award,
  TrendingUp,
  Bot,
  ShoppingBag,
  Briefcase
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

// Import tag-based access control
import { useUserTags } from '@/hooks/useUserTags';
import StudentDepartment from '@/components/student/StudentDepartment';

// Import dynamic feature loader
import { loadUserFeatures, featuresToSidebarItems } from '../lib/FeatureLoader';
import PlacementManagement from '@/components/admin/PlacementManagement';
import StudentPlacement from '@/components/student/StudentPlacement';

// Type definitions
type Notification = {
  id: string;
  recipient_id: string;
  title: string;
  content: string;
  notification_type: 'success' | 'warning' | 'error' | 'info';
  is_read: boolean;
  created_at: string;
  [key: string]: any;
};

export type StudentData = {
  user_id: string;
  user_type: string;
  first_name: string;
  last_name: string;
  college_id: string;
  user_code: string;
  email: string;
};

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  route?: string;
  enabled?: boolean;
  order?: number;
}

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
  const [availableFeatureKeys, setAvailableFeatureKeys] = useState<Set<string>>(new Set());
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);

  // Initialize user tags hook for access control
  const { tags: userTags, loading: tagsLoading, hasTag, hasAnyTag } = useUserTags(studentData?.user_id || null);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
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

  // NEW: Load dynamic features from database
  useEffect(() => {
    const loadDynamicFeatures = async () => {
      if (!studentData?.college_id) return;
      
      try {
        setIsLoadingFeatures(true);
        console.log('Loading features for student:', studentData.user_id);
        
        // Load features from database
        const features = await loadUserFeatures(studentData.college_id, 'student');
        
        if (features.length === 0) {
          console.warn('No features configured, using defaults');
          setSidebarItems(getDefaultStudentFeatures());
          setAvailableFeatureKeys(new Set(['dashboard', 'schedule', 'attendance', 'courses', 'communication', 'support']));
        } else {
          // Convert features to sidebar items
          const items = featuresToSidebarItems(features);
          
          // Add club feature if user has club tags
          const hasClubAccess = hasAnyTag(['club_president', 'club_member', 'club_secretary', 'club_treasurer']);
          if (hasClubAccess) {
            const clubFeature = features.find(f => f.feature_key === 'clubs');
            if (clubFeature && !items.find(i => i.id === 'clubs')) {
              items.push({
                id: 'clubs',
                label: 'Club Activities',
                icon: Users,
                enabled: true,
                order: items.length
              });
            }
          }

          // Add department feature if user is class representative
          const hasDepartmentAccess = hasTag('class_representative');
          if (hasDepartmentAccess) {
            const deptFeature = features.find(f => f.feature_key === 'department');
            if (deptFeature && !items.find(i => i.id === 'department')) {
              items.push({
                id: 'department',
                label: 'Department',
                icon: Building,
                enabled: true,
                order: items.length
              });
            }
          }
          
          setSidebarItems(items.sort((a, b) => (a.order || 0) - (b.order || 0)));
          
          const featureKeys = new Set(features.map(f => f.feature_key));
          if (hasClubAccess) featureKeys.add('clubs');
          if (hasDepartmentAccess) featureKeys.add('department');
          setAvailableFeatureKeys(featureKeys);
          
          console.log(`Loaded ${items.length} features for student`);
        }
      } catch (error) {
        console.error('Error loading features:', error);
        toast({
          title: "Error Loading Features",
          description: "Using default features",
          variant: "destructive"
        });
        setSidebarItems(getDefaultStudentFeatures());
      } finally {
        setIsLoadingFeatures(false);
      }
    };

    if (studentData?.college_id) {
      loadDynamicFeatures();
    }
  }, [studentData?.college_id, userTags, tagsLoading]);

  // Fallback default features
  const getDefaultStudentFeatures = (): SidebarItem[] => {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: GraduationCap, enabled: true, order: 0 },
      { id: 'schedule', label: 'Schedule', icon: Clock, enabled: true, order: 1 },
      { id: 'attendance', label: 'Attendance', icon: Calendar, enabled: true, order: 2 },
      { id: 'courses', label: 'Courses', icon: BookOpen, enabled: true, order: 3 },
      { id: 'quizzes', label: 'Quizzes', icon: Sparkle, enabled: true, order: 4 },
      { id: 'gradebook', label: 'Gradebook', icon: FileText, enabled: true, order: 5 },
      { id: 'cgpa', label: 'CGPA', icon: TrendingUp, enabled: true, order: 6 },
      { id: 'events', label: 'Events', icon: Bell, enabled: true, order: 7 },
      { id: 'placements', label: 'Placements', icon: Briefcase, enabled: true, order: 8 },
      { id: 'clubs', label: 'Clubs', icon: Users, enabled: true, order: 8 },
      { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, enabled: true, order: 8 },
      { id: 'furlong', label: 'Furlong', icon: Sun, enabled: true, order: 9 },
      { id: 'communication', label: 'Communication', icon: MessageSquare, enabled: true, order: 10 },
      { id: 'announcements', label: 'Announcements', icon: Mail, enabled: true, order: 11 },
      { id: 'hostel', label: 'Hostel', icon: Building, enabled: true, order: 12 },
      { id: 'support', label: 'Support', icon: HelpCircle, enabled: true, order: 13 },
    ];
  };

  // NEW: Check if a feature is available
  const isFeatureAvailable = (featureKey: string): boolean => {
    if (isLoadingFeatures) return true;
    if (availableFeatureKeys.size === 0) return true;
    return availableFeatureKeys.has(featureKey);
  };

  // Real-time notification handling
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
      toast({ 
        title: "Error", 
        description: "Could not update notification.", 
        variant: "destructive"
      });
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
      toast({ 
        title: "Error", 
        description: "Failed to clear notifications.", 
        variant: "destructive"
      });
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

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleProfileIconClick = () => {
    console.log('Profile icon clicked! Setting view to profile...');
    setShowUserMenu(false);
    setActiveView('profile');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // NEW: Feature Not Available Component
  const FeatureNotAvailable = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <AlertCircle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Feature Not Available</h2>
        <p className="text-muted-foreground mb-4">
          This feature is currently disabled by your institution.
        </p>
        <Button onClick={() => setActiveView('dashboard')} variant="outline">
          Return to Dashboard
        </Button>
      </div>
    </div>
  );

  // MODIFIED: renderContent with feature availability checks
  const renderContent = () => {
    // Check tag requirements
    const hasClubAccess = hasAnyTag(['club_president', 'club_member', 'club_secretary', 'club_treasurer']);
    const hasDepartmentAccess = hasTag('class_representative');
    const isClubPresident = hasTag('club_president');

    // Check if current view is available
    if (!isFeatureAvailable(activeView) && activeView !== 'profile') {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Feature Not Available</h2>
            <p className="text-muted-foreground mb-4">
              This feature is not currently enabled for students.
            </p>
            <Button onClick={() => setActiveView('dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <StudentDashboard studentData={studentData} onNavigate={setActiveView} />;
      
      case 'schedule':
        return isFeatureAvailable('schedule') 
          ? <ScheduleTimetable studentData={studentData} />
          : <FeatureNotAvailable />;
      
      case 'attendance':
        return isFeatureAvailable('attendance')
          ? <AttendanceOverview studentData={studentData} />
          : <FeatureNotAvailable />;
      
      case 'courses':
        return isFeatureAvailable('courses')
          ? <CoursesLearningSnapshot studentData={studentData} />
          : <FeatureNotAvailable />;
      
      case 'quizzes':
        return isFeatureAvailable('quizzes')
          ? <QuizTaker />
          : <FeatureNotAvailable />;
      
      case 'gradebook':
        return isFeatureAvailable('gradebook')
          ? <StudentGrades />
          : <FeatureNotAvailable />;
      
      case 'cgpa':
        return isFeatureAvailable('cgpa')
          ? <StudentCGPADashboard studentData={studentData} />
          : <FeatureNotAvailable />;
      
      case 'events':
        return isFeatureAvailable('events')
          ? <Events studentData={studentData} />
          : <FeatureNotAvailable />;

      case 'placements':
        return isFeatureAvailable('placements')
          ? <StudentPlacement studentData={studentData} />
          : <FeatureNotAvailable />;

      case 'marketplace':
        return isFeatureAvailable('marketplace')
          ? <MarketplaceApp onNavigateToChat={handleNavigateToChat} />
          : <FeatureNotAvailable />;
      
      case 'furlong':
        return isFeatureAvailable('furlong')
          ? <Furlong />
          : <FeatureNotAvailable />;
      
      case 'clubs':
        if (!hasClubAccess) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-semibold">Access Restricted</h3>
                <p className="text-muted-foreground max-w-md">
                  You need to be a club member to access this feature.
                  Contact your club advisor for membership.
                </p>
              </div>
            </div>
          );
        }
        return (
          <ClubActivityCenter 
            studentData={studentData} 
            userTags={userTags}
            isPresident={isClubPresident}
          />
        );
      
      case 'department':
        if (!hasDepartmentAccess) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-semibold">Access Restricted</h3>
                <p className="text-muted-foreground max-w-md">
                  Only class representatives can access the department section.
                </p>
              </div>
            </div>
          );
        }
        return <StudentDepartment studentData={studentData} userTags={userTags} />;
      
      case 'communication':
        return isFeatureAvailable('communication')
          ? <CommunicationCenter studentData={studentData} initialChannelId={selectedChannelId} />
          : <FeatureNotAvailable />;
      
      case 'announcements':
        return isFeatureAvailable('announcements')
          ? <Anouncements studentData={studentData} />
          : <FeatureNotAvailable />;
      
      case 'hostel':
        return isFeatureAvailable('hostel')
          ? <HostelFacility studentData={studentData} />
          : <FeatureNotAvailable />;
      
      case 'support':
        return isFeatureAvailable('support')
          ? <SupportHelp studentData={studentData} />
          : <FeatureNotAvailable />;
      
      case 'profile':
        return <StudentProfile studentData={studentData} onNavigate={setActiveView} />;
      
      default:
        return <StudentDashboard studentData={studentData} onNavigate={setActiveView} />;
    }
  };

  if (loading || tagsLoading || isLoadingFeatures) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-role-student mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return null;
  }

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
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSidebarToggle}
                className="h-9 w-9 rounded-lg hover:bg-white/10 transition-all duration-200 ease-in-out"
              >
                <span className="sr-only">Toggle sidebar</span>
                <Menu className="h-7 w-7" />
              </Button>

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
              
              {/* User Menu */}
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
                        { icon: User, label: "Student Information", view: "profile" },
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
        {/* Sidebar - NOW USES DYNAMIC ITEMS */}
        <SidebarNavigation
          items={sidebarItems}
          activeItem={activeView}
          onItemClick={(item) => {
            if (isFeatureAvailable(item)) {
              setActiveView(item);
              if (isMobile) {
                setMobileMenuOpen(false);
              }
            } else {
              toast({
                title: "Feature Not Available",
                description: "This feature is not currently enabled.",
                variant: "destructive"
              });
            }
          }}
          userType="student"
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div className={cn(
          "flex-1 w-full min-w-0 transition-all duration-300 ease-in-out",
          "px-4 py-4 sm:px-12 sm:py-6 mx-auto",
          sidebarCollapsed ? "md:ml-16" : "md:ml-48",
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