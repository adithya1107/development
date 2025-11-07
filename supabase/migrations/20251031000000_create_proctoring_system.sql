-- =====================================================
-- AI Proctoring System - Complete Database Schema
-- Created: 2025-10-31
-- Description: Comprehensive proctoring system with real-time monitoring,
--              AI detection, violation tracking, and evidence storage
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Proctoring session status
CREATE TYPE proctoring_session_status AS ENUM (
  'pending',        -- Session created, not started
  'active',         -- Currently monitoring
  'paused',         -- Temporarily paused (network issues)
  'completed',      -- Successfully completed
  'terminated',     -- Manually terminated by proctor
  'failed'          -- Technical failure
);

-- Event types detected during proctoring
CREATE TYPE proctoring_event_type AS ENUM (
  'multiple_faces',           -- More than one person detected
  'no_face',                  -- No face visible
  'face_not_matching',        -- Face doesn't match enrolled student
  'looking_away',             -- Extended gaze away from screen
  'object_detected',          -- Phone, book, or other object
  'audio_conversation',       -- Multiple voices detected
  'audio_unusual',            -- Unusual audio patterns
  'tab_switch',               -- Changed browser tab
  'window_switch',            -- Changed application window
  'screen_share_detected',    -- Screen sharing active
  'fullscreen_exit',          -- Exited fullscreen mode
  'browser_focus_lost',       -- Browser lost focus
  'copy_paste',               -- Copy/paste action detected
  'network_disconnection',    -- Connection lost
  'network_reconnection',     -- Connection restored
  'system_info'               -- General system event
);

-- Violation severity levels
CREATE TYPE violation_severity AS ENUM (
  'info',           -- Informational event
  'low',            -- Minor concern
  'medium',         -- Moderate concern  
  'high',           -- Serious violation
  'critical'        -- Critical violation requiring immediate action
);

-- Alert status for proctor notifications
CREATE TYPE alert_status AS ENUM (
  'pending',        -- New alert, not reviewed
  'acknowledged',   -- Proctor has seen the alert
  'reviewing',      -- Under review
  'resolved',       -- Resolved (false positive or handled)
  'escalated'       -- Escalated for further action
);

-- Violation types for categorization
CREATE TYPE violation_type AS ENUM (
  'identity_fraud',           -- Wrong person taking exam
  'unauthorized_assistance',  -- Help from another person
  'unauthorized_materials',   -- Using prohibited materials
  'technical_violation',      -- Technical rule violation
  'behavioral_anomaly',       -- Unusual behavior pattern
  'environmental_issue'       -- Environmental concerns
);

-- =====================================================
-- TABLES
-- =====================================================

-- Proctoring Settings (Configuration per exam)
CREATE TABLE proctoring_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES examinations(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  
  -- Basic settings
  is_enabled BOOLEAN DEFAULT true,
  require_webcam BOOLEAN DEFAULT true,
  require_microphone BOOLEAN DEFAULT true,
  require_screen_share BOOLEAN DEFAULT false,
  require_fullscreen BOOLEAN DEFAULT true,
  allow_tab_switching BOOLEAN DEFAULT false,
  
  -- AI Detection settings
  ai_face_detection_enabled BOOLEAN DEFAULT true,
  ai_object_detection_enabled BOOLEAN DEFAULT true,
  ai_gaze_tracking_enabled BOOLEAN DEFAULT true,
  ai_audio_analysis_enabled BOOLEAN DEFAULT true,
  ai_behavior_analysis_enabled BOOLEAN DEFAULT true,
  
  -- Thresholds and sensitivity
  face_detection_interval_seconds INTEGER DEFAULT 5,
  max_looking_away_duration_seconds INTEGER DEFAULT 10,
  max_no_face_duration_seconds INTEGER DEFAULT 5,
  audio_analysis_interval_seconds INTEGER DEFAULT 10,
  min_confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
  
  -- Alert settings
  auto_pause_on_critical_violation BOOLEAN DEFAULT false,
  notify_proctor_immediately BOOLEAN DEFAULT true,
  
  -- Recording settings
  record_full_session BOOLEAN DEFAULT true,
  record_violations_only BOOLEAN DEFAULT false,
  snapshot_interval_seconds INTEGER DEFAULT 30,
  video_quality TEXT DEFAULT 'medium', -- low, medium, high
  
  -- Allowed applications/URLs (JSON array)
  allowed_applications JSONB DEFAULT '[]'::jsonb,
  blocked_applications JSONB DEFAULT '[]'::jsonb,
  
  -- Custom rules (JSON configuration)
  custom_rules JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one exam or quiz is linked, not both
  CONSTRAINT check_exam_or_quiz CHECK (
    (exam_id IS NOT NULL AND quiz_id IS NULL) OR 
    (exam_id IS NULL AND quiz_id IS NOT NULL)
  )
);

