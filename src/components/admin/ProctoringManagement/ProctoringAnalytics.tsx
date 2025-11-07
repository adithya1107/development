import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Clock, 
  CheckCircle2,
  XCircle,
  Download,
  Calendar
} from 'lucide-react';
import { Database } from '@/types';

type ViolationSeverity = Database['public']['Enums']['violation_severity'];
type ViolationType = Database['public']['Enums']['violation_type'];

interface ProctoringAnalyticsProps {
  examId?: string;
}

interface AnalyticsData {
  overview: {
    totalSessions: number;
    completedSessions: number;
    terminatedSessions: number;
    totalViolations: number;
    avgViolationsPerSession: number;
    flaggedStudents: number;
  };
  violations: {
    byType: Record<ViolationType, number>;
    bySeverity: Record<ViolationSeverity, number>;
    byTimeOfDay: { hour: number; count: number }[];
  };
  trends: {
    sessionsOverTime: { date: string; count: number }[];
    violationsOverTime: { date: string; count: number }[];
  };
  topViolators: {
    studentId: string;
    studentName: string;
    violationCount: number;
    severityDistribution: Record<ViolationSeverity, number>;
  }[];
}

// Mock data for demonstration
const MOCK_DATA: AnalyticsData = {
  overview: {
    totalSessions: 156,
    completedSessions: 142,
    terminatedSessions: 8,
    totalViolations: 234,
    avgViolationsPerSession: 1.5,
    flaggedStudents: 34,
  },
  violations: {
    byType: {
      'multiple_faces': 45,
      'no_face_detected': 32,
      'prohibited_object': 28,
      'looking_away': 67,
      'tab_switch': 42,
      'suspicious_audio': 20,
    },
    bySeverity: {
      'low': 98,
      'medium': 89,
      'high': 35,
      'critical': 12,
    },
    byTimeOfDay: [
      { hour: 8, count: 12 },
      { hour: 9, count: 18 },
      { hour: 10, count: 25 },
      { hour: 11, count: 32 },
      { hour: 12, count: 28 },
      { hour: 13, count: 22 },
      { hour: 14, count: 35 },
      { hour: 15, count: 30 },
      { hour: 16, count: 20 },
      { hour: 17, count: 12 },
    ],
  },
  trends: {
    sessionsOverTime: [
      { date: '2025-10-24', count: 28 },
      { date: '2025-10-25', count: 32 },
      { date: '2025-10-26', count: 25 },
      { date: '2025-10-27', count: 30 },
      { date: '2025-10-28', count: 22 },
      { date: '2025-10-29', count: 19 },
    ],
    violationsOverTime: [
      { date: '2025-10-24', count: 42 },
      { date: '2025-10-25', count: 38 },
      { date: '2025-10-26', count: 35 },
      { date: '2025-10-27', count: 45 },
      { date: '2025-10-28', count: 40 },
      { date: '2025-10-29', count: 34 },
    ],
  },
  topViolators: [
    {
      studentId: '1',
      studentName: 'John Doe',
      violationCount: 8,
      severityDistribution: { low: 3, medium: 3, high: 2, critical: 0 },
    },
    {
      studentId: '2',
      studentName: 'Jane Smith',
      violationCount: 6,
      severityDistribution: { low: 2, medium: 3, high: 1, critical: 0 },
    },
    {
      studentId: '3',
      studentName: 'Bob Johnson',
      violationCount: 5,
      severityDistribution: { low: 1, medium: 2, high: 1, critical: 1 },
    },
  ],
};

