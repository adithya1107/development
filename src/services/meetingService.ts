/**
 * Meeting Service
 * Handles video call room creation, participant management, and meeting lifecycle
 * Uses Daily.co API for video conferencing
 */

import { supabase } from '@/integrations/supabase/client';

// Daily.co API configuration
// NOTE: For development convenience we allow a hardcoded fallback key when
// `VITE_DAILY_API_KEY` is not set. This should NOT be used in production.
const DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY || '3fe845093b0acb59f24cf8236660b0d072e21005bdb99579cc0b389a0b151a15';
const DAILY_API_URL = 'https://api.daily.co/v1';

// Types
export interface Meeting {
  id: string;
  teacher_id: string;
  student_id: string;
  parent_id: string | null;
  meeting_date: string;
  meeting_type: string | null;
  status: string | null;
  agenda: string | null;
  notes: string | null;
  meeting_url: string | null;
  video_room_id: string | null;
  duration_minutes: number | null;
  participants: Participant[];
  created_at: string;
  updated_at: string;
}

export interface Participant {
  user_id: string;
  user_name: string;
  joined_at: string;
  left_at?: string;
}

export interface CreateMeetingData {
  teacher_id: string;
  student_id: string;
  parent_id?: string;
  meeting_date: string;
  meeting_type: 'video_call' | 'in_person' | 'phone_call';
  agenda?: string;
  duration_minutes?: number;
}

export interface DailyRoomConfig {
  name?: string;
  privacy?: 'public' | 'private';
  properties?: {
    exp?: number; // Unix timestamp for room expiration
    enable_chat?: boolean;
    enable_screenshare?: boolean;
    enable_recording?: string;
    max_participants?: number;
  };
}

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  api_created: boolean;
  privacy: string;
  config: any;
  created_at: string;
}

