# PTM Video Call Integration - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Apply Database Migration
```bash
# Navigate to your project directory
cd /Users/jeevithg/Documents/Colcord\ AI/development

# Apply the migration (if using Supabase CLI)
npx supabase db push

# Or manually run the SQL file in Supabase Dashboard:
# Go to SQL Editor → paste contents of:
# supabase/migrations/20251101000000_add_video_call_fields_to_meetings.sql
```

### Step 2: Set Up Daily.co (Optional for Testing)

#### Option A: With Daily.co API (Recommended)
1. Visit https://www.daily.co and sign up (free)
2. Get your API key from Dashboard → Developers
3. Create `.env.local` file in project root:
```env
VITE_DAILY_API_KEY=your_api_key_here
```

#### Option B: Without API Key (Development Mode)
The system will use fallback URLs for development. Video calls will still work but rooms won't be automatically managed.

### Step 3: Restart Development Server
```bash
npm run dev
```

## 📱 Testing the Integration

### As a Teacher:

1. **Log in as a teacher**
2. Navigate to **Parent** tab in sidebar
3. Click **"Schedule Meeting"**
4. Fill in the form:
   - Select a student
   - Choose date/time
   - Select **"Video Call"** as meeting type
   - Set duration (15-120 minutes)
   - Add agenda
5. Click **"Schedule Meeting"**
6. ✅ You should see the meeting with "Start Video Call" button
7. Click **"Start Video Call"** to join

### As a Parent:

1. **Log in as a parent**
2. Navigate to **Events & Meetings** tab
3. Select your child from dropdown
4. Scroll to **"Meeting History"** section
5. Find the scheduled video meeting
6. Wait until **15 minutes before** the meeting time
7. Click **"Join Video Call"** button
8. ✅ Video interface should load

### In the Video Call:

- **Microphone button** - Mute/unmute (bottom left)
- **Camera button** - Turn video on/off (bottom center)
- **Phone button** - Leave call (bottom right, red)
- **Participant count** - Shows number of people in call (top right)
- **Call duration** - Running timer (top left)

## 🔍 Verification Checklist

### Database:
- [ ] Migration applied successfully
- [ ] `parent_meetings` table has new columns:
  - `meeting_url`
  - `video_room_id`
  - `duration_minutes`
  - `participants`
- [ ] RPC functions exist:
  - `get_teacher_upcoming_meetings`
  - `get_parent_upcoming_meetings`

### Frontend:
- [ ] No TypeScript errors in terminal
- [ ] Teacher can schedule video meetings
- [ ] Parent can see scheduled meetings
- [ ] Video call modal opens correctly
- [ ] Camera/microphone permissions requested
- [ ] Call controls work (mute, camera, leave)

### Permissions:
- [ ] Teachers have `schedule_ptm_meetings` permission
- [ ] Parents have `join_ptm_meetings` permission
- [ ] Both have `view_ptm_meetings` permission

## 🐛 Quick Troubleshooting

### Issue: "Failed to join call"
**Solution:** Check browser console for errors. Grant camera/microphone permissions.

### Issue: "Video call URL not available"
**Solution:** 
1. Check if migration was applied
2. Verify meeting was created with meeting_type='video_call'
3. Check if VITE_DAILY_API_KEY is set (or accept fallback mode)

### Issue: "Join Call" button is disabled
**Solution:** Wait until 15 minutes before the meeting start time.

### Issue: TypeScript errors
**Solution:** 
```bash
# Regenerate Supabase types
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Issue: Daily.co API errors
**Solution:**
- Verify API key is correct in `.env.local`
- Check Daily.co dashboard for usage limits
- System works in fallback mode without API key

## 📊 Quick Feature Overview

| Feature | Status | Notes |
|---------|--------|-------|
| Schedule video meetings | ✅ | Teachers only |
| Join video calls | ✅ | Teachers & parents |
| Mute/unmute | ✅ | In-call controls |
| Camera on/off | ✅ | In-call controls |
| Participant tracking | ✅ | Database logging |
| Real-time updates | ✅ | Supabase realtime |
| Notifications | ✅ | In-app notifications |
| Duration limit | ✅ | 15-120 minutes |
| Join window | ✅ | 15 min before meeting |
| Screen sharing | ❌ | Future enhancement |
| Recording | ❌ | Future enhancement |
| In-call chat | ❌ | Future enhancement |

## 📞 Support

- **Documentation:** See `PTM_VIDEO_CALL_IMPLEMENTATION.md` for detailed info
- **Daily.co Docs:** https://docs.daily.co
- **Supabase Docs:** https://supabase.com/docs

## ✨ Next Steps

After successful testing:
1. Configure production Daily.co API key
2. Set up email notifications (optional)
3. Add SMS reminders (optional)
4. Enable screen sharing (optional)
5. Add meeting recording (optional)

---

**Implementation Date:** November 1, 2025  
**Version:** 1.0.0 MVP  
**Status:** ✅ Ready for Testing
