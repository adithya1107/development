import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreditCard,
  Receipt,
  Download,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { feeManagementService, type StudentFeeDetails, type FeePayment } from '@/services/feeManagementService';

interface PaymentsFeesProps {
  studentData: any;
}

const PaymentsFees: React.FC<PaymentsFeesProps> = ({ studentData }) => {
  const [studentFees, setStudentFees] = useState<StudentFeeDetails[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<FeePayment[]>([]);
  const [feeReminders, setFeeReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFeeDetails | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [processing, setProcessing] = useState(false);

  // Ensure we have a valid student ID
  const studentId = studentData?.id || 'student_default_123';
  const collegeId = studentData?.college_id || 'college_default_123';

  useEffect(() => {
    fetchAllPaymentData();
  }, [studentId]);

  const fetchAllPaymentData = async () => {
    setLoading(true);
    try {
      // Fetch student fee details with payment status
      const feeDetails = await feeManagementService.getStudentFeeDetails(studentId);
      setStudentFees(feeDetails);

      // Fetch payment history
      const history = await feeManagementService.getStudentPaymentHistory(studentId);
      setPaymentHistory(history);

      // Fetch fee reminders
      const reminders = await feeManagementService.getStudentFeeReminders(studentId);
      setFeeReminders(reminders);

      console.log('Fetched fee details:', feeDetails);
      console.log('Fetched payment history:', history);
      console.log('Fetched reminders:', reminders);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast({
        title: "Error",
        description: "Failed to load payment data. Using mock data for demonstration.",
        variant: "destructive",
      });

      // Set mock data for demonstration
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    const mockFees: StudentFeeDetails[] = [
      {
        fee_structure_id: 'fee_1',
        fee_type: 'tuition',
        fee_amount: 15000,
        total_paid: 10000,
        balance_due: 5000,
        due_date: '2024-12-31',
        payment_status: 'pending',
        academic_year: '2024-25',
        semester: 'semester_1',
        description: 'Semester 1 Tuition Fee'
      },
      {
        fee_structure_id: 'fee_2',
        fee_type: 'hostel',
        fee_amount: 8000,
        total_paid: 8000,
        balance_due: 0,
        due_date: '2024-12-31',
        payment_status: 'paid',
        academic_year: '2024-25',
        semester: 'semester_1',
        description: 'Semester 1 Hostel Fee'
      },
      {
        fee_structure_id: 'fee_3',
        fee_type: 'library',
        fee_amount: 1500,
        total_paid: 0,
        balance_due: 1500,
        due_date: '2024-11-15',
        payment_status: 'overdue',
        academic_year: '2024-25',
        semester: 'annual',
        description: 'Annual Library Fee'
      },
      {
        fee_structure_id: 'fee_4',
        fee_type: 'examination',
        fee_amount: 2000,
        total_paid: 0,
        balance_due: 2000,
        due_date: '2024-11-30',
        payment_status: 'pending',
        academic_year: '2024-25',
        semester: 'semester_1',
        description: 'Semester 1 Examination Fee'
      }
    ];

    const mockPayments: FeePayment[] = [
      {
        id: 'payment_1',
        user_id: studentId,
        college_id: collegeId,
        fee_structure_id: 'fee_1',
        amount_paid: 10000,
        payment_date: '2024-10-15T10:30:00Z',
        payment_method: 'online',
        transaction_id: 'TXN001234567',
        status: 'completed',
        created_at: '2024-10-15T10:30:00Z',
        updated_at: '2024-10-15T10:30:00Z'
      },
      {
        id: 'payment_2',
        user_id: studentId,
        college_id: collegeId,
        fee_structure_id: 'fee_2',
        amount_paid: 8000,
        payment_date: '2024-09-20T14:15:00Z',
        payment_method: 'bank_transfer',
        transaction_id: 'TXN001234568',
        status: 'completed',
        created_at: '2024-09-20T14:15:00Z',
        updated_at: '2024-09-20T14:15:00Z'
      }
    ];

    setStudentFees(mockFees);
    setPaymentHistory(mockPayments);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'online':
        return <Badge className="bg-blue-100 text-blue-800">Online</Badge>;
      case 'bank_transfer':
        return <Badge className="bg-purple-100 text-purple-800">Bank Transfer</Badge>;
      case 'cash':
        return <Badge className="bg-green-100 text-green-800">Cash</Badge>;
      case 'cheque':
        return <Badge className="bg-orange-100 text-orange-800">Cheque</Badge>;
      default:
        return <Badge variant="secondary">{method}</Badge>;
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedFee || !paymentAmount) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedFee.balance_due) {
      toast({
        title: "Error",
        description: `Payment amount must be between ₹1 and ₹${selectedFee.balance_due}.`,
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const result = await feeManagementService.processPayment({
        userId: studentId,
        collegeId: collegeId,
        feeStructureId: selectedFee.fee_structure_id,
        amountPaid: amount,
        paymentMethod: paymentMethod,
        transactionId: `TXN${Date.now()}`,
        notes: `Payment for ${selectedFee.fee_type} - ${selectedFee.academic_year}`
      });

      if (result.success) {
        toast({
          title: "Payment Successful",
          description: `₹${amount} payment processed successfully.`,
        });

        // Refresh data
        await fetchAllPaymentData();
        setPaymentDialog(false);
        setSelectedFee(null);
        setPaymentAmount('');
      } else {
        toast({
          title: "Payment Failed",
          description: result.error || "Failed to process payment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "Payment Failed",
        description: "An error occurred while processing your payment.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentDialog = (fee: StudentFeeDetails) => {
    setSelectedFee(fee);
    setPaymentAmount(fee.balance_due.toString());
    setPaymentDialog(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate totals
  const totalDue = studentFees.reduce((sum, fee) => sum + fee.balance_due, 0);
  const totalPaid = studentFees.reduce((sum, fee) => sum + fee.total_paid, 0);
  const overdueCount = studentFees.filter(fee => fee.payment_status === 'overdue').length;
  const pendingCount = studentFees.filter(fee => fee.payment_status === 'pending').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 w-full max-w-full">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="w-full">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Due</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate">{formatCurrency(totalDue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-4 w-full">
        <div className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="pending" className="text-[10px] xs:text-xs sm:text-sm px-1 xs:px-2 sm:px-3 py-2">
              <span className="truncate">Pending ({studentFees.filter(f => f.balance_due > 0).length})</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-[10px] xs:text-xs sm:text-sm px-1 xs:px-2 sm:px-3 py-2">
              <span className="truncate">History ({paymentHistory.length})</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="text-[10px] xs:text-xs sm:text-sm px-1 xs:px-2 sm:px-3 py-2">
              <span className="truncate">Reminders ({feeReminders.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="space-y-4">
          <Card className="w-full">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>Outstanding Fees</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {studentFees.filter(fee => fee.balance_due > 0).map((fee) => (
                  <div key={fee.fee_structure_id} className="border rounded-lg p-3 sm:p-4 space-y-3 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold capitalize text-sm sm:text-base md:text-lg break-words">{fee.fee_type} Fee</h3>
                        <p className="text-xs sm:text-sm text-gray-600 break-words">{fee.description}</p>
                        <p className="text-xs sm:text-sm text-gray-500">{fee.academic_year} • {fee.semester}</p>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0 space-y-1">
                        {getStatusBadge(fee.payment_status)}
                        <p className="text-xs sm:text-sm text-gray-600">Due: {formatDate(fee.due_date || '')}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600">Total Fee</p>
                            <p className="font-semibold text-sm sm:text-base">{formatCurrency(fee.fee_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600">Paid</p>
                            <p className="font-semibold text-sm sm:text-base text-green-600">{formatCurrency(fee.total_paid)}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600">Balance</p>
                            <p className="font-semibold text-sm sm:text-base text-red-600">{formatCurrency(fee.balance_due)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPaymentDialog(fee)}
                          disabled={fee.balance_due <= 0}
                          className="w-full sm:w-auto text-xs sm:text-sm"
                        >
                          <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {studentFees.filter(fee => fee.balance_due > 0).length === 0 && (
                  <div className="text-center py-6 sm:py-8">
                    <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">All Fees Paid!</h3>
                    <p className="text-sm sm:text-base text-gray-600">You have no outstanding fee payments.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="w-full">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>Payment History</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {paymentHistory.map((payment) => {
                  const feeInfo = studentFees.find(f => f.fee_structure_id === payment.fee_structure_id);
                  return (
                    <div key={payment.id} className="border rounded-lg p-3 sm:p-4 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold capitalize text-sm sm:text-base break-words">
                            {feeInfo?.fee_type || 'Fee'} Payment
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 break-words">
                            Transaction ID: {payment.transaction_id}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            {formatDate(payment.payment_date)}
                          </p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0 space-y-1">
                          <p className="font-semibold text-base sm:text-lg text-green-600">
                            {formatCurrency(payment.amount_paid)}
                          </p>
                          {getMethodBadge(payment.payment_method)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {paymentHistory.length === 0 && (
                  <div className="text-center py-6 sm:py-8">
                    <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">No Payment History</h3>
                    <p className="text-sm sm:text-base text-gray-600">Your payment history will appear here.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <Card className="w-full">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>Fee Reminders</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {feeReminders.map((reminder) => (
                  <div key={reminder.id} className="border rounded-lg p-3 sm:p-4 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base break-words">
                          {reminder.fee_structures?.fee_type} Fee Reminder
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Due Date: {formatDate(reminder.due_date)}
                        </p>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <p className="font-semibold text-sm sm:text-base text-orange-600">
                          {formatCurrency(reminder.due_amount)}
                        </p>
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          {reminder.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {feeReminders.length === 0 && (
                  <div className="text-center py-6 sm:py-8">
                    <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">No Active Reminders</h3>
                    <p className="text-sm sm:text-base text-gray-600">You have no pending fee reminders.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Make Payment</DialogTitle>
          </DialogHeader>
          {selectedFee && (
            <div className="space-y-4">
              <div className="border rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold capitalize text-sm sm:text-base break-words">{selectedFee.fee_type} Fee</h3>
                <p className="text-xs sm:text-sm text-gray-600 break-words">{selectedFee.description}</p>
                <div className="mt-2 space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between gap-2">
                    <span>Total Fee:</span>
                    <span className="font-semibold">{formatCurrency(selectedFee.fee_amount)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Already Paid:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(selectedFee.total_paid)}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-t pt-1">
                    <span>Balance Due:</span>
                    <span className="font-semibold text-red-600">{formatCurrency(selectedFee.balance_due)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="payment-amount" className="text-xs sm:text-sm">Payment Amount</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    max={selectedFee.balance_due}
                    min="1"
                    className="text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="payment-method" className="text-xs sm:text-sm">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online" className="text-xs sm:text-sm">Online Payment</SelectItem>
                      <SelectItem value="bank_transfer" className="text-xs sm:text-sm">Bank Transfer</SelectItem>
                      <SelectItem value="cash" className="text-xs sm:text-sm">Cash</SelectItem>
                      <SelectItem value="cheque" className="text-xs sm:text-sm">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col xs:flex-row gap-2">
                  <Button
                    onClick={handlePaymentSubmit}
                    disabled={processing}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    {processing ? "Processing..." : `Pay ${formatCurrency(parseFloat(paymentAmount) || 0)}`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPaymentDialog(false)}
                    disabled={processing}
                    className="text-xs sm:text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsFees;
