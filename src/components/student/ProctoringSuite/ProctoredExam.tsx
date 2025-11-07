/**
 * Proctored Exam Component
 * 
 * Main component that orchestrates the entire proctored exam experience:
 * - Consent collection
 * - Device setup
 * - Live proctoring with AI detection
 * - Event recording and handling
 */

import { useState, useEffect, useRef } from "react";
import { ExamConsent } from "./ExamConsent";
import { WebcamSetup } from "./WebcamSetup";
import { ProctoringIndicators } from "./ProctoringIndicators";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mediaCaptureManager } from "@/lib/mediaCapture";
import { createAIDetectionManager, type DetectionResult } from "@/lib/aiDetection";
import { proctoringService } from "@/services/proctoringService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Camera } from "lucide-react";

interface ProctoredExamProps {
  examId?: string;
  quizId?: string;
  examName: string;
  examDuration: number; // minutes
  proctoringSettings: {
    requireWebcam: boolean;
    requireMicrophone: boolean;
    requireScreenShare: boolean;
    requireFullscreen: boolean;
    aiDetectionEnabled: boolean;
    faceDetectionInterval?: number;
    objectDetectionInterval?: number;
    recordFullSession?: boolean;
  };
  children: React.ReactNode; // The actual exam/quiz content
  onExamComplete: (sessionId: string) => void;
  onExamTerminated: (reason: string) => void;
}

type ProctoringPhase = "consent" | "setup" | "active" | "paused" | "completed";

interface Warning {
  id: string;
  type: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: number;
}

export function ProctoredExam({
  examId,
  quizId,
  examName,
  examDuration,
  proctoringSettings,
  children,
  onExamComplete,
  onExamTerminated,
}: ProctoredExamProps) {
  const [phase, setPhase] = useState<ProctoringPhase>("consent");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [collegeId, setCollegeId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  
  const [cameraActive, setCameraActive] = useState(false);
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [aiMonitoringActive, setAiMonitoringActive] = useState(false);
  const [networkConnected, setNetworkConnected] = useState(true);
  
  const [currentWarnings, setCurrentWarnings] = useState<Warning[]>([]);
  const [interventionDialogOpen, setInterventionDialogOpen] = useState(false);
  const [interventionMessage, setInterventionMessage] = useState("");
  const [criticalViolation, setCriticalViolation] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const aiDetectionManager = useRef<any>(null);
  const snapshotInterval = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Get user info
  useEffect(() => {
    const loadUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("college_id")
          .eq("id", user.id)
          .single();
        
        setStudentId(user.id);
        if (profile) setCollegeId(profile.college_id);
      }
    };
    loadUserInfo();
  }, []);

  // Listen for interventions
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`interventions-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "proctoring_interventions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: any) => {
          const intervention = payload.new;
          handleIntervention(intervention);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setNetworkConnected(true);
      if (sessionId && phase === "active") {
        recordEvent("network_reconnection", "info", "Network connection restored");
      }
    };

    const handleOffline = () => {
      setNetworkConnected(false);
      if (sessionId && phase === "active") {
        recordEvent("network_disconnection", "high", "Network connection lost");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sessionId, phase]);

  // Fullscreen enforcement
  useEffect(() => {
    if (phase !== "active" || !proctoringSettings.requireFullscreen) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordEvent("fullscreen_exit", "high", "Exited fullscreen mode");
        addWarning("fullscreen_exit", "Please return to fullscreen mode", "high");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [phase, proctoringSettings.requireFullscreen]);

  const handleConsent = () => {
    setPhase("setup");
  };

  const handleSetupComplete = async (deviceInfo: any) => {
    try {
      // Create proctoring session
      const { data: session, error } = await proctoringService.createSession({
        examId,
        quizId,
        studentId,
        collegeId,
        deviceInfo,
      });

      if (error || !session) {
        throw new Error("Failed to create proctoring session");
      }

      setSessionId(session.id);

      // Update consent
      await proctoringService.updateConsent(session.id, true);

      // Start proctoring session
      await proctoringService.startSession(session.id);

      // Start media captures
      await startMediaCaptures();

      // Start AI detection
      if (proctoringSettings.aiDetectionEnabled) {
        startAIDetection();
      }

      // Start recording if required
      if (proctoringSettings.recordFullSession) {
        await mediaCaptureManager.startRecording();
      }

      // Start periodic snapshots
      startSnapshotCapture();

      // Enter fullscreen if required
      if (proctoringSettings.requireFullscreen) {
        document.documentElement.requestFullscreen();
      }

      setPhase("active");
      
      toast({
        title: "Proctoring Started",
        description: "Your exam session is now being monitored",
      });
    } catch (error) {
      console.error("Error starting proctored exam:", error);
      toast({
        title: "Error",
        description: "Failed to start proctoring. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startMediaCaptures = async () => {
    if (proctoringSettings.requireWebcam) {
      const { stream } = await mediaCaptureManager.startVideoCapture();
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    }

    if (proctoringSettings.requireMicrophone) {
      await mediaCaptureManager.startAudioCapture();
      setMicrophoneActive(true);
    }

    if (proctoringSettings.requireScreenShare) {
      await mediaCaptureManager.startScreenCapture();
      setScreenShareActive(true);
    }
  };

  const startAIDetection = () => {
    const config = {
      faceDetection: {
        enabled: true,
        minConfidence: 0.7,
        checkInterval: proctoringSettings.faceDetectionInterval || 5000,
        maxLookAwayDuration: 10,
      },
      objectDetection: {
        enabled: true,
        minConfidence: 0.7,
        checkInterval: proctoringSettings.objectDetectionInterval || 10000,
        blockedObjects: ["cell phone", "mobile phone", "book", "notebook"],
      },
      gazeTracking: {
        enabled: true,
        minConfidence: 0.6,
        checkInterval: 3000,
        maxOffScreenTime: 8,
      },
      audioAnalysis: {
        enabled: proctoringSettings.requireMicrophone,
        checkInterval: 10000,
        conversationThreshold: 0.5,
      },
      behaviorAnalysis: {
        enabled: true,
        suspiciousPatternThreshold: 5,
      },
    };

    aiDetectionManager.current = createAIDetectionManager(config);
    aiDetectionManager.current.onDetection(handleDetection);
    aiDetectionManager.current.start();
    setAiMonitoringActive(true);
  };

  const handleDetection = async (result: DetectionResult) => {
    if (!sessionId) return;

    // Record event
    await recordEvent(result.eventType, result.severity, result.details.description, result);

    // Add warning if needed
    if (result.requiresAlert) {
      addWarning(
        result.eventType,
        result.details.description || "Suspicious activity detected",
        result.severity as any
      );
    }

    // Handle critical violations
    if (result.severity === "critical") {
      setCriticalViolation(true);
      // Could auto-pause or terminate exam here based on settings
    }
  };

  const recordEvent = async (
    eventType: string,
    severity: string,
    description: string,
    details?: any
  ) => {
    if (!sessionId) return;

    try {
      // Capture snapshot for evidence
      let snapshotUrl: string | undefined;
      if (videoRef.current) {
        const blob = await mediaCaptureManager.captureSnapshotBlob(videoRef.current);
        if (blob) {
          // In production, upload to Supabase Storage and get URL
          // For now, we'll just log it
          snapshotUrl = "snapshot-placeholder";
        }
      }

      await proctoringService.recordEvent({
        sessionId,
        eventType: eventType as any,
        severity: severity as any,
        description,
        details: details?.details,
        snapshotUrl,
        aiConfidence: details?.confidence,
        aiModelVersion: "1.0.0",
      });
    } catch (error) {
      console.error("Error recording event:", error);
    }
  };

  const startSnapshotCapture = () => {
    snapshotInterval.current = setInterval(async () => {
      if (videoRef.current && sessionId) {
        const blob = await mediaCaptureManager.captureSnapshotBlob(videoRef.current);
        if (blob) {
          // Upload to storage (implement based on requirements)
          console.log("Snapshot captured");
        }
      }
    }, 30000); // Every 30 seconds
  };

  const addWarning = (type: string, message: string, severity: "low" | "medium" | "high" | "critical") => {
    const warning: Warning = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      severity,
      timestamp: Date.now(),
    };

    setCurrentWarnings(prev => [...prev, warning]);

    // Auto-remove low/medium warnings after 10 seconds
    if (severity === "low" || severity === "medium") {
      setTimeout(() => {
        setCurrentWarnings(prev => prev.filter(w => w.id !== warning.id));
      }, 10000);
    }
  };

  const handleIntervention = (intervention: any) => {
    setInterventionMessage(intervention.message || "You have received a warning from the proctor.");
    setInterventionDialogOpen(true);

    if (intervention.intervention_type === "pause_exam") {
      setPhase("paused");
      aiDetectionManager.current?.stop();
    } else if (intervention.intervention_type === "terminate_exam") {
      handleExamTermination("Exam terminated by proctor");
    }
  };

  const handleExamComplete = async () => {
    if (!sessionId) return;

    try {
      // Stop all monitoring
      aiDetectionManager.current?.stop();
      mediaCaptureManager.stopAllCaptures();
      
      if (snapshotInterval.current) {
        clearInterval(snapshotInterval.current);
      }

      // Stop recording
      const recordingBlob = await mediaCaptureManager.stopRecording();
      // Upload recording blob to storage if needed

      // End session
      await proctoringService.endSession(sessionId, { status: "completed" });

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      setPhase("completed");
      onExamComplete(sessionId);
    } catch (error) {
      console.error("Error completing exam:", error);
    }
  };

  const handleExamTermination = async (reason: string) => {
    if (!sessionId) return;

    try {
      aiDetectionManager.current?.stop();
      mediaCaptureManager.stopAllCaptures();
      
      if (snapshotInterval.current) {
        clearInterval(snapshotInterval.current);
      }

      await proctoringService.endSession(sessionId, { status: "terminated" });

      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      onExamTerminated(reason);
    } catch (error) {
      console.error("Error terminating exam:", error);
    }
  };

  if (phase === "consent") {
    return (
      <ExamConsent
        examName={examName}
        requiresWebcam={proctoringSettings.requireWebcam}
        requiresMicrophone={proctoringSettings.requireMicrophone}
        requiresScreenShare={proctoringSettings.requireScreenShare}
        onConsent={handleConsent}
        onCancel={() => onExamTerminated("User declined consent")}
      />
    );
  }

  if (phase === "setup") {
    return (
      <WebcamSetup
        requiresWebcam={proctoringSettings.requireWebcam}
        requiresMicrophone={proctoringSettings.requireMicrophone}
        requiresScreenShare={proctoringSettings.requireScreenShare}
        onSetupComplete={handleSetupComplete}
        onBack={() => setPhase("consent")}
      />
    );
  }

  if (phase === "active" || phase === "paused") {
    return (
      <div className="h-screen flex flex-col">
        {/* Hidden video for proctoring */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />

        {/* Proctoring Status Bar */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Proctoring Active</span>
              </div>
              <ProctoringIndicators
                cameraActive={cameraActive}
                microphoneActive={microphoneActive}
                screenShareActive={screenShareActive}
                aiMonitoringActive={aiMonitoringActive}
                networkConnected={networkConnected}
                currentWarnings={currentWarnings}
              />
            </div>
          </div>
        </div>

        {/* Main Exam Content */}
        <div className="flex-1 overflow-auto">
          {phase === "paused" ? (
            <div className="container max-w-2xl mx-auto mt-20">
              <Card>
                <CardContent className="pt-6 text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto" />
                  <h2 className="text-2xl font-bold">Exam Paused</h2>
                  <p className="text-muted-foreground">
                    Your exam has been paused by the proctor. Please wait for instructions.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Intervention Dialog */}
        <Dialog open={interventionDialogOpen} onOpenChange={setInterventionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Proctor Intervention</DialogTitle>
              <DialogDescription>{interventionMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setInterventionDialogOpen(false)}>
                I Understand
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