class MeetingService {
  /**
   * Create a new meeting with video room
   */
  async createMeeting(meetingData: CreateMeetingData): Promise<Meeting | null> {
    try {
      console.log('Creating meeting:', meetingData);

      // 1. Insert meeting record
      // Build insert payload without sending columns that may not exist in some dev DBs
      const insertPayload: any = {
        teacher_id: meetingData.teacher_id,
        student_id: meetingData.student_id,
        parent_id: meetingData.parent_id || null,
        meeting_date: meetingData.meeting_date,
        meeting_type: meetingData.meeting_type,
        agenda: meetingData.agenda || null,
        status: 'scheduled'
      };

      // NOTE: `duration_minutes` caused PGRST204 in some dev DBs where the column
      // is missing from the schema cache. We avoid sending it here until schema is
      // updated across environments. Long-term fix: add column via migration.

      const { data: meeting, error: insertError } = await supabase
        .from('parent_meetings')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert meeting:', insertError);
        try {
          // Log detailed error object to help debug 400s from PostgREST
          console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        } catch (e) {
          // ignore serialization errors
        }
        throw insertError;
      }

      // 2. If it's a video call, create video room
      if (meetingData.meeting_type === 'video_call' && meeting) {
        const videoRoom = await this.createVideoRoom(meeting.id);
        
        if (videoRoom) {
          // Build a merged meeting object that contains the room info locally. Even if
          // the DB update fails (missing columns), we'll return this merged object so
          // the UI has the room URL to join immediately.
          const mergedMeeting = {
            ...(meeting as any),
            meeting_url: videoRoom.url,
            video_room_id: videoRoom.name
          } as Meeting;

          // 3. Update meeting with room URL and ID in DB (best-effort)
          const { data: updatedMeeting, error: updateError } = await supabase
            .from('parent_meetings')
            .update({ 
              meeting_url: videoRoom.url,
              video_room_id: videoRoom.name
            } as any)
            .eq('id', meeting.id)
            .select()
            .single();

          if (updateError) {
            console.error('Failed to update meeting with video room:', updateError);
            try {
              console.error('Update error details:', JSON.stringify(updateError, null, 2));
            } catch (e) {}

            if ((updateError as any)?.code === 'PGRST204') {
              console.warn('Database schema appears to be missing video call columns. Apply the migration to fix this: supabase/migrations/20251101000000_add_video_call_fields_to_meetings.sql');
            }

            // 4a. Send notifications using the merged meeting so recipients receive the room URL
            await this.sendMeetingNotifications(mergedMeeting);
            return mergedMeeting;
          } else {
            // 4b. Update succeeded, send notifications using the persisted record
            await this.sendMeetingNotifications((updatedMeeting as Meeting) || (meeting as Meeting));
            return (updatedMeeting as Meeting) || (meeting as Meeting);
          }
        }
      } else {
        // For non-video meetings, just send notifications
        await this.sendMeetingNotifications(meeting as Meeting);
      }

      return meeting as Meeting;
    } catch (error) {
      console.error('Failed to create meeting:', error);
      return null;
    }
  }

  /**
   * Create a Daily.co video room
   */
  private async createVideoRoom(meetingId: string): Promise<DailyRoom | null> {
    try {
      // Check if API key is configured
      if (!DAILY_API_KEY) {
        console.warn('Daily.co API key not configured. Using fallback URL.');
        // Return a mock room for development
        return {
          id: meetingId,
          name: `ptm-${meetingId}`,
          url: `https://colcord.daily.co/ptm-${meetingId}`,
          api_created: false,
          privacy: 'private',
          config: {},
          created_at: new Date().toISOString()
        };
      }

      const roomConfig: DailyRoomConfig = {
        name: `ptm-${meetingId}`,
        privacy: 'private',
        properties: {
          enable_chat: true,
          enable_screenshare: false, // Disabled for MVP
          max_participants: 2, // Teacher and parent only
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // Expires in 24 hours
        }
      };

      const response = await fetch(`${DAILY_API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DAILY_API_KEY}`
        },
        body: JSON.stringify(roomConfig)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Daily.co API error:', error);
        throw new Error(`Failed to create room: ${response.statusText}`);
      }

      const room: DailyRoom = await response.json();
      console.log('Video room created:', room.url);
      return room;
    } catch (error) {
      console.error('Failed to create video room:', error);
      return null;
    }
  }

  /**
   * Get a meeting by ID
   */
  async getMeeting(meetingId: string): Promise<Meeting | null> {
    try {
      const { data, error } = await supabase
        .from('parent_meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (error) throw error;
      return data as Meeting;
    } catch (error) {
      console.error('Failed to fetch meeting:', error);
      return null;
    }
  }

  /**
   * Track participant joining a meeting
   */
  async joinMeeting(meetingId: string, userId: string, userName: string): Promise<boolean> {
    try {
      // Get current meeting
      const meeting = await this.getMeeting(meetingId);
      if (!meeting) return false;

      // Add participant to array
      const participants: Participant[] = meeting.participants || [];
      const existingParticipant = participants.find(p => p.user_id === userId);

      if (!existingParticipant) {
        participants.push({
          user_id: userId,
          user_name: userName,
          joined_at: new Date().toISOString()
        });

        // Update meeting
        const { error } = await supabase
          .from('parent_meetings')
          .update({ 
            participants,
            status: 'in_progress'
          })
          .eq('id', meetingId);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to join meeting:', error);
      return false;
    }
  }

  /**
   * Track participant leaving a meeting
   */
  async leaveMeeting(meetingId: string, userId: string): Promise<boolean> {
    try {
      const meeting = await this.getMeeting(meetingId);
      if (!meeting) return false;

      const participants: Participant[] = meeting.participants || [];
      const participantIndex = participants.findIndex(p => p.user_id === userId);

      if (participantIndex !== -1) {
        participants[participantIndex].left_at = new Date().toISOString();

        // Check if all participants have left
        const allLeft = participants.every(p => p.left_at);

        const { error } = await supabase
          .from('parent_meetings')
          .update({ 
            participants,
            status: allLeft ? 'completed' : 'in_progress'
          })
          .eq('id', meetingId);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to leave meeting:', error);
      return false;
    }
  }

  /**
   * End a meeting manually
   */
  async endMeeting(meetingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parent_meetings')
        .update({ 
          status: 'completed'
        })
        .eq('id', meetingId);

      if (error) throw error;

      // Optionally delete the Daily.co room
      // await this.deleteVideoRoom(videoRoomId);

      return true;
    } catch (error) {
      console.error('Failed to end meeting:', error);
      return false;
    }
  }

  /**
   * Send notifications for meeting creation/updates
   */
  private async sendMeetingNotifications(meeting: Meeting): Promise<void> {
    try {
      // Get user details
      const { data: teacher } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', meeting.teacher_id)
        .single();

      const { data: student } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', meeting.student_id)
        .single();

      const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Teacher';
      const studentName = student ? `${student.first_name} ${student.last_name}` : 'Student';

      // Notification for parent (using type assertion as notifications may not be in generated types)
      if (meeting.parent_id) {
        const notificationData = {
          recipient_id: meeting.parent_id,
          title: 'New PTM Scheduled',
          content: `${teacherName} has scheduled a ${meeting.meeting_type} meeting to discuss ${studentName}'s progress.`,
          notification_type: 'meeting',
          action_url: `/parent?view=events&meeting_id=${meeting.id}`,
          is_read: false
        };
        const { error: parentNotifError } = await (supabase as any).from('notifications').insert(notificationData);
        if (parentNotifError) {
          console.error('Failed to insert parent notification:', parentNotifError);
        }
      }

      // Notification for teacher (confirmation)
      const teacherNotificationData = {
        recipient_id: meeting.teacher_id,
        title: 'Meeting Scheduled',
        content: `Your ${meeting.meeting_type} meeting for ${studentName} has been scheduled successfully.`,
        notification_type: 'meeting',
        action_url: `/teacher?view=parent&meeting_id=${meeting.id}`,
        is_read: false
      };
      const { error: teacherNotifError } = await (supabase as any).from('notifications').insert(teacherNotificationData);
      if (teacherNotifError) {
        console.error('Failed to insert teacher notification:', teacherNotifError);
      }

      console.log('Meeting notifications sent');
    } catch (error) {
      console.error('Failed to send notifications:', error);
    }
  }

  /**
   * Get upcoming meetings for a teacher
   */
  async getTeacherMeetings(teacherId: string, daysAhead: number = 7): Promise<any[]> {
    try {
      const { data, error } = await (supabase.rpc as any)('get_teacher_upcoming_meetings', {
        teacher_uuid: teacherId,
        days_ahead: daysAhead
      });

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch teacher meetings:', error);
      return [];
    }
  }

  /**
   * Get upcoming meetings for a parent
   */
  async getParentMeetings(parentId: string, daysAhead: number = 7): Promise<any[]> {
    try {
      const { data, error } = await (supabase.rpc as any)('get_parent_upcoming_meetings', {
        parent_uuid: parentId,
        days_ahead: daysAhead
      });

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch parent meetings:', error);
      return [];
    }
  }

  /**
   * Update meeting status
   */
  async updateMeetingStatus(meetingId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parent_meetings')
        .update({ status })
        .eq('id', meetingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to update meeting status:', error);
      return false;
    }
  }

  /**
   * Delete a Daily.co room (optional cleanup)
   */
  private async deleteVideoRoom(roomName: string): Promise<boolean> {
    try {
      if (!DAILY_API_KEY) return false;

      const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`
        }
      });

      if (!response.ok) {
        console.error('Failed to delete room:', response.statusText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete video room:', error);
      return false;
    }
  }

  /**
   * Subscribe to meeting updates via Supabase Realtime
   */
  subscribeToMeetingUpdates(meetingId: string, callback: (meeting: any) => void) {
    const subscription = supabase
      .channel(`meeting:${meetingId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'parent_meetings',
        filter: `id=eq.${meetingId}`
      }, (payload) => {
        callback(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
}

// Export singleton instance
export const meetingService = new MeetingService();
