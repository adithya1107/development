-- Create storage buckets for proctoring videos and snapshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'proctoring-videos',
    'proctoring-videos',
    false, -- Private bucket
    524288000, -- 500 MB limit
    ARRAY['video/mp4', 'video/webm', 'video/quicktime']
  ),
  (
    'proctoring-snapshots',
    'proctoring-snapshots',
    false, -- Private bucket
    10485760, -- 10 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for proctoring-videos bucket
CREATE POLICY "Students can upload their own exam videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proctoring-videos' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM proctoring_sessions WHERE student_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own exam videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proctoring-videos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM proctoring_sessions WHERE student_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view all exam videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proctoring-videos'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND user_type IN ('faculty', 'admin')
  )
);

CREATE POLICY "Admins can manage all exam videos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'proctoring-videos'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND user_type = 'admin'
  )
);

-- Set up RLS policies for proctoring-snapshots bucket
CREATE POLICY "Students can upload their own snapshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proctoring-snapshots'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM proctoring_sessions WHERE student_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own snapshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proctoring-snapshots'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM proctoring_sessions WHERE student_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view all snapshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proctoring-snapshots'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND user_type IN ('faculty', 'admin')
  )
);

CREATE POLICY "Admins can manage all snapshots"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'proctoring-snapshots'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND user_type = 'admin'
  )
);

-- Create a function to automatically delete old snapshots (lifecycle policy)
CREATE OR REPLACE FUNCTION delete_old_proctoring_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete snapshots older than 90 days
  DELETE FROM storage.objects
  WHERE bucket_id = 'proctoring-snapshots'
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Create a function to automatically archive old videos
CREATE OR REPLACE FUNCTION archive_old_proctoring_videos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- In production, you might want to:
  -- 1. Move videos to cold storage
  -- 2. Compress videos
  -- 3. Update database records
  
  -- For now, just log that videos are ready for archival
  -- Videos older than 180 days could be archived
  RAISE NOTICE 'Videos ready for archival: %', (
    SELECT COUNT(*)
    FROM storage.objects
    WHERE bucket_id = 'proctoring-videos'
      AND created_at < NOW() - INTERVAL '180 days'
  );
END;
$$;

-- Schedule automatic cleanup (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule(
--   'cleanup-old-snapshots',
--   '0 2 * * 0', -- Every Sunday at 2 AM
--   'SELECT delete_old_proctoring_snapshots();'
-- );

-- Create indexes for faster bucket queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_name 
ON storage.objects(bucket_id, name);

CREATE INDEX IF NOT EXISTS idx_storage_objects_created_at 
ON storage.objects(bucket_id, created_at);

-- Add helpful comments
COMMENT ON FUNCTION delete_old_proctoring_snapshots() IS 
'Automatically deletes proctoring snapshots older than 90 days to manage storage costs';

COMMENT ON FUNCTION archive_old_proctoring_videos() IS 
'Identifies proctoring videos older than 180 days that should be archived to cold storage';

-- Grant execute permissions to authenticated users for lifecycle functions
-- (Only admins should actually run these via scheduled jobs)
GRANT EXECUTE ON FUNCTION delete_old_proctoring_snapshots() TO service_role;
GRANT EXECUTE ON FUNCTION archive_old_proctoring_videos() TO service_role;
