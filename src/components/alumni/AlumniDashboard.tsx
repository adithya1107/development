import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, Heart, Calendar, Users, Award, MessageSquare } from 'lucide-react';
import PermissionWrapper from '@/components/PermissionWrapper';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { toTitleCase } from '@/lib/utils';
interface AlumniDashboardProps {
  user: any;
  onNavigate?: (tab: string) => void; // Add navigation callback
}
export interface AlumniActivity {
  activity_id: string;
  activity_type: string;
  activity_time: string; // ISO timestamptz
  title: string;
  description: string | null;
  metadata: Record<string, any>;
}

const AlumniDashboard = ({ user, onNavigate }: AlumniDashboardProps) => {

  const [activities, setActivities] = useState<AlumniActivity[]>([]);


  useEffect(() => {
    console.log(user);
    loadRecentActivities();
  }, [user.user_id, user.id])


  const alumniStats = [
    {
      title: 'Years Since Graduation',
      value: '5',
      icon: GraduationCap,
      color: 'text-role-alumni',
      permission: 'view_personal_dashboard' as const,
      navigateTo: 'profile'
    },
    {
      title: 'Total Contributions',
      value: '₹50,000',
      icon: Heart,
      color: 'text-red-600',
      permission: 'alumni_contributions' as const,
      navigateTo: 'contributions'
    },
    {
      title: 'Events Attended',
      value: '12',
      icon: Calendar,
      color: 'text-green-600',
      permission: 'alumni_events' as const,
      navigateTo: 'events'
    },
    {
      title: 'Network Connections',
      value: '45',
      icon: Users,
      color: 'text-purple-600',
      permission: 'join_forums' as const,
      navigateTo: 'network'
    }
  ];

  const recentActivities = [
    {
      title: 'Contribution Made',
      description: 'Donated ₹10,000 to scholarship fund',
      time: '1 week ago',
      permission: 'alumni_contributions' as const
    },
    {
      title: 'Event Registered',
      description: 'Annual Alumni Meet 2024',
      time: '2 weeks ago',
      permission: 'alumni_events' as const
    },
    {
      title: 'Forum Post',
      description: 'Shared career advice in CS forum',
      time: '3 weeks ago',
      permission: 'join_forums' as const
    },
    {
      title: 'Certificate Requested',
      description: 'Applied for degree verification',
      time: '1 month ago',
      permission: 'request_certificates' as const
    }
  ];

  const quickActions = [
    {
      title: 'Make Contribution',
      description: 'Support current students and college',
      icon: Heart,
      color: 'bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800',
      permission: 'alumni_contributions' as const,
      navigateTo: 'contributions'
    },
    {
      title: 'Alumni Events',
      description: 'View and register for upcoming events',
      icon: Calendar,
      color: 'bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-800',
      permission: 'alumni_events' as const,
      navigateTo: 'events'
    },
    {
      title: 'Join Discussion',
      description: 'Connect with fellow alumni',
      icon: MessageSquare,
      color: 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800',
      permission: 'join_forums' as const,
      navigateTo: 'network'
    },
    {
      title: 'Request Certificate',
      description: 'Apply for academic documents',
      icon: Award,
      color: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200 hover:text-yellow-800',
      permission: 'request_certificates' as const,
      navigateTo: 'certificates'
    }
  ];

  const handleQuickActionClick = (navigateTo: string, actionTitle: string) => {
    if (onNavigate) {
      onNavigate(navigateTo);
    } else {
      console.warn(`Navigation not available for ${actionTitle}`);
    }
  };

  const handleStatCardClick = (navigateTo: string) => {
    if (onNavigate) {
      onNavigate(navigateTo);
    }
  };

  const handleEventRegister = (eventName: string) => {
    if (onNavigate) {
      onNavigate('events');
    }
  };

  const handleContributionClick = () => {
    if (onNavigate) {
      onNavigate('contributions');
    }
  };

  const loadRecentActivities = async () => {
    try {
      if (!user?.user_id) return;

      const { data, error } = await supabase.rpc(
        'get_alumni_activities',
        {
          p_alumni_id: user.user_id,
          p_limit: 15,
        }
      );

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      setActivities(data || []);
    } catch (err) {
      console.error('Failed to load activities:', err);
    }
  };


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-orange-900">
            <GraduationCap className="h-6 w-6 " />
            <span>Welcome back, {user.first_name} {user.last_name}!</span>
          </CardTitle>
          <CardDescription>
            Alumni ID: {user.user_code} | Class of 2019 | Computer Science
          </CardDescription>
        </CardHeader>
      </Card> */}
      <div className="bg-card border border-white/10 rounded-lg p-4 sm:p-5 md:p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-3 w-full">
            {/* Header with name and badge */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                Welcome back, {user.first_name}
              </h1>
            </div>
            {/* Info text */}
            <p className="text-sm sm:text-base text-gray-300/80">
              Alumni ID: {user.user_code} | Class of 2019 | Computer Science
            </p>
            <Badge className="bg-yellow-600/30 text-yellow-100 border border-yellow-300/40 font-bold px-4 py-1.5 w-fit hover:bg-yellow-600/40 hover:border-yellow-300/60 hover:cursor-pointer hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all duration-300">
              ALUMNI
            </Badge>
          </div>
        </div>

      </div>


      {/* Quick Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 w-ful">

        {alumniStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <PermissionWrapper key={index} permission={stat.permission}>
              <Card
                className="hover:shadow-md duration-300 hover:border-role-alumni/20 cursor-pointer hover:scale-[1.01] sm:hover:scale-[1.03] md:hover:scale-105 transition-all "
                onClick={() => handleStatCardClick(stat.navigateTo)}
              >
                <CardContent className="p-3 sm:p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-2 mb-1 will-change-transform">{stat.title}</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate will-change-transform">{stat.value}</p>
                    </div>
                    <div className={`p-2 sm:p-3 rounded-lg bg-${stat.color}-/10 flex-shrink-0 ml-3`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 will-change-transform ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PermissionWrapper>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Activities */}
        <Card className="h-[450px] sm:h-[510px] border-white/20 bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-md shadow-2xl overflow-hidden group">
          <CardHeader className="sticky top-0 z-10 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-sm border-b border-white/10 pb-4">
            <CardTitle className="text-card-foreground text-lg sm:text-xl font-bold">Recent Activities</CardTitle>
            <CardDescription className="text-sm">Your latest alumni activities</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-100px)] overflow-y-auto overflow-x-hidden scrollbar-thin space-y-3 sm:space-y-4 p-4 sm:p-6 custom-scrollbar">
            {activities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No recent activity found
              </p>
            )}
            {activities.map((activity, index) => (
              <div key={activity.activity_id}>
                <div className="flex flex-row items-start justify-start space-x-2 p-3 rounded-lg border border-white/10 hover:border-yellow-400/40 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:shadow-md hover:shadow-yellow-500/10 hover:-translate-y-0.5 will-change-transform">
                  <div className="flex-shrink-0 mt-1.5 sm:mt-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-0 animate-pulse shadow-lg shadow-yellow-400/50"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-card-foreground text-sm sm:text-base truncate">{toTitleCase(activity.activity_type)}</p>
                    <p className="font-medium text-card-foreground text-sm sm:text-base truncate">{toTitleCase(activity.title)}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{toTitleCase(activity.description)}</p>
                    <p className="text-[10px] sm:text-xs text-white/40 font-mono mt-1">{dayjs(activity.activity_time).fromNow()}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="h-[450px] sm:h-[510px] border-white/20 bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-md shadow-2xl overflow-hidden group">
          <CardHeader className="sticky top-0 z-10 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-sm border-b border-white/10 pb-4">
            <CardTitle className="text-card-foreground text-lg sm:text-xl">Quick Actions</CardTitle>
            <CardDescription>Connect and contribute to your alma mater</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-100px)] overflow-y-auto overflow-x-hidden scroll-smooth space-y-3 sm:space-y-4 p-4 sm:p-6 scrollbar-hide">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <PermissionWrapper key={index} permission={action.permission}>
                  <div
                    className={`flex flex-row items-start w-full  space-x-2 p-4 rounded-lg border border-white/10 hover:scale-[1.01] h-auto cursor-pointer will-change-transform transition-all duration-200 ${action.color}`}
                    onClick={() => handleQuickActionClick(action.navigateTo, action.title)}
                  >
                    <div className="flex-shrink-0 p-2 flex items-start self-start mt-1 mr-0">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="flex flex-col items-start flex-1 min-w-0 ">
                      <p className="font-medium text-sm sm:text-base truncate">{action.title}</p>
                      <p className="text-xs sm:text-sm  line-clamp-2">{action.description}</p>
                    </div>
                  </div>
                </PermissionWrapper>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Alumni Spotlight */}
      <PermissionWrapper permission="alumni_events">
        <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-card-foreground">
              Upcoming Alumni Events
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Stay connected with your alma mater - click to register
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {[
                {
                  name: 'Annual Alumni Meet 2024',
                  date: 'December 15, 2024',
                  location: 'Main Campus',
                  attendees: '200+ expected'
                },
                {
                  name: 'Tech Talk Series',
                  date: 'January 20, 2025',
                  location: 'Virtual Event',
                  attendees: '150+ registered'
                },
                {
                  name: 'Scholarship Fundraiser',
                  date: 'February 10, 2025',
                  location: 'Bangalore',
                  attendees: '50+ confirmed'
                }
              ].map((event, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:border-role-alumni/20 transition-all duration-300 hover:scale-102 gap-3 sm:gap-0"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm sm:text-base text-card-foreground">
                      {event.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {event.date} • {event.location}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-start gap-2 sm:gap-0">
                    <Badge variant="secondary" className="text-xs">
                      {event.attendees}
                    </Badge>
                    <div className="sm:mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEventRegister(event.name)}
                        className="text-xs sm:text-sm bg-white text-black border-white hover:bg-black hover:text-white hover:border-white transition-all duration-300"
                      >
                        Register
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 sm:mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => handleQuickActionClick('events', 'View All Events')}
                className="mt-4 text-sm sm:text-base hover:bg-role-alumni/10 hover:text-role-alumni hover:border-role-alumni/20 w-full sm:w-auto"
              >
                View All Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </PermissionWrapper>

      {/* Contribution Impact */}
      <PermissionWrapper permission="alumni_contributions">
        <Card className="backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-7 w-7 sm:h-5 sm:w-5 text-red-500" />
              <span className="text-xl sm:text-lg">Your Impact</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm sm:text-base text-card-foreground mb-4">
              Your contributions have helped 5 students with scholarships this year. Thank you for giving back!
            </p>
            <Button
              className="text-sm sm:text-base transition-all w-full sm:w-[220px] will-change-transform"
              onClick={handleContributionClick}
            >
              Make Another Contribution
            </Button>
          </CardContent>
        </Card>
      </PermissionWrapper>
    </div>
  );
};

export default AlumniDashboard;