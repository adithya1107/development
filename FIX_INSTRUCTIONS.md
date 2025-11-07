# Fix for Video Call and Notifications Errors

## Problem
Your application is showing these errors:
1. ❌ `Could not find the 'meeting_url' column of 'parent_meetings'` - Missing video call columns
2. ❌ `new row violates row-level security policy for table "notifications"` - Missing notifications table

## Solution

### Quick Fix (5 minutes)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/dfqmkjywdzbpysjwllgx/sql

2. **Run the Migration SQL**
   - Open the file: `apply_migrations.sql` (in the root of this project)
   - Copy ALL the SQL content
   - Paste it into the Supabase SQL Editor
   - Click "Run" button (or press Cmd/Ctrl + Enter)

3. **Verify Success**
   - You should see "Success. No rows returned" message
   - The migrations will add:
     - ✅ `meeting_url`, `video_room_id`, `duration_minutes`, `participants` columns to `parent_meetings` table
     - ✅ New `notifications` table with proper RLS policies
     - ✅ Helper functions for managing notifications

4. **Restart Your Dev Server**
   ```bash
   npm run dev
   ```

5. **Test the Video Call Feature**
   - Schedule a new parent-teacher meeting
   - Verify no errors in the console
   - The meeting should be created with a video URL

## What Was Fixed

### 1. Video Call Support
- Added columns to `parent_meetings` table for storing video call information
- Created indexes for better query performance
- Added RPC functions to fetch upcoming meetings
- Set up automatic timestamp updates

### 2. Notifications System
- Created `notifications` table for system-wide notifications
- Set up Row Level Security (RLS) policies so users can only see their own notifications
- Added helper functions:
  - `get_unread_notification_count(user_id)` - Get count of unread notifications
  - `mark_all_notifications_read(user_id)` - Mark all as read
- Created indexes for fast notification queries

## Alternative: Manual Steps

If you prefer to apply migrations step-by-step:

### Step 1: Add Video Call Columns
```sql
ALTER TABLE parent_meetings
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS video_room_id TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;
```

### Step 2: Create Notifications Table
```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Step 3: Enable RLS
```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = recipient_id);

CREATE POLICY "Authenticated users can insert notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
```

## Troubleshooting

### Still seeing errors?
1. Make sure you're logged into the correct Supabase project
2. Check that your user has proper permissions
3. Clear browser cache and reload the page
4. Check browser console for any new errors

### Need help?
- Check migration files in `supabase/migrations/` directory
- Review the SQL in `apply_migrations.sql`
- Ensure all previous migrations have been applied

## Files Created
- ✅ `apply_migrations.sql` - Complete SQL to run in Supabase
- ✅ `supabase/migrations/20251107000000_create_notifications_system.sql` - Notifications migration
- ✅ `supabase/migrations/20251101000000_add_video_call_fields_to_meetings.sql` - Video call migration (already existed)

---

**After applying these migrations, your video calls and notifications will work correctly! 🎉**
