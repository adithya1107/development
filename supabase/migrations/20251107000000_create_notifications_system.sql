-- Create notifications system
-- Migration: 20251107000000_create_notifications_system.sql

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