CREATE INDEX idx_proctoring_settings_exam ON proctoring_settings(exam_id);
CREATE INDEX idx_proctoring_settings_quiz ON proctoring_settings(quiz_id);

-- Proctoring Sessions (One per student per exam)
CREATE TABLE proctoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  exam_id UUID REFERENCES examinations(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  exam_enrollment_id UUID REFERENCES exam_enrollments(id) ON DELETE SET NULL,
  quiz_submission_id UUID REFERENCES quiz_submissions(id) ON DELETE SET NULL,
  settings_id UUID REFERENCES proctoring_settings(id),
  
  -- Session details
  status proctoring_session_status DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Recording URLs
  video_recording_url TEXT,
  screen_recording_url TEXT,
  
  -- Device information
  device_info JSONB DEFAULT '{}'::jsonb, -- browser, OS, camera, microphone specs
  ip_address INET,
  
  -- Consent and verification
  consent_given BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  identity_verified BOOLEAN DEFAULT false,
  verification_method TEXT, -- 'face_match', 'id_card', 'manual'
  
  -- Summary statistics
  total_events INTEGER DEFAULT 0,
  total_violations INTEGER DEFAULT 0,
  critical_violations INTEGER DEFAULT 0,
  high_severity_violations INTEGER DEFAULT 0,
  medium_severity_violations INTEGER DEFAULT 0,
  low_severity_violations INTEGER DEFAULT 0,
  
  -- Review status
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  final_verdict TEXT, -- 'clear', 'suspicious', 'cheating_detected'
  
  -- Metadata
  college_id UUID NOT NULL REFERENCES colleges(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_exam_or_quiz_session CHECK (
    (exam_id IS NOT NULL AND quiz_id IS NULL) OR 
    (exam_id IS NULL AND quiz_id IS NOT NULL)
  )
);

CREATE INDEX idx_proctoring_sessions_student ON proctoring_sessions(student_id);
CREATE INDEX idx_proctoring_sessions_exam ON proctoring_sessions(exam_id);
CREATE INDEX idx_proctoring_sessions_quiz ON proctoring_sessions(quiz_id);
CREATE INDEX idx_proctoring_sessions_status ON proctoring_sessions(status);
CREATE INDEX idx_proctoring_sessions_college ON proctoring_sessions(college_id);
CREATE INDEX idx_proctoring_sessions_started ON proctoring_sessions(started_at);

-- Proctoring Events (All detected events during session)
CREATE TABLE proctoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
  
  -- Event details
  event_type proctoring_event_type NOT NULL,
  severity violation_severity DEFAULT 'info',
  timestamp TIMESTAMPTZ DEFAULT now(),
  
  -- Event data
  description TEXT,
  details JSONB DEFAULT '{}'::jsonb, -- AI confidence scores, detected objects, etc.
  
  -- Evidence
  snapshot_url TEXT,
  video_clip_url TEXT,
  audio_clip_url TEXT,
  
  -- AI Analysis
  ai_confidence DECIMAL(3,2), -- 0.00 to 1.00
  ai_model_version TEXT,
  
  -- Flag management
  is_flagged BOOLEAN DEFAULT false,
  flagged_by UUID REFERENCES user_profiles(id),
  flagged_at TIMESTAMPTZ,
  flag_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_proctoring_events_session ON proctoring_events(session_id);
CREATE INDEX idx_proctoring_events_type ON proctoring_events(event_type);
CREATE INDEX idx_proctoring_events_severity ON proctoring_events(severity);
CREATE INDEX idx_proctoring_events_timestamp ON proctoring_events(timestamp);
CREATE INDEX idx_proctoring_events_flagged ON proctoring_events(is_flagged) WHERE is_flagged = true;

-- Proctoring Violations (Significant events requiring review)
CREATE TABLE proctoring_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
  event_id UUID REFERENCES proctoring_events(id) ON DELETE CASCADE,
  
  -- Violation details
  violation_type violation_type NOT NULL,
  severity violation_severity NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  
  -- Description
  title TEXT NOT NULL,
  description TEXT,
  
  -- Evidence (can link multiple pieces)
  evidence_urls JSONB DEFAULT '[]'::jsonb, -- Array of URLs
  
  -- Review and action
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  action_taken TEXT,
  is_false_positive BOOLEAN DEFAULT false,
  
  -- Impact on exam
  marks_deducted INTEGER DEFAULT 0,
  exam_invalidated BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_proctoring_violations_session ON proctoring_violations(session_id);
CREATE INDEX idx_proctoring_violations_type ON proctoring_violations(violation_type);
CREATE INDEX idx_proctoring_violations_severity ON proctoring_violations(severity);
CREATE INDEX idx_proctoring_violations_reviewed ON proctoring_violations(reviewed);
CREATE INDEX idx_proctoring_violations_timestamp ON proctoring_violations(timestamp);

-- Proctoring Alerts (Real-time notifications for proctors)
CREATE TABLE proctoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
  event_id UUID REFERENCES proctoring_events(id) ON DELETE CASCADE,
  violation_id UUID REFERENCES proctoring_violations(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type proctoring_event_type NOT NULL,
  severity violation_severity NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  
  -- Status tracking
  status alert_status DEFAULT 'pending',
  
  -- Assignment
  assigned_to UUID REFERENCES user_profiles(id), -- Proctor assigned to handle
  acknowledged_by UUID REFERENCES user_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Escalation
  is_escalated BOOLEAN DEFAULT false,
  escalated_to UUID REFERENCES user_profiles(id),
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_proctoring_alerts_session ON proctoring_alerts(session_id);
CREATE INDEX idx_proctoring_alerts_status ON proctoring_alerts(status);
CREATE INDEX idx_proctoring_alerts_severity ON proctoring_alerts(severity);
CREATE INDEX idx_proctoring_alerts_assigned ON proctoring_alerts(assigned_to);
CREATE INDEX idx_proctoring_alerts_created ON proctoring_alerts(created_at);

-- Proctoring Interventions (Manual actions taken by proctors)
CREATE TABLE proctoring_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES proctoring_alerts(id),
  
  -- Intervention details
  intervention_type TEXT NOT NULL, -- 'warning', 'message', 'pause_exam', 'terminate_exam'
  message TEXT,
  
  -- Proctor who intervened
  intervened_by UUID NOT NULL REFERENCES user_profiles(id),
  intervened_at TIMESTAMPTZ DEFAULT now(),
  
  -- Student response
  student_acknowledged BOOLEAN DEFAULT false,
  student_response TEXT,
  student_acknowledged_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_proctoring_interventions_session ON proctoring_interventions(session_id);
CREATE INDEX idx_proctoring_interventions_type ON proctoring_interventions(intervention_type);

-- =====================================================
-- EXTEND EXISTING TABLES
-- =====================================================

-- Add proctoring flag to examinations table
ALTER TABLE examinations 
ADD COLUMN IF NOT EXISTS proctoring_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS proctoring_settings_id UUID REFERENCES proctoring_settings(id);

-- Add proctoring flag to quizzes table
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS proctoring_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS proctoring_settings_id UUID REFERENCES proctoring_settings(id);

-- Add proctoring session reference to exam_enrollments
ALTER TABLE exam_enrollments
ADD COLUMN IF NOT EXISTS proctoring_session_id UUID REFERENCES proctoring_sessions(id),
ADD COLUMN IF NOT EXISTS proctoring_status TEXT DEFAULT 'not_started'; -- not_started, in_progress, completed, flagged

-- Add proctoring session reference to quiz_submissions
ALTER TABLE quiz_submissions
ADD COLUMN IF NOT EXISTS proctoring_session_id UUID REFERENCES proctoring_sessions(id),
ADD COLUMN IF NOT EXISTS proctoring_status TEXT DEFAULT 'not_started';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_proctoring_settings_updated_at
  BEFORE UPDATE ON proctoring_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proctoring_sessions_updated_at
  BEFORE UPDATE ON proctoring_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proctoring_violations_updated_at
  BEFORE UPDATE ON proctoring_violations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proctoring_alerts_updated_at
  BEFORE UPDATE ON proctoring_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatically update session statistics when events are added
CREATE OR REPLACE FUNCTION update_session_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE proctoring_sessions
    SET 
      total_events = total_events + 1,
      updated_at = now()
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_stats_on_event
  AFTER INSERT ON proctoring_events
  FOR EACH ROW EXECUTE FUNCTION update_session_statistics();

-- Automatically update violation counts when violations are added
CREATE OR REPLACE FUNCTION update_violation_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE proctoring_sessions
    SET 
      total_violations = total_violations + 1,
      critical_violations = CASE WHEN NEW.severity = 'critical' THEN critical_violations + 1 ELSE critical_violations END,
      high_severity_violations = CASE WHEN NEW.severity = 'high' THEN high_severity_violations + 1 ELSE high_severity_violations END,
      medium_severity_violations = CASE WHEN NEW.severity = 'medium' THEN medium_severity_violations + 1 ELSE medium_severity_violations END,
      low_severity_violations = CASE WHEN NEW.severity = 'low' THEN low_severity_violations + 1 ELSE low_severity_violations END,
      updated_at = now()
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_stats_on_violation
  AFTER INSERT ON proctoring_violations
  FOR EACH ROW EXECUTE FUNCTION update_violation_statistics();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE proctoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_interventions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Proctoring Settings Policies
-- =====================================================

-- Teachers can view settings for their exams
CREATE POLICY proctoring_settings_teacher_view ON proctoring_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM examinations e
      WHERE e.id = proctoring_settings.exam_id
      AND e.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN learning_modules lm ON q.module_id = lm.id
      JOIN courses c ON lm.course_id = c.id
      WHERE q.id = proctoring_settings.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Teachers can create/update settings for their exams
CREATE POLICY proctoring_settings_teacher_modify ON proctoring_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM examinations e
      WHERE e.id = proctoring_settings.exam_id
      AND e.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN learning_modules lm ON q.module_id = lm.id
      JOIN courses c ON lm.course_id = c.id
      WHERE q.id = proctoring_settings.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY proctoring_settings_admin_all ON proctoring_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- =====================================================
-- Proctoring Sessions Policies
-- =====================================================

-- Students can view their own sessions
CREATE POLICY proctoring_sessions_student_view ON proctoring_sessions
  FOR SELECT
  USING (student_id = auth.uid());

-- Students can update their own sessions (status, consent, etc.)
CREATE POLICY proctoring_sessions_student_update ON proctoring_sessions
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Teachers can view sessions for their exams
CREATE POLICY proctoring_sessions_teacher_view ON proctoring_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM examinations e
      WHERE e.id = proctoring_sessions.exam_id
      AND e.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN learning_modules lm ON q.module_id = lm.id
      JOIN courses c ON lm.course_id = c.id
      WHERE q.id = proctoring_sessions.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Teachers can review sessions for their exams
CREATE POLICY proctoring_sessions_teacher_review ON proctoring_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM examinations e
      WHERE e.id = proctoring_sessions.exam_id
      AND e.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN learning_modules lm ON q.module_id = lm.id
      JOIN courses c ON lm.course_id = c.id
      WHERE q.id = proctoring_sessions.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY proctoring_sessions_admin_all ON proctoring_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- =====================================================
-- Proctoring Events Policies
-- =====================================================

-- Students can view events from their own sessions
CREATE POLICY proctoring_events_student_view ON proctoring_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proctoring_sessions
      WHERE id = proctoring_events.session_id
      AND student_id = auth.uid()
    )
  );