export function ProctoringAnalytics({ examId }: ProctoringAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData>(MOCK_DATA);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadAnalytics();
  }, [examId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    // TODO: Fetch real analytics data from backend
    // For now, using mock data
    setTimeout(() => {
      setData(MOCK_DATA);
      setLoading(false);
    }, 500);
  };

  const exportData = () => {
    // TODO: Implement CSV/PDF export
    console.log('Exporting analytics data...');
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

  const formatViolationType = (type: string): string => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Proctoring Analytics
          </h2>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into proctoring sessions and violations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">All proctoring sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.overview.completedSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((data.overview.completedSessions / data.overview.totalSessions) * 100).toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminated</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.overview.terminatedSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((data.overview.terminatedSessions / data.overview.totalSessions) * 100).toFixed(1)}% termination rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.overview.totalViolations}</div>
            <p className="text-xs text-muted-foreground mt-1">Total detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Session</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgViolationsPerSession.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Violations per student</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Students</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.overview.flaggedStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((data.overview.flaggedStudents / data.overview.totalSessions) * 100).toFixed(1)}% of students
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="violations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="violations">Violations Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="students">Student Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Type */}
            <Card>
              <CardHeader>
                <CardTitle>Violations by Type</CardTitle>
                <CardDescription>Distribution of violation types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.violations.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const percentage = (count / data.overview.totalViolations) * 100;
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{formatViolationType(type)}</span>
                            <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* By Severity */}
            <Card>
              <CardHeader>
                <CardTitle>Violations by Severity</CardTitle>
                <CardDescription>Distribution of violation severity levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(Object.entries(data.violations.bySeverity) as [ViolationSeverity, number][])
                    .sort(([, a], [, b]) => b - a)
                    .map(([severity, count]) => {
                      const percentage = (count / data.overview.totalViolations) * 100;
                      const colorClass = getSeverityColor(severity);
                      return (
                        <div key={severity} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={colorClass}>
                              {severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">{count} violations</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                severity === 'critical' ? 'bg-red-600' :
                                severity === 'high' ? 'bg-orange-600' :
                                severity === 'medium' ? 'bg-yellow-600' :
                                'bg-blue-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time of Day Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Violations by Time of Day</CardTitle>
              <CardDescription>When violations occur most frequently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-end justify-between h-40 gap-2">
                  {data.violations.byTimeOfDay.map(({ hour, count }) => {
                    const maxCount = Math.max(...data.violations.byTimeOfDay.map(d => d.count));
                    const heightPercentage = (count / maxCount) * 100;
                    return (
                      <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">{count}</span>
                        <div
                          className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors"
                          style={{ height: `${heightPercentage}%` }}
                          title={`${hour}:00 - ${count} violations`}
                        />
                        <span className="text-xs text-muted-foreground">{hour}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sessions Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Sessions Over Time</CardTitle>
                <CardDescription>Daily proctoring session count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-end justify-between h-48 gap-2">
                    {data.trends.sessionsOverTime.map(({ date, count }) => {
                      const maxCount = Math.max(...data.trends.sessionsOverTime.map(d => d.count));
                      const heightPercentage = (count / maxCount) * 100;
                      return (
                        <div key={date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">{count}</span>
                          <div
                            className="w-full bg-green-600 rounded-t hover:bg-green-700 transition-colors"
                            style={{ height: `${heightPercentage}%` }}
                            title={`${date} - ${count} sessions`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {new Date(date).getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Violations Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Violations Over Time</CardTitle>
                <CardDescription>Daily violation count trend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-end justify-between h-48 gap-2">
                    {data.trends.violationsOverTime.map(({ date, count }) => {
                      const maxCount = Math.max(...data.trends.violationsOverTime.map(d => d.count));
                      const heightPercentage = (count / maxCount) * 100;
                      return (
                        <div key={date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">{count}</span>
                          <div
                            className="w-full bg-red-600 rounded-t hover:bg-red-700 transition-colors"
                            style={{ height: `${heightPercentage}%` }}
                            title={`${date} - ${count} violations`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {new Date(date).getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Trend Analysis</p>
                  <p className="text-sm text-blue-800 mt-1">
                    Monitor these trends to identify patterns in violation behavior. Increasing violations 
                    may indicate issues with exam difficulty, technical problems, or students not understanding 
                    proctoring requirements.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Students with Most Violations</CardTitle>
              <CardDescription>
                Students who require additional review or attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topViolators.map((student, index) => (
                  <div key={student.studentId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{student.studentName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {student.violationCount} total violations
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {(Object.entries(student.severityDistribution) as [ViolationSeverity, number][]).map(([severity, count]) => (
                        <div key={severity} className="text-center">
                          <div className={`text-lg font-bold ${
                            severity === 'critical' ? 'text-red-600' :
                            severity === 'high' ? 'text-orange-600' :
                            severity === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`}>
                            {count}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">{severity}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Review Recommendations</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    Students with multiple violations should be manually reviewed. Consider reviewing 
                    their proctoring session recordings and event timelines to determine if violations 
                    were legitimate or caused by technical issues.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
