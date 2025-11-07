import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  proctoringService, 
  type SessionSummary, 
  type EventWithDetails, 
  type ViolationWithEvidence 
} from '@/services/proctoringService';
import { ViolationTimeline } from './ViolationTimeline';
import { VideoPlayer } from './VideoPlayer';
import { 
  User, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Eye,
  Calendar,
  FileText,
  Activity
} from 'lucide-react';
import { Database } from '@/types';
import { useToast } from '@/hooks/use-toast';

type ProctoringSessionStatus = Database['public']['Enums']['proctoring_session_status'];
type ViolationSeverity = Database['public']['Enums']['violation_severity'];

interface SessionReviewProps {
  sessionId: string;
}

export function SessionReview({ sessionId }: SessionReviewProps) {
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [violations, setViolations] = useState<ViolationWithEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      
      // Load session details
      const sessionData = await proctoringService.getSession(sessionId);
      setSession(sessionData);

      // Load events
      const sessionEvents = await proctoringService.getSessionEvents(sessionId);
      setEvents(sessionEvents);

      // Load violations
      const sessionViolations = await proctoringService.getSessionViolations(sessionId);
      setViolations(sessionViolations);
    } catch (error) {
      console.error('Error loading session data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewViolation = async (violationId: string, reviewed: boolean, reviewNotes: string) => {
    try {
      await proctoringService.reviewViolation(violationId, reviewed, reviewNotes);
      
      // Update local state
      setViolations(prev => prev.map(v => 
        v.id === violationId 
          ? { ...v, reviewed, review_notes: reviewNotes }
          : v
      ));

      toast({
        title: 'Violation reviewed',
        description: 'The violation has been marked as reviewed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to review violation.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: ProctoringSessionStatus) => {
    const variants: Record<ProctoringSessionStatus, { color: string; icon: React.ReactNode }> = {
      'pending': { color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
      'active': { color: 'bg-blue-100 text-blue-800', icon: <Activity className="h-3 w-3" /> },
      'paused': { color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="h-3 w-3" /> },
      'completed': { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
      'terminated': { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
    };

    const variant = variants[status];
    return (
      <Badge className={variant.color}>
        <span className="flex items-center gap-1">
          {variant.icon}
          {status}
        </span>
      </Badge>
    );
  };

  const getSeverityBadge = (severity: ViolationSeverity) => {
    const variants: Record<ViolationSeverity, "default" | "secondary" | "destructive" | "outline"> = {
      'low': 'secondary',
      'medium': 'outline',
      'high': 'default',
      'critical': 'destructive',
    };

    return <Badge variant={variants[severity]}>{severity}</Badge>;
  };

  const formatDuration = (startDate: string, endDate?: string | null) => {
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : Date.now();
    const durationMs = end - start;
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading session review...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium">Session not found</p>
            <p className="text-sm text-muted-foreground mt-2">
              The proctoring session could not be loaded.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {session.student?.full_name || 'Unknown Student'}
              </CardTitle>
              <CardDescription>
                {session.student?.email}
              </CardDescription>
            </div>
            {getStatusBadge(session.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground">Exam</Label>
              <p className="font-medium">{session.exam?.title || 'Unknown Exam'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Start Time</Label>
              <p className="font-medium">
                <Calendar className="h-4 w-4 inline mr-1" />
                {new Date(session.started_at).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Duration</Label>
              <p className="font-medium">
                <Clock className="h-4 w-4 inline mr-1" />
                {formatDuration(session.started_at, session.ended_at)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{session.total_events}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Flagged Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-600">{session.flagged_events}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{session.total_violations}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Confidence Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {session.confidence_score ? `${(session.confidence_score * 100).toFixed(0)}%` : 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          {session.proctoring_notes && (
            <div className="mt-6">
              <Label className="text-muted-foreground">Automated Notes</Label>
              <p className="mt-1 text-sm bg-gray-50 p-3 rounded-md">
                {session.proctoring_notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="violations">
            Violations ({violations.length})
          </TabsTrigger>
          <TabsTrigger value="events">
            Events ({events.length})
          </TabsTrigger>
          <TabsTrigger value="recording">Recording</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <ViolationTimeline 
            events={events} 
            violations={violations}
            sessionStart={new Date(session.started_at)}
            sessionEnd={session.ended_at ? new Date(session.ended_at) : undefined}
          />
        </TabsContent>

        <TabsContent value="violations">
          <Card>
            <CardHeader>
              <CardTitle>Violations Review</CardTitle>
              <CardDescription>
                Review and annotate detected violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {violations.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No violations detected</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This student had a clean proctoring session.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {violations.map(violation => (
                    <Card key={violation.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getSeverityBadge(violation.severity)}
                              <span className="font-medium">{violation.violation_type}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {new Date(violation.detected_at).toLocaleTimeString()}
                            </p>
                          </div>
                          {violation.reviewed && (
                            <Badge variant="outline" className="bg-green-50">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Reviewed
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label>Description</Label>
                          <p className="text-sm">{violation.description}</p>
                        </div>

                        {violation.evidence_url && (
                          <div>
                            <Label>Evidence</Label>
                            <div className="mt-2">
                              <img 
                                src={violation.evidence_url} 
                                alt="Violation evidence" 
                                className="max-w-md rounded-md border"
                              />
                            </div>
                          </div>
                        )}

                        {violation.ai_confidence && (
                          <div>
                            <Label>AI Confidence</Label>
                            <p className="text-sm">
                              {(violation.ai_confidence * 100).toFixed(1)}%
                            </p>
                          </div>
                        )}

                        {violation.review_notes && (
                          <div>
                            <Label>Review Notes</Label>
                            <p className="text-sm bg-gray-50 p-3 rounded-md">
                              {violation.review_notes}
                            </p>
                          </div>
                        )}

                        {!violation.reviewed && (
                          <div className="space-y-2 pt-2 border-t">
                            <Label>Add Review Notes</Label>
                            <Textarea 
                              placeholder="Enter your review notes..."
                              id={`notes-${violation.id}`}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const notes = (document.getElementById(`notes-${violation.id}`) as HTMLTextAreaElement)?.value || '';
                                  handleReviewViolation(violation.id, true, notes);
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Mark as Reviewed
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const notes = (document.getElementById(`notes-${violation.id}`) as HTMLTextAreaElement)?.value || 'False positive';
                                  handleReviewViolation(violation.id, true, notes);
                                }}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Mark as False Positive
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Event Log</CardTitle>
              <CardDescription>
                Detailed timeline of all proctoring events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events.map(event => (
                  <div 
                    key={event.id}
                    className={`p-3 border rounded-md ${event.flagged ? 'bg-yellow-50 border-yellow-200' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={event.flagged ? 'destructive' : 'secondary'}>
                            {event.event_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.detected_at).toLocaleTimeString()}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm mt-1">{event.description}</p>
                        )}
                        {event.snapshot_url && (
                          <Button
                            variant="link"
                            size="sm"
                            className="px-0 h-auto mt-1"
                            onClick={() => window.open(event.snapshot_url!, '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Snapshot
                          </Button>
                        )}
                      </div>
                      {event.ai_confidence && (
                        <span className="text-sm text-muted-foreground">
                          {(event.ai_confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording">
          <Card>
            <CardHeader>
              <CardTitle>Session Recording</CardTitle>
              <CardDescription>
                Review the full exam session recording
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.recording_url ? (
                <VideoPlayer 
                  videoUrl={session.recording_url}
                  violations={violations}
                  events={events}
                />
              ) : (
                <div className="text-center py-10">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium">No recording available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Recording was not enabled for this session.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Final Review Section */}
      <Card>
        <CardHeader>
          <CardTitle>Session Review Summary</CardTitle>
          <CardDescription>
            Add your final review notes and assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="review-notes">Review Notes</Label>
            <Textarea
              id="review-notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Enter your overall assessment of this proctoring session..."
              rows={5}
              className="mt-2"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                // Save review notes
                setSubmittingReview(true);
                // TODO: Implement save functionality
                toast({
                  title: 'Review saved',
                  description: 'Your review has been saved successfully.',
                });
                setSubmittingReview(false);
              }}
              disabled={submittingReview}
            >
              {submittingReview ? 'Saving...' : 'Save Review'}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