-- Teachers can view events for their exams
CREATE POLICY proctoring_events_teacher_view ON proctoring_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN examinations e ON ps.exam_id = e.id
      WHERE ps.id = proctoring_events.session_id
      AND e.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN quizzes q ON ps.quiz_id = q.id
      JOIN learning_modules lm ON q.module_id = lm.id
      JOIN courses c ON lm.course_id = c.id
      WHERE ps.id = proctoring_events.session_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Teachers can flag events
CREATE POLICY proctoring_events_teacher_flag ON proctoring_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN examinations e ON ps.exam_id = e.id
      WHERE ps.id = proctoring_events.session_id
      AND e.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN quizzes q ON ps.quiz_id = q.id
      JOIN learning_modules lm ON q.module_id = lm.id
      JOIN courses c ON lm.course_id = c.id
      WHERE ps.id = proctoring_events.session_id
      AND c.instructor_id = auth.uid()
    )
  );

-- System can insert events (via service role)
CREATE POLICY proctoring_events_system_insert ON proctoring_events
  FOR INSERT
  WITH CHECK (true);

-- Admins have full access
CREATE POLICY proctoring_events_admin_all ON proctoring_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- =====================================================
-- Proctoring Violations Policies (Similar to Events)
-- =====================================================

CREATE POLICY proctoring_violations_student_view ON proctoring_violations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proctoring_sessions
      WHERE id = proctoring_violations.session_id
      AND student_id = auth.uid()
    )
  );

