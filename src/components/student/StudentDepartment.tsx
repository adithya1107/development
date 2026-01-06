import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calendar, Clock, MapPin, AlertCircle, Users, Building2, 
  Loader2, Search, Wifi, WifiOff, Bell, CalendarDays,
  ChevronRight, ExternalLink, Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StudentDepartmentProps {
  studentData: any;
  userTags: any[];
}

const StudentDepartment: React.FC<StudentDepartmentProps> = ({ 
  studentData, 
  userTags 
}) => {
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [activeTab, setActiveTab] = useState('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'today' | 'this-week'>('upcoming');
  const [isClassRep, setIsClassRep] = useState(false);
  
  const eventsSubscriptionRef = useRef<any>(null);
  const announcementsSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    const userId = studentData?.id || studentData?.user_id;
    
    if (userId) {
      loadStudentDepartment();
    } else {
      console.error('❌ studentData or studentData.id/user_id is missing:', studentData);
      toast({
        title: 'Error',
        description: 'Student information is not available',
        variant: 'destructive'
      });
      setLoading(false);
    }
    
    return () => {
      cleanupSubscriptions();
    };
  }, [studentData]);

  useEffect(() => {
    if (department?.id) {
      checkClassRepStatus();
      subscribeToRealtimeUpdates();
    }
    
    return () => {
      cleanupSubscriptions();
    };
  }, [department?.id]);

  const cleanupSubscriptions = () => {
    console.log('🧹 Cleaning up subscriptions');
    if (eventsSubscriptionRef.current) {
      supabase.removeChannel(eventsSubscriptionRef.current);
      eventsSubscriptionRef.current = null;
    }
    if (announcementsSubscriptionRef.current) {
      supabase.removeChannel(announcementsSubscriptionRef.current);
      announcementsSubscriptionRef.current = null;
    }
  };

  const subscribeToRealtimeUpdates = async () => {
    if (!department?.id) return;

    console.log('📡 Setting up realtime subscriptions for department:', department.id);

    // Subscribe to events
    const eventsChannelName = `dept-events-${department.id}-${Date.now()}`;
    eventsSubscriptionRef.current = supabase
      .channel(eventsChannelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'department_events'
      }, (payload) => {
        console.log('📅 New event:', payload.new);
        if ((payload.new as any).department_id === department.id) {
          setEvents(prev => {
            const exists = prev.some(e => e.id === payload.new.id);
            if (exists) return prev;
            return [payload.new as any, ...prev];
          });
          
          toast({
            title: '📅 New Event Added',
            description: (payload.new as any).event_name,
            duration: 4000,
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'department_events'
      }, (payload) => {
        console.log('📝 Event updated:', payload.new);
        if ((payload.new as any).department_id === department.id) {
          setEvents(prev =>
            prev.map(event =>
              event.id === payload.new.id ? payload.new as any : event
            )
          );
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'department_events'
      }, (payload) => {
        console.log('🗑️ Event deleted:', payload.old);
        setEvents(prev => prev.filter(event => event.id !== payload.old.id));
      })
      .subscribe((status) => {
        console.log('📡 Events subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          console.log('✅ Successfully subscribed to events');
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error');
        }
      });

    // Subscribe to announcements
    const announcementsChannelName = `dept-announcements-${department.id}-${Date.now()}`;
    announcementsSubscriptionRef.current = supabase
      .channel(announcementsChannelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements'
      }, (payload) => {
        console.log('📢 New announcement:', payload.new);
        if ((payload.new as any).department_id === department.id && (payload.new as any).is_active) {
          setAnnouncements(prev => {
            const exists = prev.some(a => a.id === payload.new.id);
            if (exists) return prev;
            return [payload.new as any, ...prev];
          });
          
          toast({
            title: '📢 New Announcement',
            description: (payload.new as any).title,
            duration: 5000,
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'announcements'
      }, (payload) => {
        console.log('📝 Announcement updated:', payload.new);
        if ((payload.new as any).department_id === department.id) {
          setAnnouncements(prev =>
            prev.map(ann =>
              ann.id === payload.new.id ? payload.new as any : ann
            ).filter(a => a.is_active)
          );
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'announcements'
      }, (payload) => {
        console.log('🗑️ Announcement deleted:', payload.old);
        setAnnouncements(prev => prev.filter(ann => ann.id !== payload.old.id));
      })
      .subscribe((status) => {
        console.log('📡 Announcements subscription status:', status);
      });

    console.log('✅ Realtime subscriptions active');
  };

  const loadStudentDepartment = async () => {
    try {
      setLoading(true);

      const userId = studentData?.id || studentData?.user_id;
      
      console.log('📋 Loading student department...');
      console.log('Student ID:', userId);

      if (!userId) {
        console.error('No user ID found in studentData');
        setLoading(false);
        return;
      }

      // Check if student has class_representative tag with department context
      const { data: classRepAssignment, error: repError } = await supabase
        .from('user_tag_assignments')
        .select(`
          context_id,
          user_tags!inner (
            tag_name
          )
        `)
        .eq('user_id', userId)
        .eq('context_type', 'department')
        .eq('user_tags.tag_name', 'class_representative')
        .eq('is_active', true)
        .maybeSingle();

      if (repError && repError.code !== 'PGRST116') {
        console.error('Error checking class rep status:', repError);
      }

      console.log('Class rep assignment:', classRepAssignment);

      let departmentId: string | null = null;

      if (classRepAssignment?.context_id) {
        // User is a class representative
        departmentId = classRepAssignment.context_id;
        console.log('✅ Found class representative assignment for department:', departmentId);
      } else {
        // Student is not a class representative - no department access
        console.log('⚠️ Student is not a class representative');
        toast({
          title: 'No Department Access',
          description: 'You need to be a class representative to access the department section.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Fetch department details
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      if (deptError) throw deptError;

      console.log('✅ Department found:', deptData);
      setDepartment(deptData);

      // Load department events
      const { data: eventsData, error: eventsError } = await supabase
        .from('department_events')
        .select('*')
        .eq('department_id', departmentId)
        .gte('end_datetime', new Date().toISOString())
        .order('start_datetime', { ascending: true });

      if (eventsError) {
        console.error('❌ Error loading events:', eventsError);
      } else {
        console.log('✅ Events loaded:', eventsData?.length || 0);
        setEvents(eventsData || []);
      }

      // Load department announcements
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      console.log('✅ Announcements loaded:', announcementsData?.length || 0);
      setAnnouncements(announcementsData || []);

    } catch (error) {
      console.error('❌ Error loading department:', error);
      toast({
        title: 'Error',
        description: 'Failed to load department information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkClassRepStatus = async () => {
    const userId = studentData?.id || studentData?.user_id;
    
    if (!department?.id || !userId) {
      console.log('Missing department or student ID');
      setIsClassRep(false);
      return;
    }

    try {
      console.log('Checking class rep status for student:', userId, 'department:', department.id);
      
      // Check if user has class_representative tag with context of this department
      const { data, error } = await supabase
        .from('user_tag_assignments')
        .select(`
          id,
          user_tags!inner (
            tag_name
          )
        `)
        .eq('user_id', userId)
        .eq('context_type', 'department')
        .eq('context_id', department.id)
        .eq('user_tags.tag_name', 'class_representative')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking class rep status:', error);
        setIsClassRep(false);
        return;
      }

      if (data) {
        setIsClassRep(true);
        console.log('✅ User is class representative');
      } else {
        setIsClassRep(false);
        console.log('User is regular student');
      }
    } catch (error) {
      console.log('Error checking class representative status:', error);
      setIsClassRep(false);
    }
  };

  const getConnectionStatusIcon = () => {
    switch (realtimeStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
  };

  const getFilteredEvents = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let filtered = events;

    // Apply time filter
    if (eventFilter === 'today') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate.toDateString() === today.toDateString();
      });
    } else if (eventFilter === 'this-week') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate >= today && eventDate <= weekFromNow;
      });
    } else if (eventFilter === 'upcoming') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate >= today;
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getFilteredAnnouncements = () => {
    if (!searchQuery) return announcements;
    
    return announcements.filter(ann =>
      ann.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const formatEventDate = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (!end || start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getEventTypeBadge = (type: string) => {
    const badges = {
      workshop: { variant: 'default' as const, color: 'bg-blue-500' },
      seminar: { variant: 'secondary' as const, color: 'bg-purple-500' },
      meeting: { variant: 'outline' as const, color: 'bg-gray-500' },
      conference: { variant: 'default' as const, color: 'bg-green-500' },
      default: { variant: 'default' as const, color: 'bg-gray-500' }
    };
    
    return badges[type as keyof typeof badges] || badges.default;
  };

  const getPriorityBadge = (priority: string) => {
    const badges = {
      high: 'destructive' as const,
      medium: 'default' as const,
      low: 'secondary' as const
    };
    
    return badges[priority as keyof typeof badges] || 'secondary' as const;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground/70">Loading department information...</p>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Department Assigned</h3>
          <p className="text-muted-foreground max-w-md">
            You are not currently assigned to any department.
            Please contact your academic advisor.
          </p>
        </div>
      </div>
    );
  }

  const filteredEvents = getFilteredEvents();
  const filteredAnnouncements = getFilteredAnnouncements();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-sidebar-background border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {department.department_name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {department.department_code} • {isClassRep ? 'Class Representative' : 'Student'} View
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
              realtimeStatus === 'connected' ? 'bg-green-500/10 border-green-500/20' :
              realtimeStatus === 'error' ? 'bg-red-500/10 border-red-500/20' :
              'bg-yellow-500/10 border-yellow-500/20'
            }`}>
              {getConnectionStatusIcon()}
              <span className="text-xs font-medium capitalize hidden sm:inline">
                {realtimeStatus}
              </span>
            </div>

            {/* Role Badge */}
            {isClassRep && (
              <Badge variant="secondary" className="hidden sm:flex">
                <Users className="w-3 h-3 mr-1" />
                Class Rep
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Description Banner (if exists) */}
      {department.description && (
        <div className="bg-accent/50 border-b border-border px-6 py-3 flex-shrink-0">
          <p className="text-sm text-foreground/80">{department.description}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="border-b border-border bg-sidebar-background px-6 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="events" className="relative">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Events
                  {events.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {events.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="announcements" className="relative">
                  <Bell className="w-4 h-4 mr-2" />
                  Announcements
                  {announcements.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {announcements.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Search */}
              <div className="relative w-64 hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Events Tab */}
          <TabsContent value="events" className="flex-1 overflow-y-auto p-6 m-0">
            {/* Event Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <Button 
                variant={eventFilter === 'upcoming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEventFilter('upcoming')}
              >
                Upcoming
              </Button>
              <Button 
                variant={eventFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEventFilter('today')}
              >
                Today
              </Button>
              <Button 
                variant={eventFilter === 'this-week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEventFilter('this-week')}
              >
                This Week
              </Button>
              <Button 
                variant={eventFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEventFilter('all')}
              >
                All
              </Button>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? 'No matching events' : 'No events scheduled'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery 
                      ? 'Try a different search term' 
                      : 'Check back later for upcoming department events'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.map((event) => (
                  <Card 
                    key={event.id} 
                    className="hover:shadow-lg transition-all cursor-pointer border-l-4 hover:border-primary"
                    style={{ borderLeftColor: getEventTypeBadge(event.event_type).color }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">
                          {event.event_title}
                        </CardTitle>
                        <Badge variant={getEventTypeBadge(event.event_type).variant}>
                          {event.event_type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {event.event_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.event_description}
                        </p>
                      )}
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {formatEventDate(event.start_datetime, event.end_datetime)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>
                            {new Date(event.start_datetime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        
                        {event.max_participants && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span>Max: {event.max_participants} participants</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="flex-1 overflow-y-auto p-6 m-0">
            {filteredAnnouncements.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? 'No matching announcements' : 'No announcements'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery 
                      ? 'Try a different search term' 
                      : 'Check back later for department announcements'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((announcement) => (
                  <Card 
                    key={announcement.id} 
                    className="hover:shadow-md transition-all"
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-semibold text-lg flex-1">
                            {announcement.title}
                          </h3>
                          {announcement.priority && (
                            <Badge variant={getPriorityBadge(announcement.priority)}>
                              {announcement.priority}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {announcement.content}
                        </p>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(announcement.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          {announcement.link && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0"
                              onClick={() => window.open(announcement.link, '_blank')}
                            >
                              View Details
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Info Banner */}
      <div className="bg-accent/50 border-t border-border px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <p className="text-muted-foreground">
            <strong className="text-foreground">
              {isClassRep ? 'Class Representative Access:' : 'Student Access:'}
            </strong>{' '}
            You can view all department events and announcements. 
            {isClassRep && ' For updates or concerns, contact your department HOD.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentDepartment;