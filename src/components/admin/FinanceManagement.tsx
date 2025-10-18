import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  TrendingUp,
  CreditCard,
  Users,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  FileText,
  Check,
  X,
  DollarSignIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const FinanceManagement = ({ userProfile }) => {
  const [feeStructures, setFeeStructures] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    totalStudents: 0,
    collectionRate: 0,
    recentPayments: []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddFeeDialogOpen, setIsAddFeeDialogOpen] = useState(false);
  const [isEditFeeDialogOpen, setIsEditFeeDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [feeForm, setFeeForm] = useState({
    fee_type: '',
    amount: 0,
    academic_year: '2024-25',
    semester: 'Fall',
    user_type: 'student'
  });

  useEffect(() => {
    if (userProfile?.college_id) {
      loadAllData();
    }
  }, [userProfile]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadFeeStructures(),
        loadPayments(),
        loadPendingPayments(),
        loadDashboardStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load finance data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeeStructures = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('college_id', userProfile.college_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeeStructures(data || []);
    } catch (error) {
      console.error('Error loading fee structures:', error);
    }
  };

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_payments')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            user_code
          ),
          fee_structures (
            fee_type,
            amount
          )
        `)
        .eq('college_id', userProfile.college_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadPendingPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_payments')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            user_code,
            email
          ),
          fee_structures (
            fee_type,
            amount
          )
        `)
        .eq('college_id', userProfile.college_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingPayments(data || []);
    } catch (error) {
      console.error('Error loading pending payments:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const { data: revenueData, error: revenueError } = await supabase
        .from('fee_payments')
        .select('amount_paid')
        .eq('college_id', userProfile.college_id)
        .eq('status', 'completed');

      if (revenueError) throw revenueError;

      const totalRevenue = revenueData?.reduce((sum, payment) => sum + parseFloat(payment.amount_paid), 0) || 0;

      const { data: pendingData, error: pendingError } = await supabase
        .from('fee_payments')
        .select('id')
        .eq('college_id', userProfile.college_id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      const { data: studentsData, error: studentsError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('college_id', userProfile.college_id)
        .eq('user_type', 'student');

      if (studentsError) throw studentsError;

      const { data: recentPaymentsData, error: recentError } = await supabase
        .from('fee_payments')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            user_code
          ),
          fee_structures (
            fee_type,
            amount
          )
        `)
        .eq('college_id', userProfile.college_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      const { data: totalExpectedData, error: expectedError } = await supabase
        .from('fee_structures')
        .select('amount')
        .eq('college_id', userProfile.college_id)
        .eq('is_active', true);

      if (expectedError) throw expectedError;

      const totalExpected = (totalExpectedData?.reduce((sum, fee) => sum + parseFloat(fee.amount), 0) || 1) * (studentsData?.length || 1);
      const collectionRate = totalExpected > 0 ? (totalRevenue / totalExpected) * 100 : 0;

      setDashboardStats({
        totalRevenue,
        pendingPayments: pendingData?.length || 0,
        totalStudents: studentsData?.length || 0,
        collectionRate: Math.min(collectionRate, 100),
        recentPayments: recentPaymentsData || []
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const handleAddFeeStructure = async () => {
    if (!feeForm.fee_type || feeForm.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('fee_structures')
        .insert([{
          college_id: userProfile.college_id,
          fee_type: feeForm.fee_type,
          amount: feeForm.amount,
          academic_year: feeForm.academic_year,
          semester: feeForm.semester || null,
          user_type: feeForm.user_type,
          is_active: true
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fee structure created successfully.",
      });

      setIsAddFeeDialogOpen(false);
      resetFeeForm();
      loadFeeStructures();
    } catch (error) {
      console.error('Error creating fee structure:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create fee structure.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateFeeStructure = async () => {
    if (!editingFee) return;

    try {
      const { error } = await supabase
        .from('fee_structures')
        .update({
          fee_type: feeForm.fee_type,
          amount: feeForm.amount,
          academic_year: feeForm.academic_year,
          semester: feeForm.semester || null,
          user_type: feeForm.user_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingFee.id)
        .eq('college_id', userProfile.college_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fee structure updated successfully.",
      });

      setIsEditFeeDialogOpen(false);
      setEditingFee(null);
      resetFeeForm();
      loadFeeStructures();
    } catch (error) {
      console.error('Error updating fee structure:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update fee structure.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFeeStructure = async (feeId) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;

    try {
      const { error } = await supabase
        .from('fee_structures')
        .update({ is_active: false })
        .eq('id', feeId)
        .eq('college_id', userProfile.college_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fee structure deleted successfully.",
      });

      loadFeeStructures();
    } catch (error) {
      console.error('Error deleting fee structure:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete fee structure.",
        variant: "destructive",
      });
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      const { error } = await supabase
        .from('fee_payments')
        .update({
          status: 'completed',
          payment_date: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment approved successfully.",
      });

      loadAllData();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve payment.",
        variant: "destructive",
      });
    }
  };

  const handleRejectPayment = async (paymentId) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('fee_payments')
        .update({ status: 'failed' })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment rejected.",
      });

      loadAllData();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject payment.",
        variant: "destructive",
      });
    }
  };

  const resetFeeForm = () => {
    setFeeForm({
      fee_type: '',
      amount: 0,
      academic_year: '2024-25',
      semester: 'Fall',
      user_type: 'student'
    });
  };

  const openEditDialog = (fee) => {
    setEditingFee(fee);
    setFeeForm({
      fee_type: fee.fee_type,
      amount: parseFloat(fee.amount),
      academic_year: fee.academic_year,
      semester: fee.semester || 'Fall',
      user_type: fee.user_type || 'student'
    });
    setIsEditFeeDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeVariant = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export.",
      });
      return;
    }

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredFeeStructures = feeStructures.filter(fee => {
    const matchesSearch = fee.fee_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.academic_year.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = filterSemester === 'all' || fee.semester === filterSemester;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && fee.is_active) ||
      (filterStatus === 'inactive' && !fee.is_active);

    return matchesSearch && matchesSemester && matchesStatus;
  });


  const filteredPayments = payments.filter(payment => {
    const fullName = `${payment.user_profiles?.first_name} ${payment.user_profiles?.last_name}`.toLowerCase();
    const userCode = payment.user_profiles?.user_code?.toLowerCase() || '';
    const feeType = payment.fee_structures?.fee_type?.toLowerCase() || '';

    return fullName.includes(searchTerm.toLowerCase()) ||
      userCode.includes(searchTerm.toLowerCase()) ||
      feeType.includes(searchTerm.toLowerCase()) ||
      payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-0">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Finance Management</h2>
          <p className="text-muted-foreground text-sm sm:text-base mt-2">
            Manage fee structures, track payments, and monitor financial performance
          </p>
        </div>
        <Button onClick={loadAllData} variant="default" size="sm" className="w-full sm:w-60">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <TabsList className="grid w-full grid-cols-5 min-w-[600px] sm:min-w-0">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="structures" className="text-xs sm:text-sm">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span>Fee Structures</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span>Payments</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span>Pending ({pendingPayments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-lg sm:text-2xl font-bold">{formatCurrency(dashboardStats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  From completed payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Collection Rate</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-lg sm:text-2xl font-bold">{dashboardStats.collectionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Of expected revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Pending Payments</CardTitle>
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-lg sm:text-2xl font-bold">{dashboardStats.pendingPayments}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Awaiting verification
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Students</CardTitle>
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-lg sm:text-2xl font-bold">{dashboardStats.totalStudents}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active students
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Recent Payments</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Latest fee payments received</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3 sm:space-y-4">
                {dashboardStats.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">
                          {payment.user_profiles?.first_name} {payment.user_profiles?.last_name}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {payment.fee_structures?.fee_type} - {payment.user_profiles?.user_code}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="font-medium text-sm sm:text-base">{formatCurrency(payment.amount_paid)}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {formatDate(payment.payment_date)}
                      </p>
                    </div>
                  </div>
                ))}
                {dashboardStats.recentPayments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No recent payments found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search fee structures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <Select value={filterSemester} onValueChange={setFilterSemester}>
                <SelectTrigger className="w-full sm:w-32 text-sm">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Fall">Fall</SelectItem>
                  <SelectItem value="Spring">Spring</SelectItem>
                  <SelectItem value="Summer">Summer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-32 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isAddFeeDialogOpen} onOpenChange={setIsAddFeeDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto text-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fee Structure
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Add New Fee Structure</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Create a new fee structure for students
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fee_type" className="text-sm">Fee Type *</Label>
                      <Input
                        id="fee_type"
                        value={feeForm.fee_type}
                        onChange={(e) => setFeeForm({ ...feeForm, fee_type: e.target.value })}
                        placeholder="e.g., Tuition Fee, Library Fee"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-sm">Amount (₹) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={feeForm.amount}
                        onChange={(e) => setFeeForm({ ...feeForm, amount: Number(e.target.value) })}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="academic_year" className="text-sm">Academic Year</Label>
                      <Select value={feeForm.academic_year} onValueChange={(value) => setFeeForm({ ...feeForm, academic_year: value })}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024-25">2024-25</SelectItem>
                          <SelectItem value="2025-26">2025-26</SelectItem>
                          <SelectItem value="2026-27">2026-27</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="semester" className="text-sm">Semester</Label>
                      <Select value={feeForm.semester} onValueChange={(value) => setFeeForm({ ...feeForm, semester: value })}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fall">Fall</SelectItem>
                          <SelectItem value="Spring">Spring</SelectItem>
                          <SelectItem value="Summer">Summer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_type" className="text-sm">User Type</Label>
                    <Select value={feeForm.user_type} onValueChange={(value) => setFeeForm({ ...feeForm, user_type: value })}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="alumni">Alumni</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2">
                  <Button variant="outline" onClick={() => setIsAddFeeDialogOpen(false)} className="text-sm">
                    Cancel
                  </Button>
                  <Button onClick={handleAddFeeStructure} className="text-sm">
                    Create Fee Structure
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-4 sm:p-6 sm:pt-6 max-h-[350px] sm:max-h-[450px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm min-w-[150px]">Fee Type</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[100px]">Amount</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[120px]">Academic Year</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[100px]">Semester</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[100px]">User Type</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[80px]">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeeStructures.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium text-xs sm:text-sm min-w-[150px]">
                        {fee.fee_type}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm min-w-[100px]">{formatCurrency(fee.amount)}</TableCell>
                      <TableCell className="text-xs sm:text-sm min-w-[120px]">{fee.academic_year}</TableCell>
                      <TableCell className="text-xs sm:text-sm min-w-[100px]">{fee.semester || '-'}</TableCell>
                      <TableCell className="min-w-[100px]">
                        <Badge variant="outline" className="text-xs">{fee.user_type || 'student'}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[80px]">
                        <Badge variant={fee.is_active ? 'default' : 'secondary'} className="text-xs">
                          {fee.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex flext-items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(fee)}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-" />
                          </Button>
                          <Button
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            size="sm"
                            onClick={() => handleDeleteFeeStructure(fee.id)}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredFeeStructures.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No fee structures found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            <Button variant="default" onClick={() => exportToCSV(payments, 'payments')} className="w-full sm:w-auto text-sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Card>
            <CardContent className="p-4 sm:p-6 sm:pt-6">
              <div className="space-y-2">
                <div className="max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                  <div className="rounded-md border overflow-x-auto  max-h-[350px] sm:max-h-[450px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm min-w-[180px]">Student</TableHead>
                          <TableHead className="text-xs sm:text-sm min-w-[150px]">Fee Type</TableHead>
                          <TableHead className="text-xs sm:text-sm min-w-[100px]">Amount</TableHead>
                          <TableHead className="text-xs sm:text-sm min-w-[160px]">Payment Date</TableHead>
                          <TableHead className="text-xs sm:text-sm min-w-[120px]">Method</TableHead>
                          <TableHead className="text-xs sm:text-sm min-w-[150px]">Transaction ID</TableHead>
                          <TableHead className="text-xs sm:text-sm min-w-[100px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="min-w-[180px]">
                              <div>
                                <p className="font-medium text-xs sm:text-sm">
                                  {payment.user_profiles?.first_name} {payment.user_profiles?.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {payment.user_profiles?.user_code}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm min-w-[150px]">{payment.fee_structures?.fee_type}</TableCell>
                            <TableCell className="text-xs sm:text-sm min-w-[100px]">{formatCurrency(payment.amount_paid)}</TableCell>
                            <TableCell className="text-xs sm:text-sm min-w-[160px]">
                              {formatDate(payment.payment_date)}
                            </TableCell>
                            <TableCell className="min-w-[120px]">
                              <Badge variant="outline" className="text-xs">{payment.payment_method}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs min-w-[150px]">
                              {payment.transaction_id}
                            </TableCell>
                            <TableCell className="min-w-[100px]">
                              <Badge variant={getStatusBadgeVariant(payment.status)} className="text-xs">
                                {payment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {filteredPayments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No payments found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Pending Payment Approvals</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Review and approve offline payment submissions</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3 sm:space-y-4 max-h-[500px] sm:max-h-[700px] overflow-y-auto">
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start space-x-3 sm:space-x-4">
                          <div>
                            <p className="font-medium text-sm sm:text-base">
                              {payment.user_profiles?.first_name} {payment.user_profiles?.last_name}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {payment.user_profiles?.user_code} • {payment.user_profiles?.email}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                          <div>
                            <p className="text-xs text-gray-600">Fee Type</p>
                            <p className="font-medium text-xs sm:text-sm">{payment.fee_structures?.fee_type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Amount</p>
                            <p className="font-medium text-xs sm:text-sm">{formatCurrency(payment.amount_paid)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Payment Method</p>
                            <Badge variant="outline" className="text-xs">{payment.payment_method}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Transaction ID</p>
                            <p className="font-mono text-xs">{payment.transaction_id}</p>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Submitted: {formatDate(payment.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 lg:ml-4">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprovePayment(payment.id)}
                          className="w-full sm:w-auto text-xs"
                        >
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectPayment(payment.id)}
                          className="w-full sm:w-auto text-xs"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingPayments.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">No Pending Payments</h3>
                    <p className="text-muted-foreground text-sm">All payments have been processed</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Financial Summary</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Overview of financial performance</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Total Revenue:</span>
                    <span className="font-medium">{formatCurrency(dashboardStats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Collection Rate:</span>
                    <span className="font-medium">{dashboardStats.collectionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending Payments:</span>
                    <span className="font-medium">{dashboardStats.pendingPayments}</span></div>
                  <div className="flex justify-between text-sm">
                    <span>Total Students:</span>
                    <span className="font-medium">{dashboardStats.totalStudents}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3 sm:pt-4 text-sm">
                    <span>Active Fee Structures:</span>
                    <span className="font-medium">{feeStructures.filter(f => f.is_active).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Payments Processed:</span>
                    <span className="font-medium">{payments.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Common reporting tasks</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs sm:text-sm"
                    onClick={() => exportToCSV(payments, 'payment_report')}
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Export Payment Report
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs sm:text-sm"
                    onClick={() => exportToCSV(feeStructures, 'fee_structure_report')}
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Export Fee Structure Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Generate Monthly Report
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs sm:text-sm"
                  >
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Overdue Payments Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Payment Method Distribution</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Breakdown of payment methods used</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-2">
                {['online', 'bank_transfer', 'cash', 'cheque'].map(method => {
                  const count = payments.filter(p => p.payment_method === method).length;
                  const percentage = payments.length > 0 ? (count / payments.length * 100).toFixed(1) : 0;
                  return (
                    <div key={method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize text-xs">{method.replace('_', ' ')}</Badge>
                        <span className="text-xs sm:text-sm text-muted-foreground">{count} payments</span>
                      </div>
                      <span className="font-medium text-xs sm:text-sm">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditFeeDialogOpen} onOpenChange={setIsEditFeeDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Fee Structure</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update the fee structure details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_fee_type" className="text-sm">Fee Type *</Label>
                <Input
                  id="edit_fee_type"
                  value={feeForm.fee_type}
                  onChange={(e) => setFeeForm({ ...feeForm, fee_type: e.target.value })}
                  placeholder="e.g., Tuition Fee, Library Fee"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_amount" className="text-sm">Amount (₹) *</Label>
                <Input
                  id="edit_amount"
                  type="number"
                  value={feeForm.amount}
                  onChange={(e) => setFeeForm({ ...feeForm, amount: Number(e.target.value) })}
                  placeholder="0.00"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_academic_year" className="text-sm">Academic Year</Label>
                <Select value={feeForm.academic_year} onValueChange={(value) => setFeeForm({ ...feeForm, academic_year: value })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-25">2024-25</SelectItem>
                    <SelectItem value="2025-26">2025-26</SelectItem>
                    <SelectItem value="2026-27">2026-27</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_semester" className="text-sm">Semester</Label>
                <Select value={feeForm.semester} onValueChange={(value) => setFeeForm({ ...feeForm, semester: value })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fall">Fall</SelectItem>
                    <SelectItem value="Spring">Spring</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_user_type" className="text-sm">User Type</Label>
              <Select value={feeForm.user_type} onValueChange={(value) => setFeeForm({ ...feeForm, user_type: value })}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="alumni">Alumni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2">
            <Button variant="outline" onClick={() => {
              setIsEditFeeDialogOpen(false);
              setEditingFee(null);
              resetFeeForm();
            }} className="text-sm">
              Cancel
            </Button>
            <Button onClick={handleUpdateFeeStructure} className="text-sm">
              Update Fee Structure
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceManagement;