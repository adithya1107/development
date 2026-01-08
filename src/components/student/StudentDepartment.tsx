import React, { useState, useRef, useEffect } from "react";
import { 
  CalendarDays, Clock, User, Building2, Search, Wifi, WifiOff, 
  AlertCircle, Loader2, Bell, Pin, ExternalLink, Users, Crown,
  MapPin, Calendar as CalendarIcon, CheckCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';

interface DepartmentMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  message_text: string;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  is_pinned: boolean;
  created_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
  };
}

interface DepartmentEvent {
  id: string;
  department_id: string;
  event_title: string;
  event_description: string;
  event_type: string;
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  is_all_day: boolean;
  max_participants: number | null;
  created_by: string;
  created_at: string;
  creator?: {
    first_name: string;
    last_name: string;
  };
}

interface Department {
  id: string;
  department_name: string;
  department_code: string;
  department_color: string;
  description: string | null;
  college_id: string;
  is_active: boolean;
}

interface DepartmentChannel {
  id: string;
  department_id: string;
  channel_name: string;
  channel_description: string | null;
  is_active: boolean;
  created_at: string;
}

interface Announcement {
  id: string;
  department_id: string;
  title: string;
  content: string;
  priority: string | null;
  link: string | null;
  is_active: boolean;
  created_at: string;
}

interface StudentDepartmentProps {
  studentData: any;
  userTags?: any[];
}

