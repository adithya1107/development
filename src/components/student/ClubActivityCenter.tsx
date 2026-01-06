import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Bell, 
  Plus, 
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  Award,
  Eye,
  Edit,
  Trash2,
  X,
  Save,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudentData {
  user_id: string;
  college_id: string;
  first_name: string;
  last_name: string;
}

interface ClubActivityCenterProps {
  studentData: StudentData;
}

const ClubActivityCenter: React.FC<ClubActivityCenterProps> = ({ studentData }) => {
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPresident, setIsPresident] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Form states
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    announcement_type: 'general',
    priority: 'normal',
    expires_at: ''
  });

  const [eventForm, setEventForm] = useState({
    event_name: '',
    description: '',
    event_type: 'meeting',
    start_date: '',
    end_date: '',
    location: '',
    max_participants: '',
    registration_required: false,
    registration_deadline: ''
  });

  useEffect(() => {
    fetchUserClubs();
  }, [studentData]);

  useEffect(() => {
    if (selectedClub) {
      fetchClubData(selectedClub.id);
      checkPresidentStatus(selectedClub.id);
    }
  }, [selectedClub]);

  const fetchUserClubs = async () => {
    try {
      setLoading(true);
      
      console.log('📋 Loading user clubs...');

      // Get all club assignments for this user (both member and president)
      const { data: clubAssignments, error: assignError } = await supabase
        .from('user_tag_assignments')
        .select(`
          context_id,
          user_tags!inner (
            tag_name
          )
        `)
        .eq('user_id', studentData.user_id)
        .eq('context_type', 'club')
        .in('user_tags.tag_name', ['club_member', 'club_president'])
        .eq('is_active', true);

      if (assignError) throw assignError;

      console.log('✅ Club assignments found:', clubAssignments);

      if (!clubAssignments || clubAssignments.length === 0) {
        setClubs([]);
        setLoading(false);
        return;
      }

      // Get unique club IDs - student can be in multiple clubs
      const clubIds = [...new Set(clubAssignments.map(a => a.context_id).filter(Boolean))];

      console.log('📋 Found', clubIds.length, 'unique club(s)');

      // Fetch full club details
      const { data: userClubs, error: clubsError } = await supabase
        .from('clubs')
        .select('*')
        .in('id', clubIds)
        .eq('college_id', studentData.college_id)
        .eq('is_active', true)
        .order('club_name', { ascending: true });

      if (clubsError) throw clubsError;

      console.log('✅ Clubs loaded:', userClubs?.length || 0);

      setClubs(userClubs || []);
      if (userClubs && userClubs.length > 0) {
        // Select the first club by default, or keep current selection if still valid
        if (selectedClub && userClubs.find(c => c.id === selectedClub.id)) {
          // Keep current selection if still valid
          setSelectedClub(selectedClub);
        } else {
          // Select first club
          setSelectedClub(userClubs[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clubs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPresidentStatus = async (clubId: string) => {
    try {
      // Check if user has club_president tag with context of this club
      const { data, error } = await supabase
        .from('user_tag_assignments')
        .select(`
          id,
          user_tags!inner (
            tag_name
          )
        `)
        .eq('user_id', studentData.user_id)
        .eq('context_type', 'club')
        .eq('context_id', clubId)
        .eq('user_tags.tag_name', 'club_president')
        .eq('is_active', true)
        .single();

      if (error) {
        setIsPresident(false);
        return;
      }

      setIsPresident(!!data);
      console.log('✅ President status:', !!data);
    } catch (error) {
      console.log('Not a president of this club');
      setIsPresident(false);
    }
  };

  const fetchClubData = async (clubId: string) => {
    try {
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('club_announcements')
        .select(`
          *,
          user_profiles!club_announcements_created_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('club_id', clubId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;

      const { data: readStatus } = await supabase
        .from('club_announcement_reads')
        .select('announcement_id')
        .eq('user_id', studentData.user_id);

      const readIds = new Set(readStatus?.map((r: any) => r.announcement_id) || []);
      const announcementsWithReadStatus = announcementsData?.map((a: any) => ({
        ...a,
        is_read: readIds.has(a.id)
      })) || [];

      setAnnouncements(announcementsWithReadStatus);

      const { data: eventsData, error: eventsError } = await supabase
        .from('club_events')
        .select(`
          *,
          user_profiles!club_events_created_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('club_id', clubId)
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      if (eventsError) throw eventsError;

      const { data: registrations } = await supabase
        .from('club_event_registrations')
        .select('event_id, status')
        .eq('user_id', studentData.user_id);

      const registrationMap = new Map(
        registrations?.map((r: any) => [r.event_id, r.status]) || []
      );

      const eventsWithRegistration = eventsData?.map((e: any) => ({
        ...e,
        user_registered: registrationMap.has(e.id),
        registration_status: registrationMap.get(e.id)
      })) || [];

      setEvents(eventsWithRegistration);
    } catch (error) {
      console.error('Error fetching club data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load club data',
        variant: 'destructive'
      });
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClub || !isPresident) {
      toast({
        title: 'Unauthorized',
        description: 'Only club presidents can create announcements',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('club_announcements')
        .insert([{
          club_id: selectedClub.id,
          title: announcementForm.title,
          content: announcementForm.content,
          announcement_type: announcementForm.announcement_type,
          priority: announcementForm.priority,
          expires_at: announcementForm.expires_at || null,
          created_by: studentData.user_id
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Announcement created successfully'
      });

      setShowCreateAnnouncement(false);
      setAnnouncementForm({
        title: '',
        content: '',
        announcement_type: 'general',
        priority: 'normal',
        expires_at: ''
      });
      fetchClubData(selectedClub.id);
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create announcement',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAnnouncement || !isPresident) return;

    try {
      const { error } = await supabase
        .from('club_announcements')
        .update({
          title: announcementForm.title,
          content: announcementForm.content,
          announcement_type: announcementForm.announcement_type,
          priority: announcementForm.priority,
          expires_at: announcementForm.expires_at || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAnnouncement.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Announcement updated successfully'
      });

      setEditingAnnouncement(null);
      setAnnouncementForm({
        title: '',
        content: '',
        announcement_type: 'general',
        priority: 'normal',
        expires_at: ''
      });
      fetchClubData(selectedClub.id);
    } catch (error: any) {
      console.error('Error updating announcement:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update announcement',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!isPresident) return;

    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('club_announcements')
        .update({ is_active: false })
        .eq('id', announcementId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Announcement deleted successfully'
      });

      fetchClubData(selectedClub.id);
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete announcement',
        variant: 'destructive'
      });
    }
  };

  const markAnnouncementAsRead = async (announcementId: string) => {
    try {
      const { error } = await supabase
        .from('club_announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: studentData.user_id
        });

      if (error) throw error;

      setAnnouncements(prev =>
        prev.map(a => a.id === announcementId ? { ...a, is_read: true } : a)
      );
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClub || !isPresident) return;

    try {
      const { error } = await supabase
        .from('club_events')
        .insert([{
          club_id: selectedClub.id,
          event_name: eventForm.event_name,
          description: eventForm.description,
          event_type: eventForm.event_type,
          start_date: eventForm.start_date,
          end_date: eventForm.end_date,
          location: eventForm.location,
          max_participants: eventForm.max_participants ? parseInt(eventForm.max_participants) : null,
          registration_required: eventForm.registration_required,
          registration_deadline: eventForm.registration_deadline || null,
          created_by: studentData.user_id
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event created successfully'
      });

      setShowCreateEvent(false);
      setEventForm({
        event_name: '',
        description: '',
        event_type: 'meeting',
        start_date: '',
        end_date: '',
        location: '',
        max_participants: '',
        registration_required: false,
        registration_deadline: ''
      });
      fetchClubData(selectedClub.id);
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create event',
        variant: 'destructive'
      });
    }
  };

  const handleRegisterForEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('club_event_registrations')
        .insert([{
          event_id: eventId,
          user_id: studentData.user_id,
          status: 'registered'
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Successfully registered for event'
      });

      fetchClubData(selectedClub.id);
    } catch (error: any) {
      console.error('Error registering for event:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to register for event',
        variant: 'destructive'
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'low': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      general: 'bg-blue-500/20 text-blue-400',
      event: 'bg-purple-500/20 text-purple-400',
      meeting: 'bg-green-500/20 text-green-400',
      achievement: 'bg-yellow-500/20 text-yellow-400',
      urgent: 'bg-red-500/20 text-red-400'
    };
    return colors[type] || colors.general;
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || announcement.announcement_type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-role-student" />
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Club Activity Center</h1>
        </div>
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Clubs Found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You're not currently a member of any clubs. Contact your administrator to join a club.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Club Activity Center</h1>
          {selectedClub && clubs.length > 1 && (
            <p className="text-sm text-muted-foreground mt-1">
              Currently viewing: <span className="text-role-student font-semibold">{selectedClub.club_name}</span>
            </p>
          )}
          {selectedClub && clubs.length === 1 && (
            <p className="text-muted-foreground mt-1">
              {isPresident ? 'Manage your club activities' : 'Stay updated with club announcements and events'}
            </p>
          )}
        </div>
        {isPresident && (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCreateAnnouncement(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
            <Button
              onClick={() => setShowCreateEvent(true)}
              variant="outline"
            >
              <Calendar className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        )}
      </div>

      {/* Club Selector */}
      {clubs.length > 1 && (
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">
                Your Clubs ({clubs.length})
              </p>
              <p className="text-xs text-muted-foreground">
                Select a club to view its content
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {clubs.map(club => (
                <Button
                  key={club.id}
                  variant={selectedClub?.id === club.id ? 'default' : 'outline'}
                  onClick={() => setSelectedClub(club)}
                  className={selectedClub?.id === club.id ? 'bg-role-student' : 'border-white/20'}
                >
                  {club.club_name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Announcements</p>
                <p className="text-2xl font-bold text-foreground mt-1">{announcements.length}</p>
              </div>
              <Bell className="h-10 w-10 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {events.filter(e => new Date(e.start_date) > new Date()).length}
                </p>
              </div>
              <Calendar className="h-10 w-10 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread Announcements</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {announcements.filter(a => !a.is_read).length}
                </p>
              </div>
              <Eye className="h-10 w-10 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Role</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {isPresident ? 'President' : 'Member'}
                </p>
              </div>
              <Award className="h-10 w-10 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="announcements" className="space-y-6">
        <TabsList className="bg-card/50 border border-white/10">
          <TabsTrigger value="announcements">
            <Bell className="h-4 w-4 mr-2" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="h-4 w-4 mr-2" />
            Events
          </TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="event">Event</option>
              <option value="meeting">Meeting</option>
              <option value="achievement">Achievement</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Announcements List */}
          <div className="space-y-4">
            {filteredAnnouncements.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No announcements found</p>
                </CardContent>
              </Card>
            ) : (
              filteredAnnouncements.map((announcement) => (
                <Card
                  key={announcement.id}
                  className={`bg-card/50 backdrop-blur border-white/10 transition-all hover:border-role-student/50 ${
                    !announcement.is_read ? 'ring-2' : ''
                  }`}
                  onClick={() => !announcement.is_read && markAnnouncementAsRead(announcement.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getPriorityColor(announcement.priority)}>
                            {announcement.priority}
                          </Badge>
                          <Badge className={getTypeColor(announcement.announcement_type)}>
                            {announcement.announcement_type}
                          </Badge>
                          {!announcement.is_read && (
                            <Badge >
                              New
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl">{announcement.title}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            By {announcement.user_profiles.first_name} {announcement.user_profiles.last_name}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(announcement.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      {isPresident && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAnnouncement(announcement);
                              setAnnouncementForm({
                                title: announcement.title,
                                content: announcement.content,
                                announcement_type: announcement.announcement_type,
                                priority: announcement.priority,
                                expires_at: announcement.expires_at || ''
                              });
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnnouncement(announcement.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                    {announcement.expires_at && (
                      <div className="mt-4 flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        Expires on {new Date(announcement.expires_at).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="space-y-4">
            {events.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No events scheduled</p>
                </CardContent>
              </Card>
            ) : (
              events.map((event) => {
                const isUpcoming = new Date(event.start_date) > new Date();
                const isPast = new Date(event.end_date) < new Date();

                return (
                  <Card
                    key={event.id}
                    className={`bg-card/50 backdrop-blur border-white/10 transition-all hover:border-role-student/50 ${
                      isPast ? 'opacity-60' : ''
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getTypeColor(event.event_type)}>
                              {event.event_type}
                            </Badge>
                            {isUpcoming && (
                              <Badge >
                                Upcoming
                              </Badge>
                            )}
                            {isPast && (
                              <Badge >
                                Past
                              </Badge>
                            )}
                            {event.user_registered && (
                              <Badge >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Registered
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl">{event.event_name}</CardTitle>
                          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(event.start_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {' - '}
                                {new Date(event.end_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{event.location}</span>
                              </div>
                            )}
                            <span>
                              Created by {event.user_profiles.first_name} {event.user_profiles.last_name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {event.description && (
                        <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                      )}
                      {event.registration_required && !event.user_registered && isUpcoming && (
                        <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Registration Required</p>
                            {event.registration_deadline && (
                              <p className="text-xs text-muted-foreground">
                                Deadline: {new Date(event.registration_deadline).toLocaleDateString()}
                              </p>
                            )}
                            {event.max_participants && (
                              <p className="text-xs text-muted-foreground">
                                Limited spots available
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => handleRegisterForEvent(event.id)}
                          >
                            Register Now
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Announcement Modal */}
      {(showCreateAnnouncement || editingAnnouncement) && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-background border-white/20 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCreateAnnouncement(false);
                    setEditingAnnouncement(null);
                    setAnnouncementForm({
                      title: '',
                      content: '',
                      announcement_type: 'general',
                      priority: 'normal',
                      expires_at: ''
                    });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                    placeholder="Enter announcement title"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Content *
                  </label>
                  <textarea
                    required
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student resize-none"
                    placeholder="Enter announcement content"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Type
                    </label>
                    <select
                      value={announcementForm.announcement_type}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, announcement_type: e.target.value })}
                      className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                    >
                      <option value="general">General</option>
                      <option value="event">Event</option>
                      <option value="meeting">Meeting</option>
                      <option value="achievement">Achievement</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Priority
                    </label>
                    <select
                      value={announcementForm.priority}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                      className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={announcementForm.expires_at}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, expires_at: e.target.value })}
                    className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingAnnouncement ? 'Update' : 'Create'} Announcement
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateAnnouncement(false);
                      setEditingAnnouncement(null);
                      setAnnouncementForm({
                        title: '',
                        content: '',
                        announcement_type: 'general',
                        priority: 'normal',
                        expires_at: ''
                      });
                    }}
                    className="border-white/20"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-background border-white/20 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Event</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCreateEvent(false);
                    setEventForm({
                      event_name: '',
                      description: '',
                      event_type: 'meeting',
                      start_date: '',
                      end_date: '',
                      location: '',
                      max_participants: '',
                      registration_required: false,
                      registration_deadline: ''
                    });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={eventForm.event_name}
                    onChange={(e) => setEventForm({ ...eventForm, event_name: e.target.value })}
                    className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                    placeholder="Enter event name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Description
                  </label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student resize-none"
                    placeholder="Enter event description"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Event Type
                  </label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                    className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="workshop">Workshop</option>
                    <option value="competition">Competition</option>
                    <option value="social">Social</option>
                    <option value="fundraiser">Fundraiser</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.start_date}
                      onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                      className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      End Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.end_date}
                      onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                      className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Location
                  </label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                    placeholder="Enter event location"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.registration_required}
                      onChange={(e) => setEventForm({ ...eventForm, registration_required: e.target.checked })}
                      className="w-4 h-4 text-role-student bg-card/50 border-white/10 rounded focus:ring-role-student"
                    />
                    <span className="text-sm text-foreground">Registration Required</span>
                  </label>
                </div>

                {eventForm.registration_required && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Max Participants
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={eventForm.max_participants}
                        onChange={(e) => setEventForm({ ...eventForm, max_participants: e.target.value })}
                        className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                        placeholder="Leave empty for unlimited"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Registration Deadline
                      </label>
                      <input
                        type="datetime-local"
                        value={eventForm.registration_deadline}
                        onChange={(e) => setEventForm({ ...eventForm, registration_deadline: e.target.value })}
                        className="w-full px-4 py-2 bg-card/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-role-student"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateEvent(false);
                      setEventForm({
                        event_name: '',
                        description: '',
                        event_type: 'meeting',
                        start_date: '',
                        end_date: '',
                        location: '',
                        max_participants: '',
                        registration_required: false,
                        registration_deadline: ''
                      });
                    }}
                    className="border-white/20"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClubActivityCenter;