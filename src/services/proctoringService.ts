/**
 * Proctoring Service
 * 
 * Comprehensive service for managing AI-powered proctoring sessions,
 * including session lifecycle, event tracking, violation management,
 * and real-time monitoring.
 * 
 * @module services/proctoringService
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/types";

// Type aliases for cleaner code
type ProctoringSession = Database["public"]["Tables"]["proctoring_sessions"]["Row"];
type ProctoringSessionInsert = Database["public"]["Tables"]["proctoring_sessions"]["Insert"];
type ProctoringSessionUpdate = Database["public"]["Tables"]["proctoring_sessions"]["Update"];

type ProctoringEvent = Database["public"]["Tables"]["proctoring_events"]["Row"];
type ProctoringEventInsert = Database["public"]["Tables"]["proctoring_events"]["Insert"];

type ProctoringViolation = Database["public"]["Tables"]["proctoring_violations"]["Row"];
type ProctoringViolationInsert = Database["public"]["Tables"]["proctoring_violations"]["Insert"];

type ProctoringAlert = Database["public"]["Tables"]["proctoring_alerts"]["Row"];
type ProctoringAlertInsert = Database["public"]["Tables"]["proctoring_alerts"]["Insert"];

type ProctoringSettings = Database["public"]["Tables"]["proctoring_settings"]["Row"];
type ProctoringSettingsInsert = Database["public"]["Tables"]["proctoring_settings"]["Insert"];

type ProctoringIntervention = Database["public"]["Tables"]["proctoring_interventions"]["Row"];
type ProctoringInterventionInsert = Database["public"]["Tables"]["proctoring_interventions"]["Insert"];

// DTOs for frontend use
export interface SessionSummary {
  sessionId: string;
  examName?: string;
  quizName?: string;
  studentName: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  totalEvents: number;
  totalViolations: number;
  criticalViolations: number;
  highSeverityViolations: number;
  reviewed: boolean;
  finalVerdict?: string;
}

export interface EventWithDetails extends ProctoringEvent {
  sessionInfo?: {
    studentName: string;
    examName?: string;
  };
}

export interface ViolationWithEvidence extends ProctoringViolation {
  evidenceCount: number;
  relatedEvents?: ProctoringEvent[];
}

export interface AlertWithContext extends ProctoringAlert {
  sessionInfo: {
    studentName: string;
    examName?: string;
    status: string;
  };
  eventDetails?: ProctoringEvent;
}

/**
 * Proctoring Service Class
 * Manages all proctoring-related operations
 */
class ProctoringService {
  
  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  /**
   * Create a new proctoring session
   */
  async createSession(data: {
    examId?: string;
    quizId?: string;
    studentId: string;
    collegeId: string;
    settingsId?: string;
    deviceInfo?: Record<string, any>;
  }): Promise<{ data: ProctoringSession | null; error: Error | null }> {
    try {
      const sessionData: ProctoringSessionInsert = {
        exam_id: data.examId,
        quiz_id: data.quizId,
        student_id: data.studentId,
        college_id: data.collegeId,
        settings_id: data.settingsId,
        device_info: data.deviceInfo || {},
        status: "pending",
        consent_given: false,
        identity_verified: false,
        total_events: 0,
        total_violations: 0,
        critical_violations: 0,
        high_severity_violations: 0,
        medium_severity_violations: 0,
        low_severity_violations: 0,
      };

      const { data: session, error } = await supabase
        .from("proctoring_sessions")
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      return { data: session, error: null };
    } catch (error) {
      console.error("Error creating proctoring session:", error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Start a proctoring session (change status to active)
   */
  async startSession(sessionId: string): Promise<{ success: boolean; error?: Error }> {
    try {
      const { error } = await supabase
        .from("proctoring_sessions")
        .update({
          status: "active",
          started_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error starting proctoring session:", error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * End a proctoring session
   */
  async endSession(
    sessionId: string,
    options?: { status?: "completed" | "terminated" | "failed" }
  ): Promise<{ success: boolean; error?: Error }> {
    try {
      const { data: session } = await supabase
        .from("proctoring_sessions")
        .select("started_at")
        .eq("id", sessionId)
        .single();

      const now = new Date();
      const startedAt = session?.started_at ? new Date(session.started_at) : now;
      const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

      const { error } = await supabase
        .from("proctoring_sessions")
        .update({
          status: options?.status || "completed",
          ended_at: now.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", sessionId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error ending proctoring session:", error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Update session consent
   */
  async updateConsent(
    sessionId: string,
    consentGiven: boolean
  ): Promise<{ success: boolean; error?: Error }> {
    try {
      const { error } = await supabase
        .from("proctoring_sessions")
        .update({
          consent_given: consentGiven,
          consent_timestamp: consentGiven ? new Date().toISOString() : null,
        })
        .eq("id", sessionId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error updating consent:", error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<{ data: ProctoringSession | null; error?: Error }> {
    try {
      const { data, error } = await supabase
        .from("proctoring_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error) throw error;

      return { data };
    } catch (error) {
      console.error("Error fetching proctoring session:", error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get sessions for a student
   */
  async getStudentSessions(
    studentId: string,
    options?: { limit?: number; includeCompleted?: boolean }
  ): Promise<{ data: ProctoringSession[]; error?: Error }> {
    try {
      let query = supabase
        .from("proctoring_sessions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (!options?.includeCompleted) {
        query = query.neq("status", "completed");
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [] };
    } catch (error) {
      console.error("Error fetching student sessions:", error);
      return { data: [], error: error as Error };
    }
  }

  /**
   * Get active sessions for an exam
   */
  async getActiveExamSessions(examId: string): Promise<{ data: ProctoringSession[]; error?: Error }> {
    try {
      const { data, error } = await supabase
        .from("proctoring_sessions")
        .select("*")
        .eq("exam_id", examId)
        .eq("status", "active")
        .order("started_at", { ascending: false });

      if (error) throw error;

      return { data: data || [] };
    } catch (error) {
      console.error("Error fetching active exam sessions:", error);
      return { data: [], error: error as Error };
    }
  }

  // =====================================================
  // EVENT MANAGEMENT
  // =====================================================

  /**
   * Record a proctoring event
   */
  async recordEvent(eventData: {
    sessionId: string;
    eventType: Database["public"]["Enums"]["proctoring_event_type"];
    severity?: Database["public"]["Enums"]["violation_severity"];
    description?: string;
    details?: Record<string, any>;
    snapshotUrl?: string;
    videoClipUrl?: string;
    audioClipUrl?: string;
    aiConfidence?: number;
    aiModelVersion?: string;
  }): Promise<{ data: ProctoringEvent | null; error?: Error }> {
    try {
      const eventInsert: ProctoringEventInsert = {
        session_id: eventData.sessionId,
        event_type: eventData.eventType,
        severity: eventData.severity || "info",
        description: eventData.description,
        details: eventData.details,
        snapshot_url: eventData.snapshotUrl,
        video_clip_url: eventData.videoClipUrl,
        audio_clip_url: eventData.audioClipUrl,
        ai_confidence: eventData.aiConfidence,
        ai_model_version: eventData.aiModelVersion,
        timestamp: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("proctoring_events")
        .insert(eventInsert)
        .select()
        .single();

      if (error) throw error;

      // Check if this should trigger an alert
      if (eventData.severity && ["high", "critical"].includes(eventData.severity)) {
        await this.createAlertFromEvent(data);
      }

      return { data };
    } catch (error) {
      console.error("Error recording proctoring event:", error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get events for a session
   */
  async getSessionEvents(
    sessionId: string,
    options?: {
      severityFilter?: string[];
      eventTypeFilter?: string[];
      limit?: number;
    }
  ): Promise<{ data: ProctoringEvent[]; error?: Error }> {
    try {
      let query = supabase
        .from("proctoring_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: false });

      if (options?.severityFilter && options.severityFilter.length > 0) {
        query = query.in("severity", options.severityFilter);
      }

      if (options?.eventTypeFilter && options.eventTypeFilter.length > 0) {
        query = query.in("event_type", options.eventTypeFilter);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [] };
    } catch (error) {
      console.error("Error fetching session events:", error);
      return { data: [], error: error as Error };
    }
  }

  /**
   * Flag an event for review
   */
  async flagEvent(
    eventId: string,
    flaggedBy: string,
    reason: string
  ): Promise<{ success: boolean; error?: Error }> {
    try {
      const { error } = await supabase
        .from("proctoring_events")
        .update({
          is_flagged: true,
          flagged_by: flaggedBy,
          flagged_at: new Date().toISOString(),
          flag_reason: reason,
        })
        .eq("id", eventId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error flagging event:", error);
      return { success: false, error: error as Error };
    }
  }

  // =====================================================
  // VIOLATION MANAGEMENT
  // =====================================================

  /**
   * Create a violation
   */
  async createViolation(violationData: {
    sessionId: string;
    eventId?: string;
    violationType: Database["public"]["Enums"]["violation_type"];
    severity: Database["public"]["Enums"]["violation_severity"];
    title: string;
    description?: string;
    evidenceUrls?: string[];
  }): Promise<{ data: ProctoringViolation | null; error?: Error }> {
    try {
      const violationInsert: ProctoringViolationInsert = {
        session_id: violationData.sessionId,
        event_id: violationData.eventId,
        violation_type: violationData.violationType,
        severity: violationData.severity,
        title: violationData.title,
        description: violationData.description,
        evidence_urls: violationData.evidenceUrls || [],
        timestamp: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("proctoring_violations")
        .insert(violationInsert)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error) {
      console.error("Error creating violation:", error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get violations for a session
   */
  async getSessionViolations(sessionId: string): Promise<{ data: ProctoringViolation[]; error?: Error }> {
    try {
      const { data, error } = await supabase
        .from("proctoring_violations")
        .select("*")
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: false });

      if (error) throw error;

      return { data: data || [] };
    } catch (error) {
      console.error("Error fetching session violations:", error);
      return { data: [], error: error as Error };
    }
  }

  /**
   * Review a violation
   */
  async reviewViolation(
    violationId: string,
    reviewedBy: string,
    notes: string,
    action: string,
    isFalsePositive: boolean = false
  ): Promise<{ success: boolean; error?: Error }> {
    try {
      const { error } = await supabase
        .from("proctoring_violations")
        .update({
          reviewed: true,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
          action_taken: action,
          is_false_positive: isFalsePositive,
        })
        .eq("id", violationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error reviewing violation:", error);
      return { success: false, error: error as Error };
    }
  }

  // =====================================================
  // ALERT MANAGEMENT
  // =====================================================

  /**
   * Create an alert from an event
   */
  private async createAlertFromEvent(event: ProctoringEvent): Promise<void> {
    try {
      const alertInsert: ProctoringAlertInsert = {
        session_id: event.session_id,
        event_id: event.id,
        alert_type: event.event_type,
        severity: event.severity || "info",
        title: this.getAlertTitle(event.event_type),
        message: event.description,
        status: "pending",
      };

      await supabase.from("proctoring_alerts").insert(alertInsert);
    } catch (error) {
      console.error("Error creating alert from event:", error);
    }
  }

  /**
   * Get alert title based on event type
   */
  private getAlertTitle(eventType: string): string {
    const titles: Record<string, string> = {
      multiple_faces: "Multiple Faces Detected",
      no_face: "No Face Detected",
      face_not_matching: "Face Mismatch",
      looking_away: "Student Looking Away",
      object_detected: "Unauthorized Object Detected",
      audio_conversation: "Conversation Detected",
      audio_unusual: "Unusual Audio",
      tab_switch: "Tab Switched",
      window_switch: "Window Switched",
      screen_share_detected: "Screen Sharing Detected",
      fullscreen_exit: "Fullscreen Exited",
      browser_focus_lost: "Browser Focus Lost",
      copy_paste: "Copy/Paste Detected",
      network_disconnection: "Network Disconnected",
      network_reconnection: "Network Reconnected",
      system_info: "System Information",
    };
    return titles[eventType] || "Proctoring Alert";
  }

  /**
   * Get pending alerts for an instructor
   */
  async getPendingAlerts(instructorId: string): Promise<{ data: ProctoringAlert[]; error?: Error }> {
    try {
      const { data, error } = await supabase
        .from("proctoring_alerts")
        .select(`
          *,
          proctoring_sessions!inner(
            exam_id,
            examinations!inner(instructor_id)
          )
        `)
        .eq("proctoring_sessions.examinations.instructor_id", instructorId)
        .in("status", ["pending", "acknowledged"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { data: data || [] };
    } catch (error) {
      console.error("Error fetching pending alerts:", error);
      return { data: [], error: error as Error };
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<{ success: boolean; error?: Error }> {
    try {
      const { error } = await supabase
        .from("proctoring_alerts")
        .update({
          status: "acknowledged",
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    alertId: string,
    userId: string,
    notes: string
  ): Promise<{ success: boolean; error?: Error }> {
    try {
      const { error } = await supabase
        .from("proctoring_alerts")
        .update({
          status: "resolved",
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq("id", alertId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error resolving alert:", error);
      return { success: false, error: error as Error };
    }
  }

  // =====================================================
  // INTERVENTION MANAGEMENT
  // =====================================================

  /**
   * Send intervention to student
   */
  async sendIntervention(interventionData: {
    sessionId: string;
    alertId?: string;
    intervenedBy: string;
    interventionType: "warning" | "message" | "pause_exam" | "terminate_exam";
    message?: string;
  }): Promise<{ data: ProctoringIntervention | null; error?: Error }> {
    try {
      const interventionInsert: ProctoringInterventionInsert = {
        session_id: interventionData.sessionId,
        alert_id: interventionData.alertId,
        intervened_by: interventionData.intervenedBy,
        intervention_type: interventionData.interventionType,
        message: interventionData.message,
        intervened_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("proctoring_interventions")
        .insert(interventionInsert)
        .select()
        .single();

      if (error) throw error;

      // If pause or terminate, update session status
      if (interventionData.interventionType === "pause_exam") {
        await supabase
          .from("proctoring_sessions")
          .update({ status: "paused" })
          .eq("id", interventionData.sessionId);
      } else if (interventionData.interventionType === "terminate_exam") {
        await this.endSession(interventionData.sessionId, { status: "terminated" });
      }

      return { data };
    } catch (error) {
      console.error("Error sending intervention:", error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get interventions for a session
   */
  async getSessionInterventions(sessionId: string): Promise<{ data: ProctoringIntervention[]; error?: Error }> {
    try {
      const { data, error } = await supabase
        .from("proctoring_interventions")
        .select("*")
        .eq("session_id", sessionId)
        .order("intervened_at", { ascending: false });

      if (error) throw error;

      return { data: data || [] };
    } catch (error) {
      console.error("Error fetching interventions:", error);
      return { data: [], error: error as Error };
    }
  }

  // =====================================================
  // SETTINGS MANAGEMENT
  // =====================================================

  /**
   * Get proctoring settings for an exam
   */
  async getExamSettings(examId: string): Promise<{ data: ProctoringSettings | null; error?: Error }> {
    try {
      const { data, error } = await supabase
        .from("proctoring_settings")
        .select("*")
        .eq("exam_id", examId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found

      return { data: data || null };
    } catch (error) {
      console.error("Error fetching exam settings:", error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create or update proctoring settings
   */
  async upsertSettings(settings: ProctoringSettingsInsert): Promise<{ data: ProctoringSettings | null; error?: Error }> {
    try {
      const { data, error } = await supabase
        .from("proctoring_settings")
        .upsert(settings)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error) {
      console.error("Error upserting settings:", error);
      return { data: null, error: error as Error };
    }
  }

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  /**
   * Subscribe to session events
   */
  subscribeToSessionEvents(
    sessionId: string,
    callback: (event: ProctoringEvent) => void
  ): () => void {
    const channel = supabase
      .channel(`session-events-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "proctoring_events",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => callback(payload.new as ProctoringEvent)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to alerts
   */
  subscribeToAlerts(callback: (alert: ProctoringAlert) => void): () => void {
    const channel = supabase
      .channel("proctoring-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "proctoring_alerts",
        },
        (payload) => callback(payload.new as ProctoringAlert)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

// Export singleton instance
export const proctoringService = new ProctoringService();
export default proctoringService;
