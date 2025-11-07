import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type EventWithDetails, type ViolationWithEvidence } from '@/services/proctoringService';
import { 
  AlertTriangle, 
  Eye, 
  Clock, 
  Circle, 
  Flag,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Database } from '@/types';

type ViolationSeverity = Database['public']['Enums']['violation_severity'];
type EventType = Database['public']['Enums']['proctoring_event_type'];

interface ViolationTimelineProps {
  events: EventWithDetails[];
  violations: ViolationWithEvidence[];
  sessionStart: Date;
  sessionEnd?: Date;
}

interface TimelineItem {
  id: string;
  timestamp: Date;
  type: 'event' | 'violation';
  data: EventWithDetails | ViolationWithEvidence;
}

export function ViolationTimeline({ 
  events, 
  violations, 
  sessionStart, 
  sessionEnd 
}: ViolationTimelineProps) {
  // Combine events and violations into a single timeline
  const timelineItems: TimelineItem[] = [
    ...events.map(event => ({
      id: event.id,
      timestamp: new Date(event.detected_at),
      type: 'event' as const,
      data: event,
    })),
    ...violations.map(violation => ({
      id: violation.id,
      timestamp: new Date(violation.detected_at),
      type: 'violation' as const,
      data: violation,
    })),
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const getElapsedTime = (timestamp: Date): string => {
    const elapsed = timestamp.getTime() - sessionStart.getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (severity: ViolationSeverity): string => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: ViolationSeverity) => {
    switch (severity) {
      case 'low': return <Circle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getEventTypeColor = (eventType: EventType): string => {
    // Color code different event types
    if (eventType.includes('violation') || eventType.includes('multiple_faces') || eventType.includes('no_face')) {
      return 'text-red-600 bg-red-50';
    }
    if (eventType.includes('warning') || eventType.includes('suspicious')) {
      return 'text-yellow-600 bg-yellow-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const renderViolationItem = (violation: ViolationWithEvidence, timestamp: Date) => (
    <div className="flex gap-4">
      {/* Timeline marker */}
      <div className="flex flex-col items-center">
        <div className={`rounded-full p-2 ${getSeverityColor(violation.severity)}`}>
          {getSeverityIcon(violation.severity)}
        </div>
        <div className="w-px h-full bg-gray-200 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge className={getSeverityColor(violation.severity)}>
                {violation.severity}
              </Badge>
              <span className="font-medium">{violation.violation_type}</span>
              {violation.reviewed && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              <Clock className="h-3 w-3 inline mr-1" />
              {getElapsedTime(timestamp)} - {timestamp.toLocaleTimeString()}
            </p>
          </div>
          {violation.ai_confidence && (
            <span className="text-sm text-muted-foreground">
              {(violation.ai_confidence * 100).toFixed(0)}% confidence
            </span>
          )}
        </div>

        <Card className="bg-gray-50">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm">{violation.description}</p>

            {violation.evidence_url && (
              <div>
                <img 
                  src={violation.evidence_url} 
                  alt="Violation evidence" 
                  className="max-w-sm rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(violation.evidence_url!, '_blank')}
                />
              </div>
            )}

            {violation.review_notes && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-1">Review Notes:</p>
                <p className="text-sm">{violation.review_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderEventItem = (event: EventWithDetails, timestamp: Date) => {
    const isFlagged = event.flagged;
    
    return (
      <div className="flex gap-4">
        {/* Timeline marker */}
        <div className="flex flex-col items-center">
          <div className={`rounded-full p-2 ${isFlagged ? getEventTypeColor(event.event_type) : 'bg-gray-100 text-gray-600'}`}>
            {isFlagged ? <Flag className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
          </div>
          <div className="w-px h-full bg-gray-200 mt-2" />
        </div>

        {/* Content */}
        <div className="flex-1 pb-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={isFlagged ? 'destructive' : 'secondary'}
                  className={isFlagged ? getEventTypeColor(event.event_type) : ''}
                >
                  {event.event_type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                <Clock className="h-3 w-3 inline mr-1" />
                {getElapsedTime(timestamp)} - {timestamp.toLocaleTimeString()}
              </p>
            </div>
            {event.ai_confidence && (
              <span className="text-sm text-muted-foreground">
                {(event.ai_confidence * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>

          {(event.description || event.snapshot_url) && (
            <Card className="bg-gray-50">
              <CardContent className="p-4 space-y-2">
                {event.description && (
                  <p className="text-sm">{event.description}</p>
                )}
                {event.snapshot_url && (
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0 h-auto"
                    onClick={() => window.open(event.snapshot_url!, '_blank')}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Snapshot
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  if (timelineItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Clean Session</p>
            <p className="text-sm text-muted-foreground mt-2">
              No events or violations were recorded during this session.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Session Timeline</CardTitle>
            <CardDescription>
              Chronological view of all events and violations
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Violations ({violations.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Flagged Events ({events.filter(e => e.flagged).length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span className="text-muted-foreground">Normal Events ({events.filter(e => !e.flagged).length})</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {/* Session start marker */}
          <div className="flex gap-4 mb-6">
            <div className="flex flex-col items-center">
              <div className="rounded-full p-2 bg-green-100 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="w-px h-full bg-gray-200 mt-2" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Session Started</p>
              <p className="text-sm text-muted-foreground">
                {sessionStart.toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Timeline items */}
          {timelineItems.map(item => (
            <div key={item.id}>
              {item.type === 'violation' 
                ? renderViolationItem(item.data as ViolationWithEvidence, item.timestamp)
                : renderEventItem(item.data as EventWithDetails, item.timestamp)
              }
            </div>
          ))}

          {/* Session end marker */}
          {sessionEnd && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="rounded-full p-2 bg-blue-100 text-blue-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium">Session Ended</p>
                <p className="text-sm text-muted-foreground">
                  {getElapsedTime(sessionEnd)} - {sessionEnd.toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
