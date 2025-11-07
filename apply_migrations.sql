-- Apply missing migrations to fix video call and notifications
-- Run this SQL in the Supabase SQL Editor: https://supabase.com/dashboard/project/dfqmkjywdzbpysjwllgx/sql

-- ======================================
-- 1. ADD VIDEO CALL FIELDS TO MEETINGS
-- ======================================

-- Add new columns for video call integration
ALTER TABLE parent_meetings
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS video_room_id TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;

-- Add index for efficient room lookups
CREATE INDEX IF NOT EXISTS idx_parent_meetings_video_room_id 
  ON parent_meetings(video_room_id) 
  WHERE video_room_id IS NOT NULL;

-- Add index for meeting date queries
CREATE INDEX IF NOT EXISTS idx_parent_meetings_date_status 
  ON parent_meetings(meeting_date, status);

-- Update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_parent_meetings_updated_at'
    ) THEN
        CREATE TRIGGER update_parent_meetings_updated_at
            BEFORE UPDATE ON parent_meetings
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN parent_meetings.meeting_url IS 'Daily.co or Jitsi meeting room URL for video calls';
COMMENT ON COLUMN parent_meetings.video_room_id IS 'Unique identifier for the video room from the provider';
COMMENT ON COLUMN parent_meetings.duration_minutes IS 'Expected duration of the meeting in minutes';
COMMENT ON COLUMN parent_meetings.participants IS 'JSON array tracking participants who joined: [{user_id, joined_at, left_at}]';

-- Create RPC function to get upcoming meetings for teachers
CREATE OR REPLACE FUNCTION get_teacher_upcoming_meetings(teacher_uuid UUID, days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  meeting_id UUID,
  meeting_date TIMESTAMP WITH TIME ZONE,
  meeting_type TEXT,
  status TEXT,
  student_name TEXT,
  parent_name TEXT,
  parent_id UUID,
  student_id UUID,
  meeting_url TEXT,
  agenda TEXT,
  duration_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id as meeting_id,
    pm.meeting_date,
    pm.meeting_type,
    pm.status,
    CONCAT(s.first_name, ' ', s.last_name) as student_name,
    CONCAT(p.first_name, ' ', p.last_name) as parent_name,
    pm.parent_id,
    pm.student_id,
    pm.meeting_url,
    pm.agenda,
    pm.duration_minutes
  FROM parent_meetings pm
  JOIN user_profiles s ON pm.student_id = s.id
  LEFT JOIN user_profiles p ON pm.parent_id = p.id
  WHERE pm.teacher_id = teacher_uuid
    AND pm.meeting_date >= NOW()
    AND pm.meeting_date <= NOW() + (days_ahead || ' days')::INTERVAL
    AND pm.status IN ('scheduled', 'in_progress')
  ORDER BY pm.meeting_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to get upcoming meetings for parents
CREATE OR REPLACE FUNCTION get_parent_upcoming_meetings(parent_uuid UUID, days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  meeting_id UUID,
  meeting_date TIMESTAMP WITH TIME ZONE,
  meeting_type TEXT,
  status TEXT,
  teacher_name TEXT,
  student_name TEXT,
  teacher_id UUID,
  student_id UUID,
  meeting_url TEXT,
  agenda TEXT,
  duration_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id as meeting_id,
    pm.meeting_date,
    pm.meeting_type,
    pm.status,
    CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
    CONCAT(s.first_name, ' ', s.last_name) as student_name,
    pm.teacher_id,
    pm.student_id,
    pm.meeting_url,
    pm.agenda,
    pm.duration_minutes
  FROM parent_meetings pm
  JOIN user_profiles t ON pm.teacher_id = t.id
  JOIN user_profiles s ON pm.student_id = s.id
  WHERE pm.parent_id = parent_uuid
    AND pm.meeting_date >= NOW()
    AND pm.meeting_date <= NOW() + (days_ahead || ' days')::INTERVAL
    AND pm.status IN ('scheduled', 'in_progress')
  ORDER BY pm.meeting_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_teacher_upcoming_meetings(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_parent_upcoming_meetings(UUID, INTEGER) TO authenticated;

-- ======================================
-- 2. CREATE NOTIFICATIONS SYSTEM
-- ======================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('meeting', 'fee', 'announcement', 'alert', 'message', 'general')),
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- RLS Policies
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
  ON public.notifications
  FOR SELECT 
  USING (auth.uid() = recipient_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
  ON public.notifications
  FOR UPDATE 
  USING (auth.uid() = recipient_id);

-- Authenticated users can insert notifications (for system notifications)
CREATE POLICY "Authenticated users can insert notifications" 
  ON public.notifications
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" 
  ON public.notifications
  FOR DELETE 
  USING (auth.uid() = recipient_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at_trigger ON public.notifications;
CREATE TRIGGER update_notifications_updated_at_trigger
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM public.notifications 
    WHERE recipient_id = user_id AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications 
  SET is_read = true 
  WHERE recipient_id = user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.notifications IS 'System-wide notifications for all users';
COMMENT ON COLUMN public.notifications.recipient_id IS 'User who should receive this notification';
COMMENT ON COLUMN public.notifications.notification_type IS 'Type of notification: meeting, fee, announcement, alert, message, or general';
COMMENT ON COLUMN public.notifications.action_url IS 'Optional URL to navigate when notification is clicked';
COMMENT ON COLUMN public.notifications.is_read IS 'Whether the user has read this notification';
