import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Bell, 
  Users, 
  Send,
  Reply,
  Eye,
  Clock,
  MapPin,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CommunicationCenterProps {
  studentData: any;
}

const Anouncements: React.FC<CommunicationCenterProps> = ({ studentData }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [forums, setForums] = useState([]);
  const [alumniEvents, setAlumniEvents] = useState([]);
  const [selectedForum, setSelectedForum] = useState<any>(null);
  const [forumPosts, setForumPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (studentData) {
      fetchCommunicationData();
    }
  }, [studentData]);

  const fetchCommunicationData = async () => {
    try {
      // Fetch announcements
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .eq('college_id', studentData.college_id)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      setAnnouncements(announcementsData || []);

      // Get enrolled courses
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentData.user_id);

      const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];

      // Fetch Alumni Events (upcoming only)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('college_id', studentData.college_id)
        .eq('is_active', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      console.log('Alumni Events Query:', { 
        college_id: studentData.college_id, 
        eventsData, 
        eventsError,
        count: eventsData?.length 
      });

      setAlumniEvents(eventsData || []);

    } catch (error) {
      console.error('Error fetching communication data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch communication data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getAnnouncementTypeColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'destructive';
      case 'academic':
        return 'default';
      case 'event':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading communications...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 overflow-x-hidden">
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Communication Center</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap">{announcements.length} Announcements</Badge>
          <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap">{alumniEvents.length} Upcoming Alumni Events</Badge>
        </div>
      </div>

      <Tabs defaultValue="announcements" className="space-y-4 w-full">
        <div className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="announcements" className="text-[10px] xs:text-xs sm:text-sm px-1 xs:px-2 sm:px-3 py-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 pr-1" />
              <span className="truncate">Announcements</span>
            </TabsTrigger>
            <TabsTrigger value="alumni-events" className="text-[10px] xs:text-xs sm:text-sm px-1 xs:px-2 sm:px-3 py-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 pr-1" />
              <span className="truncate">Upcoming Alumni Events</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="announcements" className="space-y-4">
          {announcements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 mx-auto mb-4" />
                <p>No announcements at this time</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {announcements.map((announcement: any) => (
                <Card
                  key={announcement.id}
                  className="hover:shadow-md transition-shadow w-full"
                >
                  <CardContent className="p-4 sm:p-6">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                      {/* Title + Content */}
                      <div className="flex-1 w-full">
                        <h3 className="text-base sm:text-lg font-semibold mb-2 break-words">
                          {announcement.title}
                        </h3>
                        <p className="text-sm sm:text-base leading-relaxed break-words">
                          {announcement.content}
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 sm:space-y-2">
                        <Badge
                          variant={getPriorityColor(announcement.priority)}
                          className="text-xs sm:text-sm px-2 sm:px-3 py-0.5"
                        >
                          {announcement.priority}
                        </Badge>
                        <Badge
                          variant={getAnnouncementTypeColor(announcement.announcement_type)}
                          className="text-xs sm:text-sm px-2 sm:px-3 py-0.5"
                        >
                          {announcement.announcement_type}
                        </Badge>
                      </div>
                    </div>

                    {/* Footer (Date Section) */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs sm:text-sm text-gray-500 pt-3 border-t gap-1 sm:gap-2">
                      <span className="whitespace-nowrap">
                        {new Date(announcement.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {announcement.expires_at && (
                        <span className="whitespace-nowrap">
                          Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alumni-events" className="space-y-4">
          {alumniEvents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12  mx-auto mb-4" />
                <p className=" text-sm sm:text-base">No upcoming alumni events</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {alumniEvents.map((event: any) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow w-full">
                  <CardContent className="p-4 sm:p-6">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                      <div className="flex-1 w-full">
                        <h3 className="text-base sm:text-lg font-semibold mb-2 break-words">
                          {event.event_name}
                        </h3>
                        {event.description && (
                          <p className=" text-sm sm:text-base leading-relaxed break-words mb-3">
                            {event.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Event Type Badge */}
                      {event.event_type && (
                        <Badge variant="secondary" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 capitalize">
                          {event.event_type}
                        </Badge>
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="space-y-2 mb-4">
                      {/* Date & Time */}
                      <div className="flex items-center text-sm ">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="break-words">
                          {new Date(event.start_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {event.end_date && event.end_date !== event.start_date && (
                            <> - {new Date(event.end_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</>
                          )}
                        </span>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="break-words">{event.location}</span>
                        </div>
                      )}

                      {/* Max Participants */}
                      {event.max_participants && (
                        <div className="flex items-center text-sm ">
                          <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>Max Participants: {event.max_participants}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t gap-2">
                      <span className="text-xs">
                        {event.registration_required && 'Registration Required'}
                      </span>
                      <Button size="sm" className="w-full sm:w-auto">
                        <Calendar className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
};


export default Anouncements;