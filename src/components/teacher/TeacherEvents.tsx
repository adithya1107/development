import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Plus,
  BookOpen,
  GraduationCap,
  Coffee,
  Award,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import PermissionWrapper from '@/components/PermissionWrapper';

interface TeacherEventsProps {
  teacherData: any;
}

interface Event {
  id: string;
  event_name: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  location: string;
  max_participants: number;
  organizer_id: string;
  registration_required: boolean;
  is_active: boolean;
  created_at: string;
  organizer?: {
    first_name: string;
    last_name: string;
  };
  participant_count?: number;
  is_registered?: boolean;
}

const TeacherEvents = ({ teacherData }: TeacherEventsProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [newClass, setNewClass] = useState({
    title: '',
    description: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    room_location: '',
    class_type: 'extra',
    course_id: ''
  });

  useEffect(() => {
    fetchEventData();
  }, [teacherData]);

  useEffect(() => {
    fetchEventsForSelectedDate();
  }, [selectedDate, events]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchEvents(),
        fetchMyEvents(),
        fetchWorkshops(),
        fetchScheduledClasses()
      ]);
    } catch (error) {
      console.error('Error fetching event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          organizer:user_profiles!events_organizer_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('college_id', teacherData.college_id)
        .eq('is_active', true)
        .gte('start_date', today)
        .order('start_date');

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return;
      }

      // Get registration status and participant count for each event
      const eventsWithDetails = await Promise.all(
        (eventsData || []).map(async (event) => {
          try {
            // Check if teacher is registered for this event
            const { data: registrationData, error: regError } = await supabase
              .from('event_registrations')
              .select('*')
              .eq('event_id', event.id)
              .eq('user_id', teacherData.user_id)
              .maybeSingle();

            if (regError && regError.code !== 'PGRST116') {
              console.error('Error checking registration for event', event.id, regError);
            }

            // Get participant count
            const { count, error: countError } = await supabase
              .from('event_registrations')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id);

            if (countError) {
              console.error('Error counting participants for event', event.id, countError);
            }

            return {
              ...event,
              is_registered: !!registrationData,
              participant_count: count || 0
            };
          } catch (error) {
            console.error('Error processing event', event.id, error);
            return {
              ...event,
              is_registered: false,
              participant_count: 0
            };
          }
        })
      );

      setEvents(eventsWithDetails);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchEventsForSelectedDate = () => {
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    
    const eventsForSelectedDate = events.filter(event => {
      const eventStartDate = new Date(event.start_date).toISOString().split('T')[0];
      const eventEndDate = new Date(event.end_date).toISOString().split('T')[0];
      
      return selectedDateStr >= eventStartDate && selectedDateStr <= eventEndDate;
    });

    setSelectedDateEvents(eventsForSelectedDate);
  };

  const fetchMyEvents = async () => {
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        events (
          id,
          event_name,
          description,
          start_date,
          end_date,
          location,
          event_type
        )
      `)
      .eq('user_id', teacherData.user_id)
      .order('registration_date', { ascending: false });

    if (!error && data) {
      setMyEvents(data);
    }
  };

  const fetchWorkshops = async () => {
    // Simulate workshop data
    setWorkshops([
      {
        id: '1',
        title: 'Digital Teaching Methods Workshop',
        description: 'Learn modern digital teaching techniques and tools',
        date: '2024-02-15',
        time: '09:00 - 12:00',
        location: 'Conference Hall A',
        instructor: 'Dr. Sarah Johnson',
        status: 'available',
        credits: 3
      },
      {
        id: '2',
        title: 'Student Assessment Strategies',
        description: 'Effective methods for evaluating student performance',
        date: '2024-02-20',
        time: '14:00 - 17:00',
        location: 'Workshop Room 1',
        instructor: 'Prof. Michael Chen',
        status: 'registered',
        credits: 2
      },
      {
        id: '3',
        title: 'Classroom Management Techniques',
        description: 'Best practices for maintaining an effective learning environment',
        date: '2024-02-25',
        time: '10:00 - 15:00',
        location: 'Main Auditorium',
        instructor: 'Dr. Emily Rodriguez',
        status: 'available',
        credits: 4
      }
    ]);
  };

  const fetchScheduledClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('extra_class_schedule')
        .select(`
          *,
          courses (
            course_name,
            course_code
          )
        `)
        .eq('teacher_id', teacherData.user_id)
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Error fetching scheduled classes:', error);
        return;
      }

      if (data) {
        setScheduledClasses(data);
      }
    } catch (error) {
      console.error('Error fetching scheduled classes:', error);
    }
  };

  const registerForEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: teacherData.user_id,
          registration_date: new Date().toISOString(),
          status: 'registered'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Successfully registered for event!'
      });

      fetchEvents();
      fetchMyEvents();
    } catch (error) {
      console.error('Error registering for event:', error);
      toast({
        title: 'Error',
        description: 'Failed to register for event',
        variant: 'destructive'
      });
    }
  };

  const unregisterFromEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', teacherData.user_id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Successfully unregistered from event'
      });

      fetchEvents();
      fetchMyEvents();
    } catch (error) {
      console.error('Error unregistering from event:', error);
      toast({
        title: 'Error',
        description: 'Failed to unregister from event',
        variant: 'destructive'
      });
    }
  };

  const scheduleExtraClass = async () => {
    try {
      if (!newClass.title || !newClass.scheduled_date || !newClass.start_time || !newClass.end_time) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      const { data, error } = await supabase
        .from('extra_class_schedule')
        .insert({
          teacher_id: teacherData.user_id,
          course_id: newClass.course_id || null,
          title: newClass.title,
          description: newClass.description,
          scheduled_date: newClass.scheduled_date,
          start_time: newClass.start_time,
          end_time: newClass.end_time,
          room_location: newClass.room_location,
          class_type: newClass.class_type,
          status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      setNewClass({
        title: '',
        description: '',
        scheduled_date: '',
        start_time: '',
        end_time: '',
        room_location: '',
        class_type: 'extra',
        course_id: ''
      });

      await fetchScheduledClasses();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast({
        title: 'Success',
        description: `${newClass.class_type.charAt(0).toUpperCase() + newClass.class_type.slice(1)} class scheduled successfully`
      });

      setNewClass({
        title: '',
        description: '',
        scheduled_date: '',
        start_time: '',
        end_time: '',
        room_location: '',
        class_type: 'extra',
        course_id: ''
      });
      
    } catch (error) {
      console.error('Error scheduling class:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule class',
        variant: 'destructive'
      });
    }
  };

  const cancelScheduledClass = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('extra_class_schedule')
        .update({ status: 'cancelled' })
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Class cancelled successfully'
      });

      await fetchScheduledClasses();
    } catch (error) {
      console.error('Error cancelling class:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel class',
        variant: 'destructive'
      });
    }
  };

  const startEditClass = (scheduledClass: any) => {
    setEditingClass({
      id: scheduledClass.id,
      title: scheduledClass.title,
      description: scheduledClass.description || '',
      scheduled_date: scheduledClass.date || scheduledClass.scheduled_date,
      start_time: scheduledClass.start_time,
      end_time: scheduledClass.end_time,
      room_location: scheduledClass.room_location || '',
      class_type: scheduledClass.class_type,
      course_id: scheduledClass.course_id || ''
    });
    setEditDialogOpen(true);
  };

  const updateScheduledClass = async () => {
    try {
      if (!editingClass.title || !editingClass.scheduled_date || !editingClass.start_time || !editingClass.end_time) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('extra_class_schedule')
        .update({
          title: editingClass.title,
          description: editingClass.description,
          scheduled_date: editingClass.scheduled_date,
          start_time: editingClass.start_time,
          end_time: editingClass.end_time,
          room_location: editingClass.room_location,
          class_type: editingClass.class_type,
          course_id: editingClass.course_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingClass.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Class updated successfully'
      });

      setEditDialogOpen(false);
      setEditingClass(null);
      await fetchScheduledClasses();
    } catch (error) {
      console.error('Error updating class:', error);
      toast({
        title: 'Error',
        description: 'Failed to update class',
        variant: 'destructive'
      });
    }
  };

  const registerForWorkshop = async (workshopId: string) => {
    setWorkshops(prev => prev.map(workshop => 
      workshop.id === workshopId 
        ? { ...workshop, status: 'registered' }
        : workshop
    ));

    toast({
      title: 'Success',
      description: 'Registered for workshop successfully'
    });
  };

  const formatEventDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'academic': 'bg-blue-100 text-blue-800',
      'cultural': 'bg-purple-100 text-purple-800',
      'sports': 'bg-green-100 text-green-800',
      'orientation': 'bg-orange-100 text-orange-800',
      'workshop': 'bg-indigo-100 text-indigo-800',
      'seminar': 'bg-gray-100 text-gray-800',
      'meeting': 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PermissionWrapper permission="mark_attendance">
      <div className="space-y-6">
        <Tabs defaultValue="calendar" className="w-full">

          {/* Academic Calendar with Calendar Component */}
          <TabsContent value="calendar" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                    <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Calendar</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              {/* Events for Selected Date */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base md:text-lg">
                    Events for {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDateEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8 text-sm">No events scheduled for this day</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedDateEvents.map((event) => (
                        <div key={event.id} className="border rounded-lg p-3 sm:p-4">
                          <div className="flex flex-col gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h4 className="font-semibold text-sm sm:text-base">{event.event_name}</h4>
                                <Badge className={`${getEventTypeColor(event.event_type)} text-xs`}>
                                  {event.event_type}
                                </Badge>
                                {event.is_registered && (
                                  <Badge variant="outline" className="text-green-700 text-xs flex-shrink-0">
                                    <Star className="w-3 h-3 mr-1" />
                                    Registered
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-2">{event.description}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span className="truncate">
                                    {formatEventDateTime(event.start_date)} - {formatEventDateTime(event.end_date)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span>{event.participant_count}/{event.max_participants}</span>
                                </div>
                              </div>
                              {event.organizer && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Organized by {event.organizer.first_name} {event.organizer.last_name}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Event Registration Actions */}
                          <div className="flex flex-col sm:flex-row gap-2 mt-3">
                            {event.registration_required ? (
                              event.is_registered ? (
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => unregisterFromEvent(event.id)}
                                    className="w-full sm:w-auto text-xs sm:text-sm"
                                  >
                                    Unregister
                                  </Button>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center justify-center text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    You're registered
                                  </Badge>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
                                  <Button
                                    size="sm"
                                    onClick={() => registerForEvent(event.id)}
                                    disabled={event.participant_count >= event.max_participants}
                                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-xs sm:text-sm"
                                  >
                                    {event.participant_count >= event.max_participants ? 'Event Full' : 'Register Now'}
                                  </Button>
                                  {event.participant_count >= event.max_participants && (
                                    <Badge variant="destructive" className="text-xs justify-center">Full</Badge>
                                  )}
                                </div>
                              )
                            ) : (
                              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <Badge variant="secondary" className="text-xs justify-center">No Registration Required</Badge>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs justify-center">
                                  Open to All
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* All Upcoming Events List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  All Upcoming Academic Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">No upcoming events</p>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <Card key={event.id} className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div className="flex-1 w-full min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-semibold text-sm sm:text-base truncate">{event.event_name}</h3>
                              <Badge className={`${getEventTypeColor(event.event_type)} text-xs flex-shrink-0`}>
                                {event.event_type}
                              </Badge>
                              {event.is_registered && (
                                <Badge variant="outline" className="text-green-700 text-xs flex-shrink-0">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Registered
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{event.description}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                {new Date(event.start_date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">{formatEventDateTime(event.start_date)} - {formatEventDateTime(event.end_date)}</span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span>{event.participant_count}/{event.max_participants}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            {event.registration_required ? (
                              event.is_registered ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unregisterFromEvent(event.id)}
                                  className="flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  Unregister
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  onClick={() => registerForEvent(event.id)}
                                  disabled={event.participant_count >= event.max_participants}
                                  className="flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  {event.participant_count >= event.max_participants ? 'Full' : 'RSVP'}
                                </Button>
                              )
                            ) : (
                              <Badge variant="secondary" className="text-xs">Open Event</Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training & Workshops */}
          <TabsContent value="workshops" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                  Professional Development Workshops
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workshops.map((workshop) => (
                    <Card key={workshop.id} className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1 w-full min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm sm:text-base truncate">{workshop.title}</h3>
                            <Badge variant="outline" className="text-xs flex-shrink-0">{workshop.credits} Credits</Badge>
                            {workshop.status === 'registered' && (
                              <Badge variant="default" className="text-xs flex-shrink-0">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Registered
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{workshop.description}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              {new Date(workshop.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span>{workshop.time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">{workshop.location}</span>
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm mt-2">
                            <span className="font-medium">Instructor:</span> {workshop.instructor}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => registerForWorkshop(workshop.id)}
                          disabled={workshop.status === 'registered'}
                          variant={workshop.status === 'registered' ? 'outline' : 'default'}
                          className="w-full sm:w-auto text-xs sm:text-sm"
                        >
                          {workshop.status === 'registered' ? 'Registered' : 'Register'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* My Events */}
          <TabsContent value="my-events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  My Registered Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">No registered events</p>
                ) : (
                  <div className="space-y-4">
                    {myEvents.map((registration) => (
                      <Card key={registration.id} className="p-3 sm:p-4">
                        <div className="flex flex-col items-start gap-3">
                          <div className="flex-1 w-full min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base truncate">{registration.events?.event_name}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{registration.events?.description}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                {new Date(registration.events?.start_date).toLocaleDateString()}
                              </div>
                              {registration.events?.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="truncate">{registration.events.location}</span>
                                </div>
                              )}
                            </div>
                            <Badge variant="default" className="mt-2 text-xs">
                              Registered on {new Date(registration.registration_date).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
};

export default TeacherEvents;