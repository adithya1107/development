-- Add video call fields to parent_meetings table
-- Migration: 20251101000000_add_video_call_fields_to_meetings.sql

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
