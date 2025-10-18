import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Shield,
  Settings,
  FileText,
  BookOpen,
  Building,
  Calendar,
  DollarSign,
  MessageSquare,
  Archive,
  BarChart3,
  Bell,
  LogOut,
  Plus,
  TrendingUp,
  AlertCircle,
  UserCheck,
  Award,
  Clock,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

// Import all admin components
import EnhancedUserManagement from './EnhancedUserManagement';
import RoleManagement from './RoleManagement';
import AuditLogs from './AuditLogs';
import SecuritySettings from './SecuritySettings';
import SystemSettings from './SystemSettings';
import CourseManagement from './CourseManagement';
import FacilityManagement from './FacilityManagement';
import EventManagement from './EventManagement';
import FinanceManagement from './FinanceManagement';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_code: string;
  user_type: 'student' | 'faculty' | 'admin' | 'staff';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  college_id: string;
  hierarchy_level: string;
}

interface AdminRole {
  role_type: string;
  permissions: any;
  assigned_at: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  totalEvents: number;
  monthlyRevenue: number;
  pendingApprovals: number;
}

interface AdminDashboardProps {
  sessionData?: any;
}

const AdminDashboard = ({ sessionData }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [collegeName, setCollegeName] = useState<string>('Loading...');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    totalEvents: 0,
    monthlyRevenue: 0,
    pendingApprovals: 0
  });

  // Function to fetch college name
  const fetchCollegeName = async (collegeId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('name')
        .eq('id', collegeId)
        .single();

      if (error) {
        console.error('Error fetching college name:', error);
        throw error;
      }

      return data?.name || 'Unknown College';
    } catch (error) {
      console.error('Failed to fetch college name:', error);
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          loadUserProfile(),
          loadDashboardStats()
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setIsLoading(false);
      }
    };

    if (sessionData) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [sessionData]);

  // Load college name when sessionData changes
  useEffect(() => {
    if (sessionData?.college_id) {
      fetchCollegeName(sessionData.college_id)
        .then(name => setCollegeName(name))
        .catch(() => setCollegeName('Unknown College'));
    } else {
      setCollegeName('Unknown College');
    }
  }, [sessionData?.college_id]);

  const loadUserProfile = async () => {
    try {
      console.log('Loading user profile with session data:', sessionData);

      if (sessionData && sessionData.user_id) {
        const userProfile: UserProfile = {
          id: sessionData.user_id,
          first_name: sessionData.first_name || 'Admin',
          last_name: sessionData.last_name || 'User',
          email: sessionData.email || '',
          user_code: sessionData.user_code || 'ADM001',
          user_type: sessionData.user_type || 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          college_id: sessionData.college_id || '',
          hierarchy_level: sessionData.user_type || 'admin'
        };

        setUserProfile(userProfile);

        // Load admin roles with error handling
        try {
          const { data: rolesData, error: rolesError } = await supabase
            .rpc('get_user_admin_roles', {
              user_uuid: sessionData.user_id,
              college_uuid: sessionData.college_id
            });
          console.log('Admin roles data:', rolesData);

          if (rolesError) {
            console.warn('Error loading admin roles:', rolesError);
            setAdminRoles([{
              role_type: 'super_admin',
              permissions: { all: true },
              assigned_at: new Date().toISOString()
            }]);
          } else {
            const formattedRoles = rolesData?.map(role => ({
              role_type: role.role_type,
              permissions: role.permissions,
              assigned_at: role.assigned_at
            })) || [];

            if (formattedRoles.length === 0 && sessionData.user_type === 'admin') {
              setAdminRoles([{
                role_type: 'super_admin',
                permissions: { all: true },
                assigned_at: new Date().toISOString()
              }]);
            } else {
              setAdminRoles(formattedRoles);
            }
          }
        } catch (roleError) {
          console.warn('Role loading error:', roleError);
          setAdminRoles([{
            role_type: 'super_admin',
            permissions: { all: true },
            assigned_at: new Date().toISOString()
          }]);
        }
      }

      console.log('User profile loaded successfully');
    } catch (error) {
      console.error('Error loading user profile:', error);
      if (typeof toast === 'function') {
        toast({
          title: "Error",
          description: "Failed to load user profile.",
          variant: "destructive",
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      if (!sessionData?.college_id) return;

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 50000)
      );

      const dataPromise = Promise.all([
        supabase
          .from('user_profiles')
          .select('id, is_active')
          .eq('college_id', sessionData.college_id),
        supabase
          .from('courses')
          .select('id, is_active')
          .eq('college_id', sessionData.college_id),
        supabase
          .from('events')
          .select('id, is_active')
          .eq('college_id', sessionData.college_id)
      ]);

      const [usersResult, coursesResult, eventsResult] = await Promise.race([
        dataPromise
      ]);

      const totalUsers = usersResult.data?.length || 0;
      const activeUsers = usersResult.data?.filter(user => user.is_active)?.length || 0;
      const totalCourses = coursesResult.data?.filter(course => course.is_active)?.length || 0;
      const totalEvents = eventsResult.data?.filter(event => event.is_active)?.length || 0;

      setDashboardStats({
        totalUsers,
        activeUsers,
        totalCourses,
        totalEvents,
        monthlyRevenue: 0,
        pendingApprovals: 0
      });
    } catch (error) {
      console.warn('Error loading dashboard stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('colcord_user');

      if (typeof toast === 'function') {
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of the admin dashboard.",
        });
      }

      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      if (typeof toast === 'function') {
        toast({
          title: "Error",
          description: "Failed to logout. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const isSuperAdmin = (): boolean => {
    return adminRoles.some(role => role.role_type === 'super_admin') ||
      userProfile?.user_type === 'admin';
  };

  // Mock recent activities data for better UI
  const recentActivities = [
    {
      title: 'New User Registered',
      description: 'John Doe joined as Computer Science student',
      time: '5 minutes ago',
      type: 'user'
    },
    {
      title: 'Course Updated',
      description: 'Database Management course content modified',
      time: '1 hour ago',
      type: 'course'
    },
    {
      title: 'Event Created',
      description: 'Annual Tech Fest 2024 scheduled',
      time: '2 hours ago',
      type: 'event'
    },
    {
      title: 'Payment Received',
      description: 'Fee payment processed for Semester 6',
      time: '3 hours ago',
      type: 'payment'
    },
    {
      title: 'Event Created',
      description: 'Annual Tech Fest 2024 scheduled',
      time: '2 hours ago',
      type: 'event'
    },
    {
      title: 'Payment Received',
      description: 'Fee payment processed for Semester 6',
      time: '3 hours ago',
      type: 'payment'
    }
  ];

  const quickActions = [
    {
      title: 'Add New User',
      description: 'Register students, faculty, or staff',
      icon: UserCheck,
      color: 'bg-blue-50 text-blue-600',
      action: () => setActiveTab('users')
    },
    {
      title: 'Create Course',
      description: 'Set up new academic courses',
      icon: BookOpen,
      color: 'bg-green-50 text-green-600',
      action: () => setActiveTab('courses')
    },
    {
      title: 'Schedule Event',
      description: 'Plan college activities and events',
      icon: Calendar,
      color: 'bg-purple-50 text-purple-600',
      action: () => setActiveTab('events')
    },
    {
      title: 'System Settings',
      description: 'Configure college parameters',
      icon: Settings,
      color: 'bg-orange-50 text-orange-600',
      action: () => setActiveTab('settings')
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
          <p className="mt-4 text-white font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="max-w-md mx-auto border-white/10 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2 text-card-foreground">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have permission to access the admin dashboard.</p>
            <Button onClick={() => navigate('/')} className="bg-purple-600 hover:bg-purple-700 text-white">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header with glassmorphic design */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 sm:py-6">

            <div>
              <h1 className="text-3xl font-bold text-white">
                {getGreeting()}, {userProfile.first_name}!
              </h1>
              <p className="text-white/80 mt-1">
                Admin Control Center
                {sessionData && (
                  <span className="text-sm text-purple-300 block font-medium mt-1">
                    Managing: {collegeName}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:space-x-4 w-full md:w-fit">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 font-medium px-3 py-1 self-start md:self-auto">
                {userProfile.hierarchy_level.replace('_', ' ').toUpperCase()}
              </Badge>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-auto border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/30"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Alerts</span>
                  {dashboardStats.pendingApprovals > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5">
                      {dashboardStats.pendingApprovals}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-auto border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/30"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8 overflow-x-hidden">

        <div className="space-y-8 animate-fade-in">
          {/* Overview Dashboard - Always Visible */}
          <div className="space-y-8">
            {/* Stats Cards with Modern Styling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 gap-y-8">
              <Card className="border-white/10 bg-card/50 backdrop-blur-sm hover:border-purple-400/30 transition-all duration-300 hover-translate-up">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                  <div className="p-3 rounded-lg bg-blue-500/20">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-card-foreground">{dashboardStats.totalUsers}</div>
                  <p className="text-xs text-white/60 mt-1 font-mono">
                    {dashboardStats.activeUsers} active users
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/50 backdrop-blur-sm hover:border-green-400/30 transition-all duration-300 hover-translate-up">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Courses</CardTitle>
                  <div className="p-3 rounded-lg bg-green-500/20">
                    <BookOpen className="h-5 w-5 text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-card-foreground">{dashboardStats.totalCourses}</div>
                  <p className="text-xs text-white/60 mt-1 font-mono">
                    Across all departments
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/50 backdrop-blur-sm hover:border-purple-400/30 transition-all duration-300 hover-translate-up">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Events</CardTitle>
                  <div className="p-3 rounded-lg bg-purple-500/20">
                    <Calendar className="h-5 w-5 text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-card-foreground">{dashboardStats.totalEvents}</div>
                  <p className="text-xs text-white/60 mt-1 font-mono">
                    This semester
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/50 backdrop-blur-sm hover:border-orange-400/30 transition-all duration-300 hover-translate-up">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
                  <div className="p-3 rounded-lg bg-orange-500/20">
                    <AlertCircle className="h-5 w-5 text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-card-foreground">{dashboardStats.pendingApprovals}</div>
                  <p className="text-xs text-white/60 mt-1 font-mono">
                    Requires attention
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Quick Actions with Enhanced Design */}
              <Card className="h-[510px] border-white/20 bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-md shadow-2xl overflow-hidden group">
                <CardHeader className="sticky top-0 z-10 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-sm border-b border-white/10 pb-4">
                  <CardTitle className="text-card-foreground text-lg sm:text-xl">Quick Actions</CardTitle>
                  <CardDescription className="text-sm">Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="h-[calc(100%-100px)] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30 scroll-smooth space-y-3 sm:space-y-4 p-4 sm:p-6">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-4 rounded-lg border border-white/10 hover:border-purple-400/40 hover:bg-white/10 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 will-change-transform"
                        onClick={action.action}
                      >
                        <div className="p-3 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                          <Icon className="h-5 w-5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-card-foreground text-sm sm:text-base truncate">{action.title}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{action.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Recent Activity with Enhanced Design */}
              <Card className="h-[510px] border-white/20 bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-md shadow-2xl overflow-hidden group">
                <CardHeader className="sticky top-0 z-10 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-sm border-b border-white/10 pb-4">
                  <CardTitle className="text-card-foreground text-lg sm:text-xl">Recent Activity</CardTitle>
                  <CardDescription className="text-sm">Latest system activities and updates</CardDescription>
                </CardHeader>
                <CardContent className="h-[calc(100%-100px)] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30 scroll-smooth space-y-3 sm:space-y-4 p-4 sm:p-6 ">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-start sm:space-x-4 space-y-2 sm:space-y-0 p-3 sm:p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 hover:shadow-md hover:shadow-purple-500/5 will-change-transform">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5 sm:mt-3 animate-pulse shadow-lg shadow-purple-400/50"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-card-foreground text-sm sm:text-base truncate">{activity.title}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">{activity.description}</p>
                        <p className="text-[11px] sm:text-xs text-white/40 font-mono mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* System Health Status */}
            <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-400" />
                  <span>System Status</span>
                </CardTitle>
                <CardDescription>Current system health and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">

                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">Database</p>
                      <p className="text-xs text-green-400">Operational</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">API Services</p>
                      <p className="text-xs text-green-400">Healthy</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">Storage</p>
                      <p className="text-xs text-yellow-400">85% Used</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;