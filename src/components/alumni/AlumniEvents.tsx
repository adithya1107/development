
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/use-toast";
import { Calendar, MapPin, Users, Clock, Search } from 'lucide-react';

interface AlumniEventsProps {
  user: any;
}

const AlumniEvents = ({ user }: AlumniEventsProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchMyRegistrations();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      // First check if there are any events at all
      const { data: allEvents, error: allError } = await supabase
        .from('events')
        .select('*');
    
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('college_id', user.college_id)
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    }
  };

  const fetchMyRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('user_id', user.user_id);

      if (error) throw error;
      setMyRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: user.user_id,
          status: 'registered'
        });

      if (error) throw error;

      toast({
        title: 'Registered Successfully',
        description: 'You have been registered for the event.',
      });

      fetchMyRegistrations();
    } catch (error: any) {
      console.error('Error registering for event:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register for event',
        variant: 'destructive',
      });
    }
  };

  const handleUnregister = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: 'Unregistered Successfully',
        description: 'You have been unregistered from the event.',
      });

      fetchMyRegistrations();
    } catch (error: any) {
      console.error('Error unregistering from event:', error);
      toast({
        title: 'Unregistration Failed',
        description: error.message || 'Failed to unregister from event',
        variant: 'destructive',
      });
    }
  };

  const isRegistered = (eventId: string) => {
    return myRegistrations.some(reg => reg.event_id === eventId);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || event.event_type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Alumni Events</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm sm:text-base"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="reunion">Reunion</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="lecture">Guest Lecture</SelectItem>
                <SelectItem value="networking">Networking</SelectItem>
                <SelectItem value="fundraising">Fundraising</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:gap-6 max-h-[320px] sm:max-h-[450] md:max-h-[600px] overflow-auto">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <Card key={event.id} className="border-l-4 border-l-blue-500 bg-black-50">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col space-y-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-base sm:text-lg font-semibold">{event.event_name}</h3>
                          <Badge variant="outline" className="text-xs cursor-pointer">{event.event_type}</Badge>
                          {isRegistered(event.id) && (
                            <Badge variant="default" className="text-xs cursor-pointer">Registered</Badge>
                          )}
                        </div>

                        <p className="text-sm sm:text-base text-gray-100 mb-4 line-clamp-3 sm:line-clamp-none">
                          {event.description}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 space-x-0 text-xs sm:text-sm text-gray-50">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span >{new Date(event.start_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>{new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                          {event.max_participants && (
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span>Max {event.max_participants} participants</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-full sm:w-auto">
                        {event.registration_required ? (
                          isRegistered(event.id) ? (
                            <Button
                              variant="outline"
                              onClick={() => handleUnregister(event.id)}
                              className="w-full sm:w-auto text-sm sm:text-base text-red-600 border-red-600 hover:bg-red-50"
                            >
                              Unregister
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleRegister(event.id)}
                              className="w-full sm:w-auto text-sm sm:text-base"
                            >
                              Register
                            </Button>
                          )
                        ) : (
                          <Badge variant="secondary" className="text-xs w-full sm:w-auto justify-center cursor-pointer">
                            No Registration Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 sm:py-12">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No events found</h3>
                <p className="text-sm sm:text-base text-gray-500">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Registered Events */}
      {myRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">My Registered Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myRegistrations.map((registration) => {
                const event = events.find(e => e.id === registration.event_id);
                if (!event) return null;

                return (
                  <div key={registration.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 sm:p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm sm:text-base">{event.event_name}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {new Date(event.start_date).toLocaleDateString()} at{' '}
                        {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge
                      variant={registration.status === 'registered' ? 'default' : 'secondary'}
                      className="text-xs self-start sm:self-center"
                    >
                      {registration.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AlumniEvents;
