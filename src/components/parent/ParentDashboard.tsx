import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, BookOpen, Calendar, DollarSign, Award, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/use-toast";
import PermissionWrapper from '@/components/PermissionWrapper';

interface ParentDashboardProps {
  user: any;
  onNavigate?: (tab: string) => void;
}

const ParentDashboard = ({ user, onNavigate }: ParentDashboardProps) => {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [childStats, setChildStats] = useState<any>({});
  const [pendingFees, setPendingFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id || user?.user_id) {
      fetchChildren();
    }
  }, [user?.id, user?.user_id]);

  useEffect(() => {
    if (selectedChild) {
      fetchChildData(selectedChild);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase.rpc('get_parent_children', {
        parent_uuid: user.id || user.user_id
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'No Children Found',
          description: 'No student records are linked to your account. Please contact administration.',
          variant: 'destructive',
        });
        setChildren([]);
        return;
      }

      setChildren(data || []);
      if (data && data.length > 0) {
        setSelectedChild(data[0].student_id);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast({
        title: 'Error',
        description: 'Failed to load children data',
        variant: 'destructive',
      });
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async (studentId: string) => {
    try {
      // Fetch grades for CGPA calculation
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select(`
          *,
          courses (course_name, course_code),
          assignments (title)
        `)
        .eq('student_id', studentId)
        .order('recorded_at', { ascending: false });

      if (gradesError) throw gradesError;

      // Calculate CGPA
      const avgPercentage = gradesData && gradesData.length > 0
        ? Math.round(gradesData.reduce((sum, grade) => sum + (grade.marks_obtained / grade.max_marks * 100), 0) / gradesData.length)
        : 0;
      const cgpa = (avgPercentage / 10).toFixed(1);

      // Fetch attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          courses (course_name, course_code)
        `)
        .eq('student_id', studentId)
        .order('class_date', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Calculate attendance percentage
      const totalClasses = attendanceData?.length || 0;
      const presentClasses = attendanceData?.filter(record => record.status === 'present').length || 0;
      const attendancePercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

      // Fetch pending fees
      const { data: feesData, error: feesError } = await supabase
        .from('fee_reminders')
        .select(`
          *,
          fee_structures (
            fee_type,
            academic_year,
            semester,
            amount
          )
        `)
        .eq('user_id', studentId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (feesError) throw feesError;

      const totalPending = feesData?.reduce((sum, fee) => sum + Number(fee.due_amount), 0) || 0;

      // Get unique courses count
      const uniqueCourses = [...new Set(gradesData?.map(g => g.course_id))].length;

      // Set stats for this child
      setChildStats(prev => ({
        ...prev,
        [studentId]: {
          cgpa,
          attendance: `${attendancePercentage}%`,
          enrolledCourses: uniqueCourses
        }
      }));

      // Get student name from children state
      const studentName = children.find(c => c.student_id === studentId)?.student_name || 'Student';

      // Set pending fees for this child
      setPendingFees(prev => {
        const filtered = prev.filter(f => f.studentId !== studentId);
        const newFees = (feesData || []).map(f => ({
          ...f,
          studentId,
          studentName
        }));
        return [...filtered, ...newFees];
      });

    } catch (error) {
      console.error('Error fetching child data:', error);
    }
  };

  const recentActivities = [
    {
      title: 'Grade Updated',
      description: 'Computer Networks - A Grade received',
      time: '1 day ago',
      child: 'Alex Johnson',
      permission: 'view_child_grades' as const
    },
    {
      title: 'Fee Payment Due',
      description: 'Semester Fee - Due in 5 days',
      time: '2 days ago',
      child: 'Alex Johnson',
      permission: 'view_child_fees' as const
    },
    {
      title: 'Attendance Alert',
      description: 'Missed Database Management class',
      time: '3 days ago',
      child: 'Alex Johnson',
      permission: 'view_child_attendance' as const
    }
  ];

  const quickActions = [
    {
      title: 'View Grades',
      description: 'Check your child\'s academic performance',
      icon: Award,
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
      permission: 'view_child_grades' as const,
      navigateTo: 'grades'
    },
    {
      title: 'Pay Fees',
      description: 'Make fee payments for your child',
      icon: DollarSign,
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      permission: 'make_child_payments' as const,
      navigateTo: 'payments'
    },
    {
      title: 'Attendance Report',
      description: 'View detailed attendance records',
      icon: Calendar,
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      permission: 'view_child_attendance' as const,
      navigateTo: 'attendance'
    },
    {
      title: 'Contact Support',
      description: 'Get help with any concerns',
      icon: AlertCircle,
      color: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100',
      permission: 'support_tickets' as const,
      navigateTo: 'support'
    }
  ];

  const handleQuickActionClick = (navigateTo: string) => {
    if (onNavigate) {
      onNavigate(navigateTo);
    }
  };

  const handleChildClick = (childId: string) => {
    setSelectedChild(childId);
    if (onNavigate) {
      onNavigate('grades');
    }
  };

  const handlePayNowClick = () => {
    if (onNavigate) {
      onNavigate('payments');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalPendingFees = pendingFees.reduce((sum, fee) => sum + Number(fee.due_amount), 0);

  return (
    <div className="space-y-6 animate-fade-in-up px-3 sm:px-4 md:px-6 overflow-x-hidden w-full">
      {/* Welcome Section */}
      <div className="bg-black border border-white/10 rounded-lg p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">
                Welcome, {user.first_name} {user.last_name}!
              </h1>
            </div>
            <p className="text-sm sm:text-base">Parent Portal | Monitor your child's academic progress</p>
            <Badge className="bg-gray-600/30 text-gray-100 border border-gray-300/40 font-bold px-4 py-1.5 w-fit hover:bg-gray-600/40 hover:border-gray-300/60 hover:cursor-pointer hover:shadow-[0_0_20px_rgba(107,114,128,0.4)] transition-all duration-300">
              PARENT
            </Badge>
          </div>
        </div>
      </div>

      {/* Children Overview */}
      <Card className='bg-black'>
        <CardHeader>
          <CardTitle>Your Children</CardTitle>
          <CardDescription>
            {children.length > 0
              ? 'Students linked to your account - click to view details'
              : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {children.length > 0 ? (
            <div className="space-y-3">
              {children.map((child) => {
                const stats = childStats[child.student_id] || {};
                return (
                  <div
                    key={child.student_id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md ${selectedChild === child.student_id ? 'border-blue-500 bg-blue-50/5' : ''
                      }`}
                    onClick={() => handleChildClick(child.student_id)}
                  >
                    <div>
                      <h4 className="font-medium">{child.student_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {child.user_code} • {child.relationship_type || 'Child'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PermissionWrapper permission="view_child_grades">
                        {stats.cgpa && (
                          <Badge variant="secondary">CGPA: {stats.cgpa}</Badge>
                        )}
                      </PermissionWrapper>
                      <PermissionWrapper permission="view_child_attendance">
                        {stats.attendance && (
                          <Badge variant="outline">Attendance: {stats.attendance}</Badge>
                        )}
                      </PermissionWrapper>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No student records are linked to your account.
              </p>
              <p className="text-sm text-muted-foreground">
                Please contact the administration to link your child's account.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Activities */}
        <Card className="h-[450px] sm:h-[510px] border-white/20 bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-md shadow-2xl overflow-hidden group">
          <CardHeader className="sticky top-0 z-10 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-sm border-b border-white/10 pb-4">
            <CardTitle className="text-card-foreground text-lg sm:text-xl">Recent Activities</CardTitle>
            <CardDescription className="text-sm">Your latest academic activities</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-100px)] overflow-y-auto overflow-x-hidden scrollbar-thin space-y-3 sm:space-y-4 p-4 sm:p-6">
            {recentActivities.map((activity, index) => (
              <PermissionWrapper key={index} permission={activity.permission}>
                <div className="flex flex-row items-start justify-start space-x-2 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 hover:shadow-md hover:shadow-gray-500/10 will-change-transform">
                  <div className="flex-shrink-0 mt-2 sm:mt-2.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse shadow-lg shadow-gray-400/50"></div>
                  </div>
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <p className="font-medium text-card-foreground text-sm sm:text-base truncate">{activity.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">{activity.description}</p>
                    <p className="text-[10px] sm:text-xs text-white/40 font-mono mt-1">{activity.time}</p>
                  </div>
                </div>
              </PermissionWrapper>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="h-[450px] sm:h-[510px] border-white/20 bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-md shadow-2xl overflow-hidden group">
          <CardHeader className="sticky top-0 z-10 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-sm border-b border-white/10 pb-4">
            <CardTitle className="text-card-foreground text-lg sm:text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Frequently used features - click to navigate</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-100px)] overflow-y-auto overflow-x-hidden scroll-smooth space-y-3 sm:space-y-4 p-4 sm:p-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <PermissionWrapper key={index} permission={action.permission}>
                  <div
                    className="flex flex-row items-start justify-start space-x-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 hover:shadow-md hover:shadow-gray-500/10 will-change-transform cursor-pointer"
                    onClick={() => handleQuickActionClick(action.navigateTo)}
                  >
                    <div className={`flex-shrink-0 p-2 ${action.color} transition-colors flex items-start self-start mt-1 mr-2 rounded-lg`}>
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <p className="font-medium text-card-foreground text-sm sm:text-base truncate">{action.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">{action.description}</p>
                    </div>
                  </div>
                </PermissionWrapper>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Fee Payment Alert */}
      {pendingFees.length > 0 && (
        <PermissionWrapper permission="view_child_fees">
          <Card className='bg-black'>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-base sm:text-lg">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-500" />
                <span>Payment Reminder</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {pendingFees.map((fee, index) => (
                  <div key={index} className="p-3 bg-yellow-50/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm sm:text-base font-medium">
                      {fee.fee_structures?.fee_type || 'Fee'} for {fee.studentName || 'Student'}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Due: {new Date(fee.due_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm sm:text-base font-bold">
                        Amount: ₹{Number(fee.due_amount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {totalPendingFees > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-red-50/10 border border-red-500/20 rounded-lg mb-4">
                  <p className="font-medium text-sm sm:text-base">Total Pending Fees</p>
                  <p className="text-lg sm:text-xl font-bold text-red-600">
                    ₹{totalPendingFees.toLocaleString()}
                  </p>
                </div>
              )}

              <PermissionWrapper permission="make_child_payments">
                <Button
                  onClick={handlePayNowClick}
                  className="w-full sm:w-auto"
                >
                  Pay Now
                </Button>
              </PermissionWrapper>
            </CardContent>
          </Card>
        </PermissionWrapper>
      )}
    </div>
  );
};

export default ParentDashboard;