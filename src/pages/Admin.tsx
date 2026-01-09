import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Settings,
  Users,
  BookOpen,
  Calendar,
  DollarSign,
  FileText,
  Shield,
  Activity,
  Building,
  Bell,
  Menu,
  User,
  LogOut,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  UserCircle
} from 'lucide-react';
import SidebarNavigation from '@/components/layout/SidebarNavigation';
import AdminDashboard from '../components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';

// Import all the admin management components
import EnhancedUserManagement from '../components/admin/EnhancedUserManagement';
import CourseManagement from '../components/admin/CourseManagement';
import EventManagement from '../components/admin/EventManagement';
import FinanceManagement from '../components/admin/FinanceManagement';
import FacilityManagement from '../components/admin/FacilityManagement';
import FeatureConfig from '@/components/admin/FeatureConfig';
import RoleManagement from '../components/admin/RoleManagement';
import AuditLogs from '../components/admin/AuditLogs';
import SystemSettings from '../components/admin/SystemSettings';
import StudentEnrollmentManagement from '@/components/teacher/StudentEnrollmentManagement';
import TimetableManagement from '@/components/admin/TimetableManagement';
import DepartmentManagement from '@/components/admin/DepartmentManagement';

// Import dynamic feature loader (REMOVED - not using database features)
// import { loadUserFeatures, featuresToSidebarItems } from '../lib/FeatureLoader';
import StudentVerification from '@/components/admin/StudentVerification';
import PlacementManagement from '@/components/admin/PlacementManagement';

interface TagFeature {
  feature_key: string;
  feature_name: string;
  feature_route: string;
  icon: string;
  display_order: number;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  route?: string;
  enabled?: boolean;
  order?: number;
}

// Define feature mappings for each tag (fallback only)
const TAG_FEATURE_MAP: Record<string, TagFeature[]> = {
  super_admin: [
    { feature_key: 'dashboard', feature_name: 'Dashboard', feature_route: '/admin/dashboard', icon: 'Activity', display_order: 0 },
    { feature_key: 'users', feature_name: 'User Management', feature_route: '/admin/users', icon: 'Users', display_order: 0.2 },
    { feature_key: 'student verification', feature_name: 'Student Verification', feature_route: '/admin/student-verification', icon: 'UserCircle', display_order: 0.3 },
    { feature_key: 'department', feature_name: 'Department Management', feature_route: '/admin/department', icon: 'Building', display_order: 1 },
    { feature_key: 'courses', feature_name: 'Course Management', feature_route: '/admin/courses', icon: 'BookOpen', display_order: 1.5 },
    { feature_key: 'enrollment', feature_name: 'Enrollment Management', feature_route: '/admin/enrollment', icon: 'Users', display_order: 2 },
    { feature_key: 'timetable', feature_name: 'Timetable Management', feature_route: '/admin/timetable', icon: 'Calendar', display_order: 2.5 },
    { feature_key: 'events', feature_name: 'Event Management', feature_route: '/admin/events', icon: 'Calendar', display_order: 3 },
    { feature_key: 'placements', feature_name: 'Placement Management', feature_route: '/admin/placements', icon: 'Briefcase', display_order: 3.5 },
    { feature_key: 'finance', feature_name: 'Finance Management', feature_route: '/admin/finance', icon: 'DollarSign', display_order: 4 },
    { feature_key: 'facilities', feature_name: 'Facility Management', feature_route: '/admin/facilities', icon: 'Building', display_order: 5 },
    { feature_key: 'feature_config', feature_name: 'Feature Configuration', feature_route: '/admin/feature-config', icon: 'Settings', display_order: 5.5 },
    { feature_key: 'roles', feature_name: 'Role Management', feature_route: '/admin/roles', icon: 'Shield', display_order: 6 },
    { feature_key: 'audit', feature_name: 'Audit Logs', feature_route: '/admin/audit', icon: 'FileText', display_order: 7 },
    { feature_key: 'system', feature_name: 'System Settings', feature_route: '/admin/system', icon: 'Settings', display_order: 8 }
  ],
  user_admin: [
    { feature_key: 'dashboard', feature_name: 'Dashboard', feature_route: '/admin/dashboard', icon: 'Activity', display_order: 0 },
    { feature_key: 'users', feature_name: 'User Management', feature_route: '/admin/users', icon: 'Users', display_order: 1 },
    { feature_key: 'student verification', feature_name: 'Student Verification', feature_route: '/admin/student-verification', icon: 'UserCircle', display_order: 1.2 }
  ],
  financial_admin: [
    { feature_key: 'dashboard', feature_name: 'Dashboard', feature_route: '/admin/dashboard', icon: 'Activity', display_order: 0 },
    { feature_key: 'finance', feature_name: 'Finance Management', feature_route: '/admin/finance', icon: 'DollarSign', display_order: 4 }
  ],
  academic_admin: [
    { feature_key: 'dashboard', feature_name: 'Dashboard', feature_route: '/admin/dashboard', icon: 'Activity', display_order: 0 },
    { feature_key: 'department', feature_name: 'Department Management', feature_route: '/admin/department', icon: 'Building', display_order: 1 },
    { feature_key: 'courses', feature_name: 'Course Management', feature_route: '/admin/courses', icon: 'BookOpen', display_order: 1.5 },
    { feature_key: 'enrollment', feature_name: 'Enrollment Management', feature_route: '/admin/enrollment', icon: 'Users', display_order: 2 },
    { feature_key: 'timetable', feature_name: 'Timetable Management', feature_route: '/admin/timetable', icon: 'Calendar', display_order: 2.5 }
  ],
  event_admin: [
    { feature_key: 'dashboard', feature_name: 'Dashboard', feature_route: '/admin/dashboard', icon: 'Activity', display_order: 0 },
    { feature_key: 'events', feature_name: 'Event Management', feature_route: '/admin/events', icon: 'Calendar', display_order: 3 },
    { feature_key: 'placements', feature_name: 'Placement Management', feature_route: '/admin/placements', icon: 'Briefcase', display_order: 3.5 }
  ],
  facility_admin: [
    { feature_key: 'dashboard', feature_name: 'Dashboard', feature_route: '/admin/dashboard', icon: 'Activity', display_order: 0 },
    { feature_key: 'facilities', feature_name: 'Facility Management', feature_route: '/admin/facilities', icon: 'Building', display_order: 5 }
  ],
  system_admin: [
    { feature_key: 'dashboard', feature_name: 'Dashboard', feature_route: '/admin/dashboard', icon: 'Activity', display_order: 0 },
    { feature_key: 'audit', feature_name: 'Audit Logs', feature_route: '/admin/audit', icon: 'FileText', display_order: 7 },
    { feature_key: 'system', feature_name: 'System Settings', feature_route: '/admin/system', icon: 'Settings', display_order: 8 }
  ]
};

const Admin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [adminRoles, setAdminRoles] = useState([]);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Tag-based feature configuration state
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
  const [availableFeatureKeys, setAvailableFeatureKeys] = useState<Set<string>>(new Set());
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  const [notifications] = useState([
    {
      id: 1,
      type: 'info',
      title: 'System Update',
      message: 'New features have been added to the user management system',
      time: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'warning',
      title: 'Pending Approvals',
      message: '5 new student registrations awaiting approval',
      time: '1 hour ago',
      read: false
    }
  ]);

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

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

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

  const fetchUserTags = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_tag_assignments')
        .select(`
          user_tags!inner(
            tag_name,
            is_active
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (error) {
        console.error('Error fetching user tags:', error);
        return [];
      }

      const tags = data
        ?.filter(assignment => assignment.user_tags?.is_active)
        .map(assignment => assignment.user_tags.tag_name) || [];

      return tags;
    } catch (error) {
      console.error('Error in fetchUserTags:', error);
      return [];
    }
  };

  const buildFeaturesFromTags = (tags: string[]) => {
    const featuresMap = new Map<string, TagFeature>();
    
    // Always add dashboard first
    featuresMap.set('dashboard', {
      feature_key: 'dashboard',
      feature_name: 'Dashboard',
      feature_route: '/admin/dashboard',
      icon: 'Activity',
      display_order: 0
    });

    // Add features based on tags
    tags.forEach(tag => {
      const tagFeatures = TAG_FEATURE_MAP[tag];
      if (tagFeatures) {
        tagFeatures.forEach(feature => {
          if (!featuresMap.has(feature.feature_key)) {
            featuresMap.set(feature.feature_key, feature);
          }
        });
      }
    });

    // Convert to array and sort by display_order
    const features = Array.from(featuresMap.values()).sort(
      (a, b) => a.display_order - b.display_order
    );
    return features;
  };

  // Load features based on tags or super admin status
  useEffect(() => {
    const loadFeatures = () => {
      if (!userProfile) return;
      
      console.log('Loading features for admin:', userProfile.id, 'is_super_admin:', userProfile.is_super_admin);
      
      // Check if user is super admin
      const isSuper = userProfile.is_super_admin === 'true';
      setIsSuperAdmin(isSuper);
      
      let featuresToLoad: TagFeature[] = [];
      
      // If super admin, load all features
      if (isSuper) {
        console.log('Super admin detected, loading all features');
        featuresToLoad = TAG_FEATURE_MAP.super_admin;
      } else {
        // For tagged admins, use their tags
        console.log('Loading features for tags:', userTags);
        featuresToLoad = buildFeaturesFromTags(userTags);
      }
      
      // Convert features to sidebar items
      const items = featuresToLoad.map(f => ({
        id: f.feature_key,
        label: f.feature_name,
        icon: getIconComponent(f.icon),
        enabled: true,
        order: f.display_order
      }));
      
      console.log('Features loaded:', items.map(i => i.id));
      setSidebarItems(items.sort((a, b) => (a.order || 0) - (b.order || 0)));
      
      const featureKeySet = new Set(featuresToLoad.map(f => f.feature_key));
      console.log('Available feature keys:', Array.from(featureKeySet));
      setAvailableFeatureKeys(featureKeySet);
      setIsLoadingFeatures(false);
    };

    // Load features when userProfile is available
    // For super admin, load immediately
    // For tagged admins, wait for tags to be fetched
    if (userProfile) {
      if (userProfile.is_super_admin === true) {
        loadFeatures();
      } else if (userTags.length > 0) {
        loadFeatures();
      }
    }
  }, [userProfile, userTags]);

  useEffect(() => {
    const checkAuth = async () => {
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

          const userData = {
            user_id: profile.id,
            user_type: profile.user_type,
            first_name: profile.first_name,
            last_name: profile.last_name,
            college_id: profile.college_id,
            user_code: profile.user_code,
            email: profile.email
          };

          setSessionData(userData);
          setIsAuthenticated(true);
          setUserProfile(profile);

          // Fetch user's tags
          const tags = await fetchUserTags(profile.id);
          setUserTags(tags);

          // Fetch tag assignments for display
          const { data: tagAssignments } = await supabase
            .from('user_tag_assignments')
            .select(`
              tag_id,
              assigned_at,
              expires_at,
              user_tags(tag_name, display_name, tag_category)
            `)
            .eq('user_id', profile.id)
            .eq('is_active', true);

          if (tagAssignments && tagAssignments.length > 0) {
            const roles = tagAssignments.map(ta => ({
              role_type: ta.user_tags?.tag_name || 'admin',
              display_name: ta.user_tags?.display_name || 'Admin',
              tag_category: ta.user_tags?.tag_category || 'admin_role',
              permissions: {},
              assigned_at: ta.assigned_at
            }));
            setAdminRoles(roles);
          } else {
            setAdminRoles([]);
          }
        } else {
          // Fallback to localStorage for development
          const storedSession = localStorage.getItem('colcord_user');
          if (storedSession) {
            const parsedSession = JSON.parse(storedSession);
            if (parsedSession.user_type && parsedSession.user_id) {
              setSessionData(parsedSession);
              setIsAuthenticated(true);
              
              const profile = {
                id: parsedSession.user_id,
                first_name: parsedSession.first_name || 'Admin',
                last_name: parsedSession.last_name || 'User',
                email: parsedSession.email || '',
                user_code: parsedSession.user_code || 'ADM001',
                user_type: parsedSession.user_type || 'admin',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                college_id: parsedSession.college_id || '',
                hierarchy_level: parsedSession.user_type || 'admin',
                is_super_admin: true // Assume super admin for dev
              };
              setUserProfile(profile);
              
              // For development, assume super_admin tag
              const devTags = ['super_admin'];
              setUserTags(devTags);
              
              setAdminRoles([{
                role_type: 'super_admin',
                display_name: 'Super Admin',
                tag_category: 'admin_role',
                permissions: { all: true },
                assigned_at: new Date().toISOString()
              }]);
            } else {
              navigate('/');
            }
          } else {
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('colcord_user');
    navigate('/');
  };

  // Check if a feature is available based on super admin status or tags
  const isFeatureAvailable = (featureKey: string): boolean => {
    // Super admins have access to everything
    if (isSuperAdmin) {
      console.log(`Super admin checking feature: ${featureKey} - GRANTED`);
      return true;
    }
    
    // Dashboard is always available
    if (featureKey === 'dashboard') return true;
    
    if (isLoadingFeatures) return true;
    if (availableFeatureKeys.size === 0) return true;
    
    const hasAccess = availableFeatureKeys.has(featureKey);
    console.log(`Feature check for ${featureKey}: ${hasAccess ? 'GRANTED' : 'DENIED'}`, 
                `Available keys:`, Array.from(availableFeatureKeys));
    return hasAccess;
  };

  const handleNavigationChange = (view) => {
    console.log(`Navigation clicked: ${view}, isSuperAdmin: ${isSuperAdmin}, isFeatureAvailable: ${isFeatureAvailable(view)}`);
    if (isFeatureAvailable(view)) {
      setActiveView(view);
      if (isMobile) {
        setMobileMenuOpen(false);
      }
    } else {
      console.warn(`Feature ${view} not available`);
      // Feature not available
      return;
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
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

  const getIconComponent = (iconName: string) => {
    const iconMap = {
      Activity,
      Users,
      BookOpen,
      Calendar,
      DollarSign,
      Building,
      Shield,
      FileText,
      Settings
    };
    return iconMap[iconName] || Activity;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Feature Not Available Component
  const FeatureNotAvailable = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          You don't have permission to access this feature.
        </p>
        <Button onClick={() => setActiveView('dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );

  // Render content with feature availability checks
  const renderContent = () => {
    // Check if current view is available
    if (!isFeatureAvailable(activeView)) {
      return <FeatureNotAvailable />;
    }

    switch (activeView) {
      case 'dashboard':
        return <AdminDashboard sessionData={sessionData} onNavigate={handleNavigationChange} />;
      
      case 'users':
        return isFeatureAvailable('users')
          ? <EnhancedUserManagement userProfile={userProfile} adminRoles={adminRoles} />
          : <FeatureNotAvailable />;

      case 'student verification':
        return isFeatureAvailable('student verification')
          ? <StudentVerification userProfile={userProfile} adminRoles={adminRoles} verificationMode={true} />
          : <FeatureNotAvailable />;
      
      case 'department':
        return isFeatureAvailable('department')
          ? <DepartmentManagement userProfile={userProfile} />
          : <FeatureNotAvailable />;
      
      case 'courses':
        return isFeatureAvailable('courses')
          ? <CourseManagement userProfile={userProfile} />
          : <FeatureNotAvailable />;
      
      case 'enrollment':
        return isFeatureAvailable('enrollment')
          ? <StudentEnrollmentManagement teacherData={sessionData} />
          : <FeatureNotAvailable />;
      
      case 'timetable':
        return isFeatureAvailable('timetable')
          ? <TimetableManagement userProfile={userProfile} />
          : <FeatureNotAvailable />;
      
      case 'events':
        return isFeatureAvailable('events')
          ? <EventManagement userProfile={userProfile} />
          : <FeatureNotAvailable />;

      case 'placements':
        return isFeatureAvailable('placements')
          ? <PlacementManagement userProfile={userProfile} />
          : <FeatureNotAvailable />;
      
      case 'finance':
        return isFeatureAvailable('finance')
          ? <FinanceManagement userProfile={userProfile} />
          : <FeatureNotAvailable />;
      
      case 'facilities':
        return isFeatureAvailable('facilities')
          ? <FacilityManagement userProfile={userProfile} />
          : <FeatureNotAvailable />;
      
      case 'feature_config':
        return <FeatureConfig userProfile={userProfile} />;
      
      case 'roles':
        return isFeatureAvailable('roles')
          ? <RoleManagement userProfile={userProfile} adminRoles={adminRoles} />
          : <FeatureNotAvailable />;
      
      case 'audit':
        return isFeatureAvailable('audit')
          ? <AuditLogs userProfile={userProfile} adminRoles={adminRoles} />
          : <FeatureNotAvailable />;
      
      case 'system':
        return isFeatureAvailable('system')
          ? <SystemSettings userProfile={userProfile} />
          : <FeatureNotAvailable />;
      
      default:
        return <AdminDashboard sessionData={sessionData} onNavigate={handleNavigationChange} />;
    }
  };

  if (isLoading || isLoadingFeatures) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {isLoading ? 'Loading admin dashboard...' : 'Loading features...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
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
                <Menu className="h-7 w-7" />
              </Button>

              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">ColCord</h1>
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="h-6 w-px bg-white/20"></div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-role-admin rounded-full animate-pulse-indicator"></div>
                    <span className="text-sm sm:text-lg font-medium text-foreground">Admin Portal</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative" ref={userMenuRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleUserMenu}
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-all"
                >
                  <User className="h-5 w-5 text-foreground" />
                </Button>

                {showUserMenu && (
                  <div className="fixed right-3 sm:right-4 top-20 w-60 sm:w-64 bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999]">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 sm:h-12 w-10 sm:w-12 bg-red-500 rounded-full flex items-center justify-center">
                          <UserCircle className="h-6 sm:h-8 w-6 sm:w-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {sessionData.first_name} {sessionData.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {sessionData.email}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className="bg-red-500/20 text-red-300 border-red-400/30 font-medium text-xs">
                              {sessionData.user_type}
                            </Badge>
                            <span className="text-red-300 text-xs font-medium">
                              {sessionData.user_code}
                            </span>
                          </div>
                        </div>
                      </div>
                      {adminRoles.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-muted-foreground mb-2">Assigned Roles:</p>
                          <div className="flex flex-wrap gap-1">
                            {adminRoles.map((role, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-md font-medium"
                              >
                                {role.display_name || role.role_type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {userTags.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-muted-foreground mb-2">Active Tags:</p>
                          <div className="flex flex-wrap gap-1">
                            {userTags.map((tag, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-md font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {isSuperAdmin && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                            Super Admin
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
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
        {/* Sidebar - Uses Tag-Based Features */}
        <SidebarNavigation
          items={sidebarItems}
          activeItem={activeView}
          onItemClick={handleNavigationChange}
          userType="admin"
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
    </div>
  );
};

export default Admin;