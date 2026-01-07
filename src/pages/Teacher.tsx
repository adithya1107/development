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
  Building2Icon,
  Shield,
  AlertCircle
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

// Import dynamic feature loader
import { loadUserFeatures, featuresToSidebarItems } from '../lib/FeatureLoader';

// Import tag-based access control
import { useUserTags } from '@/hooks/useUserTags';

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  route?: string;
  enabled?: boolean;
  order?: number;
}

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

  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
  const [availableFeatureKeys, setAvailableFeatureKeys] = useState<Set<string>>(new Set());
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);

  // Initialize user tags hook for access control
  const { tags: userTags, loading: tagsLoading, hasTag, hasAnyTag } = useUserTags(teacherData?.user_id || null);

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

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
    }
  ]);

  // Check if mobile view
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

  // Fallback default features
  const getDefaultFacultyFeatures = (): SidebarItem[] => {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: GraduationCap, enabled: true, order: 0 },
      { id: 'schedule', label: 'Schedule', icon: Calendar, enabled: true, order: 1 },
      { id: 'courses', label: 'Course & Quiz', icon: BookOpen, enabled: true, order: 2 },
      { id: 'gradebook', label: 'Grading', icon: ClipboardList, enabled: true, order: 3 },
      { id: 'cgpa', label: 'CGPA Calculator', icon: GraduationCap, enabled: true, order: 4 },
      { id: 'extra-classes', label: 'Extra Classes', icon: PlusCircleIcon, enabled: true, order: 5 },
      { id: 'events', label: 'Events', icon: Calendar, enabled: true, order: 6 },
      { id: 'performance', label: 'Student Performance', icon: TrendingUp, enabled: true, order: 7 },
      { id: 'communication', label: 'Communication', icon: MessageSquare, enabled: true, order: 8 },
      { id: 'parent-interaction', label: 'Parent Interaction', icon: Users, enabled: true, order: 9 },
      { id: 'absence', label: 'Absence Review', icon: Users, enabled: true, order: 10 },
      { id: 'recognition', label: 'Recognition & Feedback', icon: Award, enabled: true, order: 11 },
      { id: 'department', label: 'Department', icon: Building2Icon, enabled: true, order: 12 },
      { id: 'clubs', label: 'Club Advisor', icon: PlusCircle, enabled: true, order: 13 },
      { id: 'support', label: 'Support & Helpdesk', icon: HelpCircle, enabled: true, order: 13 },
    ];
  };

  // NEW: Check if a feature is available
  const isFeatureAvailable = (featureKey: string): boolean => {
    if (isLoadingFeatures) return true;
    if (availableFeatureKeys.size === 0) return true;
    return availableFeatureKeys.has(featureKey);
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          navigate('/');
          return;
        }

        if (session?.user) {
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

  useEffect(() => {
    const loadDynamicFeatures = async () => {
      if (!teacherData?.college_id) return;
      
      try {
        setIsLoadingFeatures(true);
        console.log('Loading features for teacher:', teacherData.user_id);
        
        // FIXED: Use .contains() for array filtering instead of .eq() with array literal
        const { data: featuresData, error: featuresError } = await supabase
          .from('feature_configurations')
          .select(`
            *,
            feature_definitions (
              feature_key,
              feature_name,
              icon_name,
              description
            )
          `)
          .eq('college_id', teacherData.college_id)
          .contains('target_user_types', ['faculty'])
          .eq('is_enabled', true)
          .order('display_order', { ascending: true });

        if (featuresError) throw featuresError;
        
        if (!featuresData || featuresData.length === 0) {
          console.warn('No features configured, using defaults');
          setSidebarItems(getDefaultFacultyFeatures());
          setAvailableFeatureKeys(new Set(['dashboard', 'schedule', 'courses', 'communication', 'support']));
        } else {
          // Import all lucide-react icons dynamically
          const iconMap = {
            GraduationCap, Calendar, BookOpen, ClipboardList, Users, MessageSquare,
            FileText, TrendingUp, Award, HelpCircle, PlusCircleIcon, Building2Icon, PlusCircle
          };

          // Convert features to sidebar items with icons from feature_definition
          const items = featuresData.map((feature) => {
            const iconName = feature.feature_definitions?.icon_name || 'GraduationCap';
            const IconComponent = iconMap[iconName] || GraduationCap;
            
            return {
              id: feature.feature_definitions?.feature_key || feature.feature_key,
              label: feature.feature_definitions?.feature_name || feature.feature_key,
              icon: IconComponent,
              enabled: feature.is_enabled,
              order: feature.display_order
            };
          });
          
          // Check if user has any tags with context_name 'club'
          const hasClubTags = userTags.some(tag => tag.context_name === 'club');
          if (hasClubTags) {
            const clubFeatureData = featuresData.find(f => f.feature_definitions?.feature_key === 'clubs');
            if (clubFeatureData && !items.find(i => i.id === 'clubs')) {
              const iconName = clubFeatureData.feature_definitions?.icon_name || 'Users';
              items.push({
                id: 'clubs',
                label: clubFeatureData.feature_definitions?.feature_name || 'Club Advisor',
                icon: iconMap[iconName] || Users,
                enabled: true,
                order: clubFeatureData.display_order || items.length
              });
            }
          }
          
          // Check if user has any tags with context_name 'department'
          const hasDepartmentTags = userTags.some(tag => tag.context_name === 'department');
          if (hasDepartmentTags) {
            const deptFeatureData = featuresData.find(f => f.feature_definitions?.feature_key === 'department');
            if (deptFeatureData && !items.find(i => i.id === 'department')) {
              const iconName = deptFeatureData.feature_definitions?.icon_name || 'Building2Icon';
              items.push({
                id: 'department',
                label: deptFeatureData.feature_definitions?.feature_name || 'Department',
                icon: iconMap[iconName] || Building2Icon,
                enabled: true,
                order: deptFeatureData.display_order || items.length
              });
            }
          }
          
          setSidebarItems(items.sort((a, b) => (a.order || 0) - (b.order || 0)));
          
          const featureKeys = new Set(featuresData.map(f => f.feature_definitions?.feature_key || f.feature_key));
          if (hasClubTags) featureKeys.add('clubs');
          if (hasDepartmentTags) featureKeys.add('department');
          setAvailableFeatureKeys(featureKeys);
          
          console.log(`Loaded ${items.length} features for teacher`);
        }
      } catch (error) {
        console.error('Error loading features:', error);
        toast({
          title: "Error Loading Features",
          description: "Using default features",
          variant: "destructive"
        });
        setSidebarItems(getDefaultFacultyFeatures());
      } finally {
        setIsLoadingFeatures(false);
      }
    };

    if (teacherData?.college_id && !tagsLoading) {
      loadDynamicFeatures();
    }
  }, [teacherData?.college_id, userTags, tagsLoading]);

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

  // NEW: Feature Not Available Component
  const FeatureNotAvailable = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Shield className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
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

  // MODIFIED: renderContent with feature availability checks and tag-based access
  const renderContent = () => {
    const hasClubAdvisorAccess = hasTag('club_advisor');
    const hasDepartmentAccess = hasAnyTag(['hod', 'department_member']);
    const isHOD = hasTag('hod');

    if (!isFeatureAvailable(activeView)) {
      return <FeatureNotAvailable />;
    }

    switch (activeView) {
      case 'dashboard':
        return <TeacherDashboard teacherData={teacherData} onNavigate={setActiveView} />;
      
      case 'schedule':
        return isFeatureAvailable('schedule')
          ? <TeacherSchedule teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'courses':
        return isFeatureAvailable('courses')
          ? <TeacherCourses teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'gradebook':
        return isFeatureAvailable('gradebook')
          ? <GradeManager />
          : <FeatureNotAvailable />;
      
      case 'cgpa':
        return isFeatureAvailable('cgpa')
          ? <TeacherCGPAManagement teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'extra-classes':
        return isFeatureAvailable('extra-classes')
          ? <TeacherExtra teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'events':
        return isFeatureAvailable('events')
          ? <TeacherEvents teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'clubs':
        if (!hasClubAdvisorAccess) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-semibold">Access Restricted</h3>
                <p className="text-muted-foreground max-w-md">
                  You need to be assigned as a club advisor to access this feature.
                </p>
              </div>
            </div>
          );
        }
        return <ClubAdvisor teacherData={teacherData} userTags={userTags} />;
      
      case 'performance':
        return isFeatureAvailable('performance')
          ? <TeacherPerformance teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'communication':
        return isFeatureAvailable('communication')
          ? <TeacherCommunication teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'parent-interaction':
        return isFeatureAvailable('parent-interaction')
          ? <TeacherParentInteraction teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'absence':
        return isFeatureAvailable('absence')
          ? <TeacherCalendarAttendance teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'documents':
        return isFeatureAvailable('documents')
          ? <TeacherDocuments teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'recognition':
        return isFeatureAvailable('recognition')
          ? <TeacherRecognition teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      case 'department':
        if (!hasDepartmentAccess) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-semibold">Access Restricted</h3>
                <p className="text-muted-foreground max-w-md">
                  You need to be a department member to access this feature.
                </p>
              </div>
            </div>
          );
        }
        return (
          <TeacherDepartment 
            teacherData={teacherData} 
            userTags={userTags}
            isHOD={isHOD}
          />
        );
      
      case 'support':
        return isFeatureAvailable('support')
          ? <TeacherSupport teacherData={teacherData} />
          : <FeatureNotAvailable />;
      
      default:
        return <TeacherDashboard teacherData={teacherData} />;
    }
  };

  if (loading || tagsLoading || isLoadingFeatures) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-role-teacher mx-auto" />
          <p className="mt-4 text-muted-foreground">
            {loading ? 'Loading faculty portal...' : tagsLoading ? 'Loading permissions...' : 'Loading features...'}
          </p>
        </div>
      </div>
    );
  }

  if (!teacherData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* Header */}
      <div className="fixed w-full z-[100] bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex justify-between items-center h-16">
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
                    <div className="h-2 w-2 bg-role-teacher rounded-full animate-pulse-indicator"></div>
                    <span className="text-sm sm:text-lg font-medium text-foreground">Faculty Portal</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
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

              <div className="relative" ref={userMenuRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUserMenuClick}
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-all will-change-transform"
                >
                  <User className="h-9 w-9 text-foreground" />
                </Button>

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
          userType="faculty"
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

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

export default Teacher;