import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Home,
  Calendar,
  Users,
  Heart,
  FileText,
  HelpCircle,
  Bell,
  Settings,
  User,
  LogOut,
  Mail,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Award,
  Briefcase,
  Menu
} from 'lucide-react';
import SidebarNavigation from '@/components/layout/SidebarNavigation';
import AlumniDashboard from '@/components/alumni/AlumniDashboard';
import AlumniEvents from '@/components/alumni/AlumniEvents';
import AlumniNetworking from '@/components/alumni/AlumniNetworking';
import AlumniContributions from '@/components/alumni/AlumniContributions';
import AlumniDocuments from '@/components/alumni/AlumniDocuments';
import AlumniSupport from '@/components/alumni/AlumniSupport';
import { supabase } from '@/integrations/supabase/client';
import AlumniCommunicationHub from '@/components/alumni/AlumniCommunicationHub';

const Alumni = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Mock notifications for alumni
  const [notifications,setNotifications] = useState([
    {
      id: 1,
      type: 'info',
      title: 'Alumni Meetup',
      message: 'Annual alumni gathering scheduled for next month in Mumbai',
      time: '1 hour ago',
      read: false
    },
    {
      id: 2,
      type: 'success',
      title: 'Contribution Received',
      message: 'Thank you for your generous donation to the scholarship fund',
      time: '2 days ago',
      read: false
    },
    {
      id: 3,
      type: 'warning',
      title: 'Profile Update',
      message: 'Please update your current employment details',
      time: '3 days ago',
      read: true
    },
    {
      id: 4,
      type: 'info',
      title: 'New Job Opening',
      message: 'Tech startup is looking for experienced professionals',
      time: '1 week ago',
      read: true
    },
    {
      id: 5,
      type: 'success',
      title: 'Network Connection',
      message: 'John Smith accepted your connection request',
      time: '1 week ago',
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

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
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

  // useEffect(() => {
  //   const initializeUser = async () => {
  //     try {
  //       const userData = localStorage.getItem('colcord_user');
  //       if (!userData) {
  //         navigate('/');
  //         return;
  //       }

  //       const parsedUser = JSON.parse(userData);
  //       if (parsedUser.user_type !== 'alumni') {
  //         toast({
  //           title: 'Access Denied',
  //           description: 'This area is for alumni only.',
  //           variant: 'destructive',
  //         });
  //         navigate('/');
  //         return;
  //       }

  //       setUser(parsedUser);
  //     } catch (error) {
  //       console.error('Error checking user:', error);
  //       navigate('/');
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   initializeUser();
  // }, [navigate]);


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
  
            if (profile.user_type !== 'alumni') {
              toast({
                title: 'Access Denied',
                description: 'This area is for alumni only.',
                variant: 'destructive',
              });
              navigate('/');
              return;
            }
  
            setUser({
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
            if (parsedUser.user_type !== 'alumni') {
              toast({
                title: 'Access Denied',
                description: 'This area is for alumni only.',
                variant: 'destructive',
              });
              navigate('/');
              return;
            }
            setUser(parsedUser);
          }
        } catch (error) {
          console.error('Error checking user:', error);
          navigate('/');
        } finally {
          console.log(user);
          setIsLoading(false);
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

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading alumni dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'networking', label: 'Networking', icon: Users },
    { id: 'contributions', label: 'Contributions', icon: Heart },
    { id: 'communication', label: 'Communication Hub', icon: Mail },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <AlumniDashboard user={user} onNavigate={setActiveView} />;
      case 'events':
        return <AlumniEvents user={user} />;
      case 'networking':
        return <AlumniNetworking user={user} />;
      case 'contributions':
        return <AlumniContributions user={user} />;
      case 'communication':
        return <AlumniCommunicationHub alumniData={user} />;
      case 'documents':
        return <AlumniDocuments user={user} />;
      case 'support':
        return <AlumniSupport user={user} />;
      default:
        return <AlumniDashboard user={user} />;
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
            <div className="flex items-center space-x-3 sm:space-x-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSidebarToggle}
                className="h-9 w-9 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="sr-only">Toggle sidebar</span>
                <Menu className="h-7 w-7" />
              </Button>

              {/*Logo*/}
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">ColCord</h1>
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="h-6 w-px bg-white/20"></div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-role-alumni rounded-full animate-pulse-indicator"></div>
                    <span className="text-sm sm:text-lg font-medium text-foreground">Alumni Portal</span>
                  </div>
                </div>
              </div>
            </div>



            {/*Right Section*/}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Notifications Dropdown */}
              <div className="relative" ref={notificationRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNotificationClick}
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-all relative will-change-transform"
                >
                  <Bell className="h-9 w-9 text-foreground" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">{unreadCount}</span>
                    </div>
                  )}
                </Button>

                {/* Notifications Panel */}
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


              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUserMenuClick}
                  className="h-9 w-9 rounded-lg hover:bg-white/10 transition-all will-change-transform"
                >
                  <User className="h-9 w-9 text-foreground" />
                </Button>

                {/* User Menu Panel */}
                {showUserMenu && (
                  <div className="fixed right-3 sm:right-4 top-20 w-60 sm:w-64 bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999]">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 sm:h-12 w-10 sm:w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>


                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30 font-medium text-xs pointer-events-none">
                              alumni
                            </Badge>
                            <span className="text-yellow-300 border-yellow-400/30 text-xs font-medium">
                              {user.user_code || 'ALM001'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>


                    {/*User Dropdown elements*/}
                    <div className="p-2 space-y-2 sm:space-y-0">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-blue-sm-left hover:bg-white/10 hover-text will-change-transform"
                        onClick={() => {
                          setActiveView('networking');
                          setShowUserMenu(false);
                        }}
                      >
                        <Users className="h-4 w-4 mr-3" />
                        My Network
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm-left hover:bg-white/10 hover-text will-change-transform"
                        onClick={() => {
                          setActiveView('contributions');
                          setShowUserMenu(false);
                        }}
                      >
                        <Heart className="h-4 w-4 mr-3" />
                        My Contributions
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm-left hover:bg-white/10 hover-text will-change-transform"
                        onClick={() => {
                          setActiveView('support');
                          setShowUserMenu(false);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Account Settings
                      </Button>



                      <div className="h-px bg-white/10 my-2"></div>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full justify-start text-sm text-red-400 hover:text-red-300 hover:bg-ref-500/10 rounded-lg will-change-transform"
                      >
                        <LogOut className="text-red-300 h-4 w-4 mr-3" />
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
        {/* Sidebar */}
        <SidebarNavigation
          items={sidebarItems}
          activeItem={activeView}
          onItemClick={setActiveView}
          userType="alumni"
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
    </div>
  );
};

export default Alumni;