CREATE POLICY proctoring_violations_teacher_all ON proctoring_violations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN examinations e ON ps.exam_id = e.id
      WHERE ps.id = proctoring_violations.session_id
      AND e.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN quizzes q ON ps.quiz_id = q.id
      JOIN learning_modules lm ON q.module_id = lm.id
      JOIN courses c ON lm.course_id = c.id
      WHERE ps.id = proctoring_violations.session_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY proctoring_violations_admin_all ON proctoring_violations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- =====================================================
-- Proctoring Alerts Policies
-- =====================================================

-- Teachers can view alerts for their exams
CREATE POLICY proctoring_alerts_teacher_all ON proctoring_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN examinations e ON ps.exam_id = e.id
      WHERE ps.id = proctoring_alerts.session_id
      AND e.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN quizzes q ON ps.quiz_id = q.id
      JOIN learning_modules lm ON q.module_id = lm.id
      JOIN courses c ON lm.course_id = c.id
      WHERE ps.id = proctoring_alerts.session_id
      AND c.instructor_id = auth.uid()
    )
    OR assigned_to = auth.uid()
  );

-- System can create alerts
CREATE POLICY proctoring_alerts_system_insert ON proctoring_alerts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY proctoring_alerts_admin_all ON proctoring_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- =====================================================
-- Proctoring Interventions Policies
-- =====================================================

CREATE POLICY proctoring_interventions_teacher_all ON proctoring_interventions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN examinations e ON ps.exam_id = e.id
      WHERE ps.id = proctoring_interventions.session_id
      AND e.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN quizzes q ON ps.quiz_id = q.id
      JOIN learning_modules lm ON q.module_id = lm.id
      JOIN courses c ON lm.course_id = c.id
      WHERE ps.id = proctoring_interventions.session_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Students can view interventions in their sessions
CREATE POLICY proctoring_interventions_student_view ON proctoring_interventions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proctoring_sessions
      WHERE id = proctoring_interventions.session_id
      AND student_id = auth.uid()
    )
  );

-- Students can acknowledge interventions
CREATE POLICY proctoring_interventions_student_acknowledge ON proctoring_interventions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM proctoring_sessions
      WHERE id = proctoring_interventions.session_id
      AND student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proctoring_sessions
      WHERE id = proctoring_interventions.session_id
      AND student_id = auth.uid()
    )
  );

CREATE POLICY proctoring_interventions_admin_all ON proctoring_interventions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get session summary for a student
CREATE OR REPLACE FUNCTION get_student_session_summary(p_session_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'session_id', ps.id,
    'status', ps.status,
    'started_at', ps.started_at,
    'ended_at', ps.ended_at,
    'duration_seconds', ps.duration_seconds,
    'total_events', ps.total_events,
    'total_violations', ps.total_violations,
    'critical_violations', ps.critical_violations,
    'high_severity_violations', ps.high_severity_violations,
    'reviewed', ps.reviewed,
    'final_verdict', ps.final_verdict
  ) INTO result
  FROM proctoring_sessions ps
  WHERE ps.id = p_session_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active alerts for a proctor
CREATE OR REPLACE FUNCTION get_active_alerts_for_proctor(p_proctor_id UUID)
RETURNS SETOF proctoring_alerts AS $$
BEGIN
  RETURN QUERY
  SELECT pa.*
  FROM proctoring_alerts pa
  JOIN proctoring_sessions ps ON pa.session_id = ps.id
  JOIN examinations e ON ps.exam_id = e.id
  WHERE pa.status IN ('pending', 'acknowledged', 'reviewing')
  AND e.instructor_id = p_proctor_id
  ORDER BY pa.severity DESC, pa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE proctoring_settings IS 'Configuration settings for proctoring exams and quizzes';
COMMENT ON TABLE proctoring_sessions IS 'Individual proctoring sessions for each student taking a proctored exam';
COMMENT ON TABLE proctoring_events IS 'All events detected during proctoring sessions';
COMMENT ON TABLE proctoring_violations IS 'Significant violations that require review';
COMMENT ON TABLE proctoring_alerts IS 'Real-time alerts for proctors';
COMMENT ON TABLE proctoring_interventions IS 'Manual actions taken by proctors during exams';

-- =====================================================
-- GRANTS (Optional - adjust based on your setup)
-- =====================================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
