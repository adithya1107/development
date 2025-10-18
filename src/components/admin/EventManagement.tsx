import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Edit, Users, MapPin, Clock, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
}

interface UserProfile {
  id: string;
  college_id: string;
  user_type: string;
}

const EventManagement = ({ userProfile }: { userProfile: UserProfile }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const [eventForm, setEventForm] = useState({
    event_name: '',
    description: '',
    event_type: '',
    start_date: '',
    end_date: '',
    location: '',
    max_participants: 100,
    registration_required: false
  });

  useEffect(() => {
    loadEvents();
  }, [userProfile.college_id]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);

      // Fetch events with organizer details and participant count
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          organizer:user_profiles!events_organizer_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('college_id', userProfile.college_id)
        .order('start_date', { ascending: false });

      if (eventsError) {
        throw eventsError;
      }

      // Get participant count for each event
      const eventsWithParticipantCount = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count, error: countError } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          if (countError) {
            console.error('Error counting participants for event', event.id, countError);
          }

          return {
            ...event,
            participant_count: count || 0
          };
        })
      );

      setEvents(eventsWithParticipantCount);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error",
        description: "Failed to load events.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async () => {
    try {
      // Validate required fields
      if (!eventForm.event_name || !eventForm.event_type || !eventForm.start_date ||
        !eventForm.end_date || !eventForm.location || !eventForm.description) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Convert datetime-local format to ISO string
      const startDate = new Date(eventForm.start_date).toISOString();
      const endDate = new Date(eventForm.end_date).toISOString();

      const { data: newEvent, error } = await supabase
        .from('events')
        .insert([
          {
            event_name: eventForm.event_name,
            description: eventForm.description,
            event_type: eventForm.event_type,
            start_date: startDate,
            end_date: endDate,
            location: eventForm.location,
            max_participants: eventForm.max_participants,
            organizer_id: userProfile.id,
            college_id: userProfile.college_id,
            registration_required: eventForm.registration_required,
            is_active: true
          }
        ])
        .select(`
          *,
          organizer:user_profiles!events_organizer_id_fkey(
            first_name,
            last_name
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      // Add the new event to the list with participant count
      const eventWithCount = {
        ...newEvent,
        participant_count: 0
      };

      setEvents([eventWithCount, ...events]);
      setIsAddDialogOpen(false);

      // Reset form
      setEventForm({
        event_name: '',
        description: '',
        event_type: '',
        start_date: '',
        end_date: '',
        location: '',
        max_participants: 100,
        registration_required: false
      });

      toast({
        title: "Success",
        description: "Event created successfully.",
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateEventStatus = async (eventId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: isActive })
        .eq('id', eventId);

      if (error) {
        throw error;
      }

      // Update local state
      setEvents(events.map(event =>
        event.id === eventId ? { ...event, is_active: isActive } : event
      ));

      toast({
        title: "Success",
        description: `Event ${isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      console.error('Error updating event status:', error);
      toast({
        title: "Error",
        description: "Failed to update event status.",
        variant: "destructive",
      });
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch =
      event.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || event.event_type === filterType;

    return matchesSearch && matchesType;
  });

  const getEventTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'academic': 'bg-blue-100 text-blue-800',
      'cultural': 'bg-purple-100 text-purple-800',
      'sports': 'bg-green-100 text-green-800',
      'orientation': 'bg-orange-100 text-orange-800',
      'workshop': 'bg-indigo-100 text-indigo-800',
      'seminar': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading events...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 mr-2" />
                <span>Event & Community Management</span>
              </CardTitle>
              <CardDescription className='mt-2'>
                Organize and manage campus events, workshops, and community activities.
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-60 ">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Event</DialogTitle>
                  <DialogDescription>
                    Organize a new event or activity for the campus community.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="event_name">Event Name *</Label>
                    <Input
                      id="event_name"
                      value={eventForm.event_name}
                      onChange={(e) => setEventForm({ ...eventForm, event_name: e.target.value })}
                      placeholder="e.g., Annual Tech Fest"
                    />
                  </div>
                  <div>
                    <Label htmlFor="event_type">Event Type *</Label>
                    <Select value={eventForm.event_type} onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="orientation">Orientation</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="seminar">Seminar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="max_participants">Max Participants</Label>
                    <Input
                      id="max_participants"
                      type="number"
                      value={eventForm.max_participants}
                      onChange={(e) => setEventForm({ ...eventForm, max_participants: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_date">Start Date & Time *</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={eventForm.start_date}
                      onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date & Time *</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={eventForm.end_date}
                      onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      placeholder="Event venue or location"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      placeholder="Event description and details"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={eventForm.registration_required}
                        onChange={(e) => setEventForm({ ...eventForm, registration_required: e.target.checked })}
                      />
                      <span>Registration Required</span>
                    </Label>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleAddEvent} className="w-full sm:w-auto">
                    Create Event
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="cultural">Cultural</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="orientation">Orientation</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="seminar">Seminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Events Table */}
          <div className="rounded-md border max-h-[350px] sm:max-h-[450px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{event.event_name}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{event.description}</div>
                        {event.organizer && (
                          <div className="text-xs text-gray-400">
                            by {event.organizer.first_name} {event.organizer.last_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{formatDateTime(event.start_date)}</span>
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          to {formatDateTime(event.end_date)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{event.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span>{event.participant_count}/{event.max_participants}</span>
                      </div>
                      {event.registration_required && (
                        <div className="text-xs text-orange-600">Registration Required</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.is_active ? "default" : "secondary"}>
                        {event.is_active ? "Active" : "Cancelled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Users className="w-3 h-3" />
                        </Button>
                        {userProfile.id === event.organizer_id && (
                          <Button
                            size="sm"
                            variant={event.is_active ? "destructive" : "default"}
                            onClick={() => handleUpdateEventStatus(event.id, !event.is_active)}
                          >
                            {event.is_active ? "Cancel" : "Activate"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredEvents.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No events found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventManagement;