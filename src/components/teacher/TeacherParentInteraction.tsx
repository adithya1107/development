
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Calendar, 
  FileText, 
  Plus,
  Video,
  Phone,
  MessageSquare,
  Share
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { VideoCallModal } from '@/components/VideoCallModal';
import { meetingService } from '@/services/meetingService';
import { usePermissions } from '@/hooks/usePermissions';

interface TeacherParentInteractionProps {
  teacherData: any;
}

const TeacherParentInteraction = ({ teacherData }: TeacherParentInteractionProps) => {
  const [students, setStudents] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [progressReports, setProgressReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { permissions } = usePermissions();

  // Video call state
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<any>(null);

  const [newMeeting, setNewMeeting] = useState({
    student_id: '',
    parent_id: '',
    meeting_date: '',
    meeting_type: 'in_person',
    agenda: '',
    duration_minutes: 30
  });

  const [newReport, setNewReport] = useState({
    student_id: '',
    report_period: '',
    attendance_percentage: 0,
    behavioral_notes: '',
    strengths: '',
    areas_for_improvement: '',
    shared_with_parents: false
  });

  useEffect(() => {
    fetchData();
  }, [teacherData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStudents(),
        fetchMeetings(),
        fetchProgressReports()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id')
      .eq('instructor_id', teacherData.user_id);

    if (coursesData) {
      const courseIds = coursesData.map(course => course.id);
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          user_profiles!enrollments_student_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          courses (
            course_name
          )
        `)
        .in('course_id', courseIds)
        .eq('status', 'enrolled');

      if (!error && data) {
        setStudents(data);
      }
    }
  };

  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from('parent_meetings')
      .select(`
        *,
        user_profiles!parent_meetings_student_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('teacher_id', teacherData.user_id)
      .order('meeting_date', { ascending: false });

    if (!error && data) {
      setMeetings(data);
    }
  };

  const fetchProgressReports = async () => {
    const { data, error } = await supabase
      .from('student_progress_reports')
      .select(`
        *,
        user_profiles!student_progress_reports_student_id_fkey (
          first_name,
          last_name
        ),
        courses (
          course_name
        )
      `)
      .eq('teacher_id', teacherData.user_id)
      .order('generated_at', { ascending: false });

    if (!error && data) {
      setProgressReports(data);
    }
  };

  const scheduleMeeting = async () => {
    try {
      // Simple front-end validation to avoid sending bad requests
      if (!newMeeting.student_id) {
        toast({ title: 'Error', description: 'Please select a student', variant: 'destructive' });
        return;
      }

      if (!newMeeting.meeting_date) {
        toast({ title: 'Error', description: 'Please select a meeting date and time', variant: 'destructive' });
        return;
      }
      // Use meetingService for video calls to create room automatically
      if (newMeeting.meeting_type === 'video_call') {
        const meeting = await meetingService.createMeeting({
          teacher_id: teacherData.user_id,
          student_id: newMeeting.student_id,
          parent_id: newMeeting.parent_id || undefined,
          meeting_date: newMeeting.meeting_date,
          meeting_type: 'video_call',
          agenda: newMeeting.agenda || undefined
        });

        if (!meeting) throw new Error('Failed to create meeting');

        toast({
          title: 'Success',
          description: 'Video meeting scheduled successfully with room created'
        });
      } else {
        // For non-video meetings, use regular insert
        const { error } = await supabase
          .from('parent_meetings')
          .insert({
            ...newMeeting,
            teacher_id: teacherData.user_id,
            status: 'scheduled'
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Meeting scheduled successfully'
        });
      }

      setNewMeeting({
        student_id: '',
        parent_id: '',
        meeting_date: '',
        meeting_type: 'in_person',
        agenda: '',
        duration_minutes: 30
      });

      fetchMeetings();
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule meeting',
        variant: 'destructive'
      });
    }
  };

  const startVideoCall = (meeting: any) => {
    if (!meeting.meeting_url) {
      toast({
        title: 'Error',
        description: 'Video call URL not available. Please reschedule the meeting.',
        variant: 'destructive'
      });
      return;
    }
    setCurrentMeeting(meeting);
    setIsVideoCallOpen(true);
  };

  const createProgressReport = async () => {
    try {
      const { error } = await supabase
        .from('student_progress_reports')
        .insert({
          ...newReport,
          teacher_id: teacherData.user_id,
          course_id: students.find(s => s.student_id === newReport.student_id)?.course_id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Progress report created successfully'
      });

      setNewReport({
        student_id: '',
        report_period: '',
        attendance_percentage: 0,
        behavioral_notes: '',
        strengths: '',
        areas_for_improvement: '',
        shared_with_parents: false
      });

      fetchProgressReports();
    } catch (error) {
      console.error('Error creating progress report:', error);
      toast({
        title: 'Error',
        description: 'Failed to create progress report',
        variant: 'destructive'
      });
    }
  };

  const shareReportWithParents = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('student_progress_reports')
        .update({ shared_with_parents: true })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Report shared with parents'
      });

      fetchProgressReports();
    } catch (error) {
      console.error('Error sharing report:', error);
      toast({
        title: 'Error',
        description: 'Failed to share report',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="meetings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="meetings" className="text-xs sm:text-sm">Parent Meetings</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm">Progress Reports</TabsTrigger>
        </TabsList>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-base sm:text-lg">Parent Meetings</span>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 w-full sm:w-auto text-xs sm:text-sm">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      Schedule Meeting
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">Schedule Parent Meeting</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select
                        value={newMeeting.student_id}
                        onValueChange={(value) => setNewMeeting({...newMeeting, student_id: value})}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.student_id} value={student.student_id}>
                              {student.user_profiles?.first_name} {student.user_profiles?.last_name} - {student.courses?.course_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="datetime-local"
                        value={newMeeting.meeting_date}
                        onChange={(e) => setNewMeeting({...newMeeting, meeting_date: e.target.value})}
                        className="text-sm"
                      />

                      <Select
                        value={newMeeting.meeting_type}
                        onValueChange={(value) => setNewMeeting({...newMeeting, meeting_type: value})}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Meeting type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_person">In Person</SelectItem>
                          <SelectItem value="video_call">Video Call</SelectItem>
                          <SelectItem value="phone_call">Phone Call</SelectItem>
                        </SelectContent>
                      </Select>

                      <Textarea
                        placeholder="Meeting agenda"
                        value={newMeeting.agenda}
                        onChange={(e) => setNewMeeting({...newMeeting, agenda: e.target.value})}
                        className="text-sm"
                      />

                      {newMeeting.meeting_type === 'video_call' && (
                        <div>
                          <label className="text-xs sm:text-sm font-medium mb-2 block">
                            Duration (minutes)
                          </label>
                          <Input
                            type="number"
                            min="15"
                            max="120"
                            value={newMeeting.duration_minutes}
                            onChange={(e) => setNewMeeting({...newMeeting, duration_minutes: parseInt(e.target.value) || 30})}
                            className="text-sm"
                          />
                        </div>
                      )}

                      <Button onClick={scheduleMeeting} className="w-full text-sm">
                        Schedule Meeting
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <p className="text-center py-4 text-sm">No meetings scheduled</p>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <Card key={meeting.id}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="space-y-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <p className="font-medium text-sm sm:text-base">
                                {meeting.user_profiles?.first_name} {meeting.user_profiles?.last_name}
                              </p>
                              <Badge variant={meeting.status === 'scheduled' ? 'default' : 'secondary'} className="text-xs">
                                {meeting.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                {meeting.meeting_type === 'in_person' && <Users className="h-3 w-3" />}
                                {meeting.meeting_type === 'video_call' && <Video className="h-3 w-3" />}
                                {meeting.meeting_type === 'phone_call' && <Phone className="h-3 w-3" />}
                                <span>{meeting.meeting_type.replace('_', ' ')}</span>
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm">{meeting.agenda}</p>
                            <p className="text-xs mt-1">
                              {new Date(meeting.meeting_date).toLocaleDateString()} at {new Date(meeting.meeting_date).toLocaleTimeString()}
                            </p>
                            {meeting.notes && (
                              <div className="text-xs sm:text-sm mt-2 p-2 bg-muted rounded">
                                <span className="font-medium">Notes:</span> {meeting.notes}
                              </div>
                            )}
                            
                            {/* Video Call Button */}
                            {meeting.meeting_type === 'video_call' && meeting.status === 'scheduled' && permissions.schedule_ptm_meetings && (
                              <div className="mt-3">
                                <Button 
                                  onClick={() => startVideoCall(meeting)}
                                  className="w-full sm:w-auto flex items-center gap-2"
                                  size="sm"
                                  variant="default"
                                >
                                  <Video className="h-4 w-4" />
                                  Start Video Call
                                </Button>
                                {meeting.meeting_url && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Room ready
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Reports Tab */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-base sm:text-lg">Progress Reports</span>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 w-full sm:w-auto text-xs sm:text-sm">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      Create Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">Create Progress Report</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto px-1">
                      <Select
                        value={newReport.student_id}
                        onValueChange={(value) => setNewReport({...newReport, student_id: value})}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.student_id} value={student.student_id}>
                              {student.user_profiles?.first_name} {student.user_profiles?.last_name} - {student.courses?.course_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Report period (e.g., Q1 2024)"
                        value={newReport.report_period}
                        onChange={(e) => setNewReport({...newReport, report_period: e.target.value})}
                        className="text-sm"
                      />

                      <Input
                        type="number"
                        placeholder="Attendance percentage"
                        value={newReport.attendance_percentage}
                        onChange={(e) => setNewReport({...newReport, attendance_percentage: parseFloat(e.target.value) || 0})}
                        className="text-sm"
                      />

                      <Textarea
                        placeholder="Behavioral notes"
                        value={newReport.behavioral_notes}
                        onChange={(e) => setNewReport({...newReport, behavioral_notes: e.target.value})}
                        className="text-sm"
                      />

                      <Textarea
                        placeholder="Strengths"
                        value={newReport.strengths}
                        onChange={(e) => setNewReport({...newReport, strengths: e.target.value})}
                        className="text-sm"
                      />

                      <Textarea
                        placeholder="Areas for improvement"
                        value={newReport.areas_for_improvement}
                        onChange={(e) => setNewReport({...newReport, areas_for_improvement: e.target.value})}
                        className="text-sm"
                      />

                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newReport.shared_with_parents}
                          onChange={(e) => setNewReport({...newReport, shared_with_parents: e.target.checked})}
                          className="cursor-pointer"
                        />
                        Share with parents immediately
                      </label>

                      <Button onClick={createProgressReport} className="w-full text-sm">
                        Create Report
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progressReports.length === 0 ? (
                <p className="text-center py-4 text-sm">No progress reports created</p>
              ) : (
                <div className="space-y-3">
                  {progressReports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="space-y-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <p className="font-medium text-sm sm:text-base">
                                {report.user_profiles?.first_name} {report.user_profiles?.last_name}
                              </p>
                              <Badge variant="outline" className="text-xs">{report.courses?.course_name}</Badge>
                              <Badge variant="secondary" className="text-xs">{report.report_period}</Badge>
                              {report.shared_with_parents && (
                                <Badge variant="default" className="text-xs">Shared</Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs sm:text-sm">
                              <div>
                                <p className="font-medium">Attendance</p>
                                <p>{report.attendance_percentage}%</p>
                              </div>
                              <div>
                                <p className="font-medium">Strengths</p>
                                <p className="line-clamp-2">{report.strengths || 'Not specified'}</p>
                              </div>
                              <div>
                                <p className="font-medium">Areas for Improvement</p>
                                <p className="line-clamp-2">{report.areas_for_improvement || 'Not specified'}</p>
                              </div>
                            </div>

                            {report.behavioral_notes && (
                              <div className="mt-3 p-2 border rounded">
                                <p className="text-xs sm:text-sm font-medium">Behavioral Notes:</p>
                                <p className="text-xs sm:text-sm mt-1">{report.behavioral_notes}</p>
                              </div>
                            )}

                            <p className="text-xs mt-2">
                              Generated: {new Date(report.generated_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          {!report.shared_with_parents && (
                            <div className="flex justify-end pt-2 border-t">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => shareReportWithParents(report.id)}
                                className="text-xs sm:text-sm"
                              >
                                <Share className="h-3 w-3 mr-1" />
                                Share
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Video Call Modal */}
      {currentMeeting && (
        <VideoCallModal
          isOpen={isVideoCallOpen}
          onClose={() => {
            setIsVideoCallOpen(false);
            setCurrentMeeting(null);
            fetchMeetings(); // Refresh to show updated status
          }}
          meetingUrl={currentMeeting.meeting_url}
          meetingId={currentMeeting.id}
          userId={teacherData.user_id}
          userName={`${teacherData.first_name} ${teacherData.last_name}`}
          userRole="teacher"
        />
      )}
    </div>
  );
};

export default TeacherParentInteraction;
