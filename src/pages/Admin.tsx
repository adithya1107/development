import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Mail,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  UserCircle,
  Video
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
import RoleManagement from '../components/admin/RoleManagement';
import AuditLogs from '../components/admin/AuditLogs';
import SystemSettings from '../components/admin/SystemSettings';
import StudentEnrollmentManagement from '@/components/teacher/StudentEnrollmentManagement';
import AdminProctoringManagement from './AdminProctoringManagement';
import AdminPTMManagement from '@/components/admin/AdminPTMManagement';

interface TagFeature {
  feature_key: string;
  feature_name: string;
  feature_route: string;
  icon: string;
  display_order: number;
}

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
  const [availableFeatures, setAvailableFeatures] = useState<TagFeature[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Mock notifications data
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
    },
    {
      id: 3,
      type: 'success',
      title: 'Backup Complete',
      message: 'Daily system backup completed successfully',
      time: '3 hours ago',
      read: true
    },
    {
      id: 4,
      type: 'error',
      title: 'Payment Failed',
      message: 'Payment gateway connection issue detected',
      time: '5 hours ago',
      read: true
    },
    {
      id: 5,
      type: 'info',
      title: 'New Course Added',
      message: 'Computer Science course has been added to the system',
      time: '1 day ago',
      read: true
    }
  ]);

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

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

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

  // Fetch user's assigned tags
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

  // Fetch user's assigned tag features
  const fetchUserFeatures = async (userId: string, tags: string[]) => {
    try {
      const { data, error } = await supabase
        .from('user_tag_assignments')
        .select(`
          tag_id,
          user_tags!inner(
            id,
            tag_name,
            tag_category,
            is_active,
            tag_features(
              feature_key,
              feature_name,
              feature_route,
              icon,
              display_order,
              is_enabled
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (error) {
        console.error('Error fetching user features:', error);
        setAvailableFeatures([{
          feature_key: 'dashboard',
          feature_name: 'Dashboard',
          feature_route: '/admin/dashboard',
          icon: 'Activity',
          display_order: 0
        }]);
        return;
      }

      // Extract and deduplicate features
      const featuresMap = new Map<string, TagFeature>();
      
      if (data && data.length > 0) {
        data.forEach(assignment => {
          const tag = assignment.user_tags;
          if (tag && tag.is_active && tag.tag_features) {
            tag.tag_features.forEach(feature => {
              if (feature.is_enabled && !featuresMap.has(feature.feature_key)) {
                featuresMap.set(feature.feature_key, {
                  feature_key: feature.feature_key,
                  feature_name: feature.feature_name,
                  feature_route: feature.feature_route,
                  icon: feature.icon,
                  display_order: feature.display_order
                });
              }
            });
          }
        });
      }

      // CRITICAL: super_admin has access to ALL features
      const isSuperAdmin = tags.includes('super_admin');
      
      if (isSuperAdmin) {
        console.log('Super admin detected - granting access to all features');
        
        // Add enrollment feature (from user_admin)
        if (!featuresMap.has('enrollment')) {
          featuresMap.set('enrollment', {
            feature_key: 'enrollment',
            feature_name: 'Enrollment Management',
            feature_route: '/admin/enrollment',
            icon: 'Users',
            display_order: 1.5
          });
        }
        
        // Add proctoring management (super_admin exclusive)
        if (!featuresMap.has('proctoring')) {
          featuresMap.set('proctoring', {
            feature_key: 'proctoring',
            feature_name: 'Proctoring Management',
            feature_route: '/admin/proctoring',
            icon: 'Video',
            display_order: 5.5
          });
        }
        
        // Add role management (super_admin exclusive)
        if (!featuresMap.has('roles')) {
          featuresMap.set('roles', {
            feature_key: 'roles',
            feature_name: 'Role Management',
            feature_route: '/admin/roles',
            icon: 'Shield',
            display_order: 6
          });
        }

        // Add PTM / Video Calls management for super admins
        if (!featuresMap.has('ptm')) {
          featuresMap.set('ptm', {
            feature_key: 'ptm',
            feature_name: 'PTM Video Calls',
            feature_route: '/admin/ptm',
            icon: 'Video',
            display_order: 5.6
          });
        }
      } else {
        // Non-super admin users: add features based on their specific tags
        
        // Add enrollment tab only for user_admin tag
        if (tags.includes('user_admin')) {
          console.log('Adding enrollment feature for user_admin tag');
          featuresMap.set('enrollment', {
            feature_key: 'enrollment',
            feature_name: 'Enrollment Management',
            feature_route: '/admin/enrollment',
            icon: 'Users',
            display_order: 1.5
          });
          // Give user_admins access to PTM management as well
          if (!featuresMap.has('ptm')) {
            console.log('Adding PTM feature for user_admin tag');
            featuresMap.set('ptm', {
              feature_key: 'ptm',
              feature_name: 'PTM Video Calls',
              feature_route: '/admin/ptm',
              icon: 'Video',
              display_order: 5.6
            });
          }
        }
        
        // Remove role management if user doesn't have super_admin
        console.log('Removing role management - user does not have super_admin tag');
        featuresMap.delete('roles');
      }

      // Convert to array and sort by display_order
      const features = Array.from(featuresMap.values()).sort(
        (a, b) => a.display_order - b.display_order
      );

      // Always ensure dashboard is available
      if (!features.some(f => f.feature_key === 'dashboard')) {
        features.unshift({
          feature_key: 'dashboard',
          feature_name: 'Dashboard',
          feature_route: '/admin/dashboard',
          icon: 'Activity',
          display_order: 0
        });
      }

      setAvailableFeatures(features);
    } catch (error) {
      console.error('Error in fetchUserFeatures:', error);
      setAvailableFeatures([{
        feature_key: 'dashboard',
        feature_name: 'Dashboard',
        feature_route: '/admin/dashboard',
        icon: 'Activity',
        display_order: 0
      }]);
    }
  };

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

          // Set session data
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

            // Fetch available features with tag-based filtering
            await fetchUserFeatures(profile.id, tags);
          } else {
            setAdminRoles([]);
            setAvailableFeatures([{
              feature_key: 'dashboard',
              feature_name: 'Dashboard',
              feature_route: '/admin/dashboard',
              icon: 'Activity',
              display_order: 0
            }]);
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
                hierarchy_level: parsedSession.user_type || 'admin'
              };
              setUserProfile(profile);
              
              // For development, assume super_admin and user_admin tags
              const devTags = ['super_admin', 'user_admin'];
              setUserTags(devTags);
              
              setAdminRoles([{
                role_type: 'super_admin',
                display_name: 'Super Admin',
                tag_category: 'admin_role',
                permissions: { all: true },
                assigned_at: new Date().toISOString()
              }]);

              // For development, show all features
              setAvailableFeatures([
                { feature_key: 'dashboard', feature_name: 'Dashboard', feature_route: '/admin/dashboard', icon: 'Activity', display_order: 0 },
                { feature_key: 'users', feature_name: 'User Management', feature_route: '/admin/users', icon: 'Users', display_order: 1 },
                { feature_key: 'enrollment', feature_name: 'Enrollment Management', feature_route: '/admin/enrollment', icon: 'Users', display_order: 1.5 },
                { feature_key: 'courses', feature_name: 'Course Management', feature_route: '/admin/courses', icon: 'BookOpen', display_order: 2 },
                { feature_key: 'events', feature_name: 'Event Management', feature_route: '/admin/events', icon: 'Calendar', display_order: 3 },
                { feature_key: 'finance', feature_name: 'Finance Management', feature_route: '/admin/finance', icon: 'DollarSign', display_order: 4 },
                { feature_key: 'facilities', feature_name: 'Facility Management', feature_route: '/admin/facilities', icon: 'Building', display_order: 5 },
                { feature_key: 'proctoring', feature_name: 'Proctoring Management', feature_route: '/admin/proctoring', icon: 'Video', display_order: 5.5 },
                  { feature_key: 'roles', feature_name: 'Role Management', feature_route: '/admin/roles', icon: 'Shield', display_order: 6 },
                  { feature_key: 'ptm', feature_name: 'PTM Video Calls', feature_route: '/admin/ptm', icon: 'Video', display_order: 5.6 },
                { feature_key: 'audit', feature_name: 'Audit Logs', feature_route: '/admin/audit', icon: 'FileText', display_order: 7 },
                { feature_key: 'system', feature_name: 'System Settings', feature_route: '/admin/system', icon: 'Settings', display_order: 8 }
              ]);
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

  const handleNavigationChange = (view) => {
    // Check if user has access to this feature
    const hasAccess = availableFeatures.some(f => f.feature_key === view);
    
    // Super admin bypasses all tag checks
    const isSuperAdmin = userTags.includes('super_admin');
    
    if (isSuperAdmin) {
      // Super admin can access everything
      if (hasAccess) {
        setActiveView(view);
      }
      return;
    }
    
    // Additional tag-based checks for non-super admins
    if (view === 'enrollment' && !userTags.includes('user_admin')) {
      return;
    }
    
    if (view === 'roles' && !userTags.includes('super_admin')) {
      return;
    }
    
    if (hasAccess) {
      setActiveView(view);
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

  const clearAllNotifications = () => {
    setShowNotifications(false);
    // TODO: Implement actual clear functionality when notifications are dynamic
  };

  const markNotificationAsRead = (notificationId: number) => {
    console.log('Marking notification as read:', notificationId);
    // TODO: Implement mark as read functionality
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
      Settings,
      Video
    };
    return iconMap[iconName] || Activity;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading admin dashboard...</p>
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

  // Build sidebar items from available features
  const sidebarItems = availableFeatures.map(feature => ({
    id: feature.feature_key,
    label: feature.feature_name,
    icon: getIconComponent(feature.icon)
  }));

  const renderContent = () => {
    // Check if user has access to current view
    const hasAccess = availableFeatures.some(f => f.feature_key === activeView);
    
    // Super admin bypasses all restrictions
    const isSuperAdmin = userTags.includes('super_admin');
    
    if (!isSuperAdmin) {
      // Additional tag-based checks for non-super admins
      if (activeView === 'enrollment' && !userTags.includes('user_admin')) {
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need the 'user_admin' tag to access Enrollment Management.</p>
              <Button 
                onClick={() => setActiveView('dashboard')} 
                className="mt-4"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        );
      }
      
      if (activeView === 'roles' && !userTags.includes('super_admin')) {
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need the 'super_admin' tag to access Role Management.</p>
              <Button 
                onClick={() => setActiveView('dashboard')} 
                className="mt-4"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        );
      }
    }
    
    if (!hasAccess && !isSuperAdmin) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this feature.</p>
            <Button 
              onClick={() => setActiveView('dashboard')} 
              className="mt-4"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <AdminDashboard sessionData={sessionData} onNavigate={handleNavigationChange} />;
      case 'users':
        return <EnhancedUserManagement userProfile={userProfile} adminRoles={adminRoles} />;
      case 'enrollment':
        return <StudentEnrollmentManagement teacherData={sessionData} />;
      case 'courses':
        return <CourseManagement userProfile={userProfile} />;
      case 'events':
        return <EventManagement userProfile={userProfile} />;
      case 'finance':
        return <FinanceManagement userProfile={userProfile} />;
      case 'facilities':
        return <FacilityManagement userProfile={userProfile} />;
      case 'proctoring':
        return <AdminProctoringManagement />;
      case 'ptm':
        return <AdminPTMManagement />;
      case 'roles':
        return <RoleManagement userProfile={userProfile} adminRoles={adminRoles} />;
      case 'audit':
        return <AuditLogs userProfile={userProfile} adminRoles={adminRoles} />;
      case 'system':
        return <SystemSettings userProfile={userProfile} />;
      default:
        return <AdminDashboard sessionData={sessionData} onNavigate={handleNavigationChange} />;
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
                    <div className="h-2 w-2 bg-role-admin rounded-full animate-pulse-indicator"></div>
                    <span className="text-sm sm:text-lg font-medium text-foreground">Admin Portal</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Notifications Dropdown */}
              <div className="relative" ref={notificationRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleNotifications}
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-all relative will-change-transform"
                >
                  <Bell className="h-9 w-9 text-foreground" />
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
                  onClick={toggleUserMenu}
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-all will-change-transform"
                >
                  <User className="h-9 w-9 text-foreground" />
                </Button>

                {/* User Menu Dropdown */}
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
                            <Badge className="bg-red-500/20 text-red-300 border-red-400/30 font-medium text-xs pointer-events-none">
                              {sessionData.user_type}
                            </Badge>
                            <span className=" text-red-300 border-red-400/30 text-xs font-medium">
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
                    </div>
                    
                    <div className="p-2 space-y-2 sm:space-y-0">
                      {availableFeatures.some(f => f.feature_key === 'system') && (
                        <Button
                          variant="ghost"
                        className="w-full justify-start text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg will-change-transform"
                          onClick={() => {
                            setActiveView('system');
                            setShowUserMenu(false);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Account Settings
                        </Button>
                      )}
                      
                      <div className="my-2 h-px bg-white/10"></div>
                      
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm text-red-400 hover:text-red-300 hover:bg-ref-500/10 rounded-lg will-change-transform"
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
        {/* Sidebar */}
        <SidebarNavigation
          items={sidebarItems}
          activeItem={activeView}
          onItemClick={setActiveView}
          userType="admin"
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 transition-all duration-300 ease-in-out p-3 sm:p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Admin;