const StudentDepartment: React.FC<StudentDepartmentProps> = ({ 
  studentData, 
  userTags 
}) => {
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState<Department | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<DepartmentChannel | null>(null);
  const [messages, setMessages] = useState<DepartmentMessage[]>([]);
  const [events, setEvents] = useState<DepartmentEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [isClassRep, setIsClassRep] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedChannelIdRef = useRef<string | null>(null);
  const messageSubscriptionRef = useRef<any>(null);
  const departmentIdRef = useRef<string | null>(null);

  const userId = studentData?.id || studentData?.user_id;

  useEffect(() => {
    if (userId) {
      loadStudentDepartment();
    } else {
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
    departmentIdRef.current = department?.id || null;
  }, [department?.id]);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannel?.id || null;
  }, [selectedChannel?.id]);

  useEffect(() => {
    if (department?.id) {
      checkClassRepStatus();
      subscribeToRealtimeUpdates();
    }
    
    return () => {
      cleanupSubscriptions();
    };
  }, [department?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const cleanupSubscriptions = () => {
    if (messageSubscriptionRef.current) {
      supabase.removeChannel(messageSubscriptionRef.current);
      messageSubscriptionRef.current = null;
    }
  };

  const subscribeToRealtimeUpdates = async () => {
    if (!selectedChannel?.id) return;
    
    // Clean up any existing subscription first
    cleanupSubscriptions();

    // Create new subscription with unique channel name
    const channelName = `student-dept-messages-${selectedChannel.id}-${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'department_messages',
        filter: `channel_id=eq.${selectedChannel.id}`
      }, async (payload) => {
        console.log('Real-time message INSERT received:', {
          id: payload.new.id,
          channel_id: payload.new.channel_id,
          current_channel: selectedChannelIdRef.current,
          matches: payload.new.channel_id === selectedChannelIdRef.current
        });
        
        if (payload.new.channel_id === selectedChannelIdRef.current) {
          
          // Fetch full message data with sender info
          const { data: fullMessage } = await supabase
            .from('department_messages')
            .select(`
              *,
              sender:user_profiles!department_messages_sender_id_fkey(
                id,
                first_name,
                last_name,
                profile_picture_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (fullMessage) {
            setMessages((prev) => {
              const exists = prev.some(msg => msg.id === fullMessage.id);
              if (exists) {
                return prev.map(msg => msg.id === fullMessage.id ? fullMessage : msg);
              }
              return [...prev, fullMessage];
            });
            
            setTimeout(scrollToBottom, 100);
          }
        } else {
          console.log('⏭️ Message is for different channel, ignoring');
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'department_messages',
        filter: `channel_id=eq.${selectedChannel.id}`
      }, (payload) => {
        if (payload.new.channel_id === selectedChannelIdRef.current) {
          setMessages(prev =>
            prev.map(msg => msg.id === payload.new.id ? { ...msg, ...payload.new } : msg)
          );
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          console.log('Successfully subscribed to department messages');
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error');
          console.error('Channel subscription error');
        } else if (status === 'TIMED_OUT') {
          setRealtimeStatus('disconnected');
          console.warn('Subscription timed out');
        }
      });

    messageSubscriptionRef.current = subscription;
    setRealtimeStatus('connecting');
  };

  const loadStudentDepartment = async () => {
    try {
      setLoading(true);
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

      let departmentId: string | null = null;

      if (classRepAssignment?.context_id) {
        // User is a class representative
        departmentId = classRepAssignment.context_id;
        setIsClassRep(true);
      } else {
        // Student is not a class representative - no department access
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

      setDepartment(deptData);

      // Load department channel
      const { data: channelList, error: channelError } = await supabase
        .from('department_channels')
        .select('*')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (channelError) {
        console.error('❌ Error fetching channels:', channelError);
      } else if (channelList && channelList.length > 0) {
        setSelectedChannel(channelList[0]);

        // Fetch messages for the channel
        const { data: msgs, error: msgError } = await supabase
          .from('department_messages')
          .select(`
            *,
            sender:user_profiles!department_messages_sender_id_fkey(
              id,
              first_name,
              last_name,
              profile_picture_url
            )
          `)
          .eq('channel_id', channelList[0].id)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error('❌ Error fetching messages:', msgError);
        } else {
          setMessages(msgs || []);
        }
      }

      // Load department events
      const { data: eventsData, error: eventsError } = await supabase
        .from('department_events')
        .select(`
          *,
          creator:user_profiles!department_events_created_by_fkey(
            first_name,
            last_name
          )
        `)
        .eq('department_id', departmentId)
        .gte('end_datetime', new Date().toISOString())
        .order('start_datetime', { ascending: true });

      if (eventsError) {
        console.error('❌ Error loading events:', eventsError);
      } else {
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
    if (!department?.id || !userId) {
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
      } else {
        setIsClassRep(false);
      }
    } catch (error) {
      console.log('Error checking class representative status:', error);
      setIsClassRep(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
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

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const filteredEvents = selectedDate
    ? events.filter((event) => {
        const eventDate = new Date(event.start_datetime);
        return eventDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  const filteredMessages = messages.filter(msg =>
    msg.message_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.sender?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.sender?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                {department.department_code} • Class Representative View
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

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Messages Area - Read Only */}
        <div className="flex-1 flex flex-col min-h-0 bg-background">
          {/* Chat Header */}
          <div className="bg-sidebar-background border-b border-border px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              
              {/* Search */}
              <div className="relative w-64 hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Pinned Messages */}
          {messages.some((m) => m.is_pinned) && (
            <div className="bg-accent/50 border-b border-border px-6 py-3 flex-shrink-0">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Pin className="h-4 w-4" />
                Pinned Messages
              </h4>
              <div className="space-y-1">
                {messages
                  .filter((m) => m.is_pinned)
                  .map((m) => (
                    <div 
                      key={m.id} 
                      className="text-sm bg-card p-2 rounded"
                    >
                      <span className="flex-1">
                        <strong>
                          {m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : "Unknown"}:
                        </strong>{" "}
                        {m.message_text}
                        {m.file_name && (
                          <span className="text-xs ml-1">
                            {m.file_name}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Messages - Read Only */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0"
          >
            {filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground/70">
                    {searchQuery ? 'No matching messages' : 'No messages yet'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Try a different search term' : 'Check back later for updates'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {filteredMessages.map((msg, index) => {
                  const showAvatar = index === 0 || 
                    filteredMessages[index - 1].sender_id !== msg.sender_id;
                  
                  return (
                    <div 
                      key={msg.id} 
                      className="flex justify-start"
                    >
                      <div className="flex items-end space-x-2 max-w-[70%]">
                        {showAvatar && (
                          <div className="w-8 h-8 bg-primary/10 border border-border rounded-full flex items-center justify-center text-foreground text-xs font-semibold flex-shrink-0 mb-1">
                            {getInitials(msg.sender?.first_name, msg.sender?.last_name)}
                          </div>
                        )}
                        {!showAvatar && (
                          <div className="w-8 h-8 flex-shrink-0"></div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          {showAvatar && (
                            <p className="text-xs text-muted-foreground mb-1 ml-2">
                              {msg.sender ? 
                                `${msg.sender.first_name} ${msg.sender.last_name}` : 
                                "Unknown"
                              }
                            </p>
                          )}
                          
                          <div className="px-4 py-2 rounded-2xl bg-card border border-border text-foreground">
                            <p className="text-sm break-words">{msg.message_text}</p>

                            {msg.message_type === 'image' && msg.file_url && (
                              <img 
                                src={msg.file_url} 
                                alt={msg.file_name || 'Shared image'} 
                                className="mt-2 rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
                                onClick={() => window.open(msg.file_url!, '_blank')}
                              />
                            )}

                            {msg.file_name && msg.file_url && msg.message_type !== 'image' && (
                              <a 
                                href={msg.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 mt-2 flex items-center gap-1 hover:underline"
                              >
                                📎 {msg.file_name}
                                {msg.file_size && 
                                  ` (${(msg.file_size / 1024 / 1024).toFixed(2)} MB)`
                                }
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Read-only Notice */}
          <div className="bg-accent/50 border-t border-border px-6 py-3 flex-shrink-0">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <p className="text-muted-foreground">
                <strong className="text-foreground">Read-only access:</strong>{' '}
              </p>
            </div>
          </div>
        </div>

        {/* Calendar & Events Sidebar */}
        <div className="w-96 min-w-[384px] max-w-[420px] border-l border-border bg-sidebar-background flex-shrink-0 overflow-y-auto hidden lg:flex flex-col">
          <div className="p-6 space-y-4 flex-1">
            {/* Calendar Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5" /> Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasEvent: (date) =>
                      events.some((e) => {
                        const eventDate = new Date(e.start_datetime);
                        return eventDate.toDateString() === date.toDateString();
                      }),
                  }}
                  modifiersClassNames={{
                    hasEvent:
                      "relative after:content-['•'] after:text-blue-400 after:text-lg after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2",
                  }}
                />
              </CardContent>
            </Card>

            {/* Events Card */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" /> Event Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground">
                    Select a date to view events
                  </p>
                ) : filteredEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events on this date
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className="border-b border-border pb-3 last:border-0"
                      >
                        <h4 className="font-semibold text-sm mb-1">
                          {event.event_title}
                        </h4>
                        {event.event_description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {event.event_description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(event.start_datetime).toLocaleTimeString([], { 
                            hour: "2-digit", 
                            minute: "2-digit" 
                          })}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        )}
                        {event.max_participants && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Users className="h-3 w-3" />
                            Max: {event.max_participants} participants
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          {event.creator ? 
                            `${event.creator.first_name} ${event.creator.last_name}` : 
                            "Unknown"
                          }
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="mt-2 text-xs"
                        >
                          {event.event_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Announcements Card */}
            {announcements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bell className="h-5 w-5" /> Recent Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {announcements.slice(0, 3).map((announcement) => (
                      <div 
                        key={announcement.id} 
                        className="border-b border-border pb-3 last:border-0"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm flex-1">
                            {announcement.title}
                          </h4>
                          {announcement.priority && (
                            <Badge 
                              variant={getPriorityBadge(announcement.priority)}
                              className="text-xs"
                            >
                              {announcement.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {announcement.content}
                        </p>
                        {announcement.link && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 mt-1 text-xs"
                            onClick={() => window.open(announcement.link, '_blank')}
                          >
                            View Details
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDepartment;