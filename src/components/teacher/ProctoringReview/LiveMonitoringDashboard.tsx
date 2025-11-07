import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { proctoringService, type SessionSummary, type AlertWithContext } from '@/services/proctoringService';
import { 
  Video, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Eye,
  XCircle,
  AlertCircleIcon,
  MessageSquare
} from 'lucide-react';
import { Database } from '@/types';

type AlertStatus = Database['public']['Enums']['alert_status'];
type ViolationSeverity = Database['public']['Enums']['violation_severity'];

interface LiveMonitoringDashboardProps {
  examId: string;
}

interface StudentMonitoringCard {
  session: SessionSummary;
  activeAlerts: number;
  lastActivity: Date;
  status: 'normal' | 'warning' | 'critical';
}

export function LiveMonitoringDashboard({ examId }: LiveMonitoringDashboardProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [alerts, setAlerts] = useState<AlertWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const { toast } = useToast();

  // Load active sessions
  useEffect(() => {
    loadActiveSessions();
    loadPendingAlerts();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      loadActiveSessions();
      loadPendingAlerts();
    }, 5000);

    return () => clearInterval(interval);
  }, [examId]);

  // Subscribe to real-time alerts
  useEffect(() => {
    const unsubscribe = proctoringService.subscribeToAlerts((alert) => {
      if (alert.session?.exam_id === examId) {
        setAlerts(prev => [alert, ...prev]);
        
        // Show toast notification for high/critical alerts
        if (alert.severity === 'high' || alert.severity === 'critical') {
          toast({
            title: `${alert.severity === 'critical' ? '🚨' : '⚠️'} ${alert.severity.toUpperCase()} Alert`,
            description: `${alert.session?.student?.full_name}: ${alert.alert_type}`,
            variant: alert.severity === 'critical' ? 'destructive' : 'default',
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [examId, toast]);

  const loadActiveSessions = async () => {
    try {
      const activeSessions = await proctoringService.getActiveExamSessions(examId);
      setSessions(activeSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingAlerts = async () => {
    try {
      const pendingAlerts = await proctoringService.getPendingAlerts(examId);
      setAlerts(pendingAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await proctoringService.acknowledgeAlert(alertId);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged' as AlertStatus }
          : alert
      ));
      toast({
        title: 'Alert acknowledged',
        description: 'The alert has been marked as acknowledged.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert.',
        variant: 'destructive',
      });
    }
  };

  const handleResolveAlert = async (alertId: string, resolution: string) => {
    try {
      await proctoringService.resolveAlert(alertId, resolution);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast({
        title: 'Alert resolved',
        description: 'The alert has been resolved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resolve alert.',
        variant: 'destructive',
      });
    }
  };

  const handleSendIntervention = async (sessionId: string, message: string, action: 'warning' | 'pause' | 'terminate') => {
    try {
      await proctoringService.sendIntervention(sessionId, message, action);
      toast({
        title: 'Intervention sent',
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} message sent to student.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send intervention.',
        variant: 'destructive',
      });
    }
  };

  // Prepare monitoring cards
  const monitoringCards: StudentMonitoringCard[] = sessions.map(session => {
    const sessionAlerts = alerts.filter(alert => alert.session_id === session.id);
    const criticalAlerts = sessionAlerts.filter(alert => alert.severity === 'critical').length;
    const highAlerts = sessionAlerts.filter(alert => alert.severity === 'high').length;

    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (criticalAlerts > 0) status = 'critical';
    else if (highAlerts > 0 || session.total_violations > 3) status = 'warning';

    return {
      session,
      activeAlerts: sessionAlerts.length,
      lastActivity: new Date(session.last_activity_at || session.started_at),
      status,
    };
  });

  // Filter cards by status
  const filteredCards = filterStatus === 'all' 
    ? monitoringCards 
    : monitoringCards.filter(card => card.status === filterStatus);

  const getStatusColor = (status: 'normal' | 'warning' | 'critical') => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
    }
  };

  const getStatusIcon = (status: 'normal' | 'warning' | 'critical') => {
    switch (status) {
      case 'normal': return <CheckCircle2 className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
    }
  };

  const getSeverityBadgeVariant = (severity: ViolationSeverity): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'low': return 'secondary';
      case 'medium': return 'outline';
      case 'high': return 'default';
      case 'critical': return 'destructive';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normal</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {monitoringCards.filter(c => c.status === 'normal').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {monitoringCards.filter(c => c.status === 'warning').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {monitoringCards.filter(c => c.status === 'critical').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as 'grid' | 'list')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'normal' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('normal')}
            >
              Normal
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'warning' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('warning')}
            >
              Warning
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'critical' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('critical')}
            >
              Critical
            </Button>
          </div>
        </div>

        <TabsContent value="grid" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map(card => (
              <Card key={card.session.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {card.session.student?.full_name || 'Unknown Student'}
                      </CardTitle>
                      <CardDescription>
                        {card.session.student?.email}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(card.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(card.status)}
                        {card.status}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Session Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Events</p>
                      <p className="font-medium">{card.session.total_events}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Violations</p>
                      <p className="font-medium">{card.session.total_violations}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Alerts</p>
                      <p className="font-medium text-red-600">{card.activeAlerts}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {Math.floor((Date.now() - new Date(card.session.started_at).getTime()) / 60000)}m
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        // Navigate to detailed view
                        window.location.href = `/teacher/proctoring/session/${card.session.id}`;
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const message = window.prompt('Enter warning message:');
                        if (message) {
                          handleSendIntervention(card.session.id, message, 'warning');
                        }
                      }}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Warn
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCards.length === 0 && (
            <Alert>
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>
                No active sessions found with the selected filter.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Proctoring Sessions</CardTitle>
              <CardDescription>
                Monitor all students in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filteredCards.map(card => (
                    <div
                      key={card.session.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Badge className={getStatusColor(card.status)}>
                          {getStatusIcon(card.status)}
                        </Badge>

                        <div className="flex-1">
                          <p className="font-medium">
                            {card.session.student?.full_name || 'Unknown Student'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {card.session.student?.email}
                          </p>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <p className="text-muted-foreground">Events</p>
                            <p className="font-medium text-center">{card.session.total_events}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Violations</p>
                            <p className="font-medium text-center">{card.session.total_violations}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Alerts</p>
                            <p className="font-medium text-center text-red-600">{card.activeAlerts}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Duration</p>
                            <p className="font-medium text-center">
                              {Math.floor((Date.now() - new Date(card.session.started_at).getTime()) / 60000)}m
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.location.href = `/teacher/proctoring/session/${card.session.id}`;
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const message = window.prompt('Enter warning message:');
                            if (message) {
                              handleSendIntervention(card.session.id, message, 'warning');
                            }
                          }}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Warn
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Active Alerts Panel */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Active Alerts ({alerts.length})
            </CardTitle>
            <CardDescription>
              Alerts requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {alerts.map(alert => (
                  <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="font-medium">
                            {alert.session?.student?.full_name}
                          </span>
                        </div>
                        <AlertDescription>
                          {alert.alert_type}: {alert.message}
                        </AlertDescription>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(alert.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {alert.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            const resolution = window.prompt('Enter resolution notes:');
                            if (resolution) {
                              handleResolveAlert(alert.id, resolution);
                            }
                          }}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
