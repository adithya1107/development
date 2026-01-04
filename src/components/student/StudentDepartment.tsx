import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, AlertCircle, Users, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

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

  useEffect(() => {
    loadStudentDepartment();
  }, [studentData]);

  const loadStudentDepartment = async () => {
    try {
      setLoading(true);

      // Get student's department from student table
      const { data: studentInfo, error: studentError } = await supabase
        .from('student')
        .select(`
          department_id,
          departments (
            id,
            name,
            code,
            description,
            hod_id
          )
        `)
        .eq('id', studentData.user_id)
        .single();

      if (studentError) throw studentError;

      if (!studentInfo?.department_id) {
        toast({
          title: 'No Department',
          description: 'You are not assigned to any department.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      setDepartment(studentInfo.departments);

      // Load department events
      const { data: eventsData, error: eventsError } = await supabase
        .from('department_events')
        .select('*')
        .eq('department_id', studentInfo.department_id)
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (eventsError) {
        console.error('Error loading events:', eventsError);
      } else {
        setEvents(eventsData || []);
      }

      // Load department announcements if table exists
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .eq('department_id', studentInfo.department_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      setAnnouncements(announcementsData || []);

    } catch (error) {
      console.error('Error loading department:', error);
      toast({
        title: 'Error',
        description: 'Failed to load department information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading department information...</p>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto" />
          <h3 className="text-xl font-semibold">No Department Assigned</h3>
          <p className="text-muted-foreground max-w-md">
            You are not currently assigned to any department.
            Please contact your academic advisor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Department Header */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{department.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Department Code: {department.code}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              <Users className="w-3 h-3 mr-1" />
              Class Representative
            </Badge>
          </div>
        </CardHeader>
        {department.description && (
          <CardContent>
            <p className="text-muted-foreground">{department.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Department Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Upcoming Department Events</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No upcoming events scheduled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div 
                  key={event.id} 
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg">{event.event_name}</h3>
                    <Badge variant={
                      event.event_type === 'workshop' ? 'default' :
                      event.event_type === 'seminar' ? 'secondary' :
                      event.event_type === 'meeting' ? 'outline' : 'default'
                    }>
                      {event.event_type}
                    </Badge>
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(event.start_date).toLocaleDateString()} 
                        {event.end_date && event.start_date !== event.end_date && 
                          ` - ${new Date(event.end_date).toLocaleDateString()}`}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.start_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{event.start_time}</span>
                      </div>
                    )}
                  </div>

                  {event.max_participants && (
                    <div className="text-xs text-muted-foreground">
                      Max Participants: {event.max_participants}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Announcements */}
      {announcements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>Department Announcements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div 
                  key={announcement.id} 
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{announcement.title}</h3>
                    {announcement.priority && (
                      <Badge variant={
                        announcement.priority === 'high' ? 'destructive' :
                        announcement.priority === 'medium' ? 'default' : 'secondary'
                      }>
                        {announcement.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(announcement.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Class Representative Access
              </p>
              <p className="text-sm">
                As a class representative, you can view department events and announcements.
                For any updates or concerns, please contact your department HOD.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDepartment;