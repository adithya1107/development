import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Mail, Eye, CheckCircle, XCircle, Clock, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UserOnboardingRecord {
  id: string;
  user_id: string;
  college_id: string;
  temp_password: string;
  welcome_email_sent: boolean;
  welcome_email_delivered: boolean;
  welcome_email_opened: boolean;
  welcome_email_failed: boolean;
  first_login_completed: boolean;
  password_reset_required: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    user_code: string;
    user_type: string;
  };
}

interface BulkImportData {
  file: File | null;
  userType: string;
  preview: any[];
}

interface UserProfile {
  id: string;
  college_id: string;
  user_type: string;
}

const UserOnboarding = ({ userProfile }: { userProfile: UserProfile }) => {
  const [onboardingRecords, setOnboardingRecords] = useState<UserOnboardingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [bulkImportData, setBulkImportData] = useState<BulkImportData>({
    file: null,
    userType: 'student',
    preview: []
  });

  const [newUserForm, setNewUserForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    user_type: 'student'
  });

  useEffect(() => {
    loadOnboardingData();
    
    // Set up periodic check for onboarding status updates
    const interval = setInterval(() => {
      checkOnboardingStatus();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check onboarding status when records change
    if (onboardingRecords.length > 0) {
      checkOnboardingStatus();
    }
  }, [onboardingRecords.length]);

  const loadOnboardingData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch onboarding records with user profiles
      const { data, error } = await supabase
        .from('user_onboarding')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            email,
            user_code,
            user_type
          )
        `)
        .eq('college_id', userProfile.college_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading onboarding data:', error);
        toast({
          title: "Error",
          description: "Failed to load onboarding data.",
          variant: "destructive",
        });
        return;
      }

      setOnboardingRecords(data || []);
    } catch (error) {
      console.error('Error loading onboarding data:', error);
      toast({
        title: "Error",
        description: "Failed to load onboarding data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateUserCode = (userType: string): string => {
    const year = new Date().getFullYear().toString().slice(-2);
    const typePrefix = {
      'student': 'S',
      'teacher': 'T',
      'staff': 'T',
      'admin': 'A',
      'parent': 'P',
      'alumni': 'L'
    }[userType] || 'U';
    
    const sequence = Math.floor(Math.random() * 9999) + 1;
    return `${typePrefix}${year}${sequence.toString().padStart(4, '0')}`;
  };

  const generateTempPassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddUser = async () => {
    try {
      if (!newUserForm.first_name || !newUserForm.last_name || !newUserForm.email) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      const userCode = generateUserCode(newUserForm.user_type);
      const tempPassword = generateTempPassword();

      // First, create auth user with temporary password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: tempPassword,
        options: {
          data: {
            first_name: newUserForm.first_name,
            last_name: newUserForm.last_name,
            user_type: newUserForm.user_type,
            college_id: userProfile.college_id,
            user_code: userCode
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast({
          title: "Error",
          description: authError.message || "Failed to create user account.",
          variant: "destructive",
        });
        return;
      }

      if (!authData.user) {
        toast({
          title: "Error",
          description: "Failed to create user account.",
          variant: "destructive",
        });
        return;
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          college_id: userProfile.college_id,
          user_code: userCode,
          user_type: newUserForm.user_type,
          first_name: newUserForm.first_name,
          last_name: newUserForm.last_name,
          email: newUserForm.email,
          is_active: true
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        toast({
          title: "Error",
          description: "Failed to create user profile.",
          variant: "destructive",
        });
        return;
      }

      // Create onboarding record
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('user_onboarding')
        .insert({
          user_id: authData.user.id,
          college_id: userProfile.college_id,
          temp_password: tempPassword,
          welcome_email_sent: false,
          welcome_email_delivered: false,
          welcome_email_opened: false,
          welcome_email_failed: false,
          first_login_completed: false,
          password_reset_required: true,
          onboarding_completed: false
        })
        .select()
        .single();

      if (onboardingError) {
        console.error('Onboarding error:', onboardingError);
        toast({
          title: "Error",
          description: "Failed to create onboarding record.",
          variant: "destructive",
        });
        return;
      }

      // Send welcome email (simulate for now)
      setTimeout(async () => {
        await handleSendWelcomeEmail(onboardingData.id);
      }, 1000);

      // Reset form and close dialog
      setNewUserForm({
        first_name: '',
        last_name: '',
        email: '',
        user_type: 'student'
      });
      setIsAddUserDialogOpen(false);

      // Reload data
      await loadOnboardingData();

      toast({
        title: "Success",
        description: `User created successfully. User code: ${userCode}`,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user.",
        variant: "destructive",
      });
    }
  };

  const handleSendWelcomeEmail = async (onboardingId: string) => {
    try {
      // Update onboarding record to mark email as sent
      const { error } = await supabase
        .from('user_onboarding')
        .update({
          welcome_email_sent: true,
          welcome_email_delivered: false,
          welcome_email_failed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', onboardingId);

      if (error) {
        console.error('Error updating email status:', error);
        return;
      }

      // Simulate email delivery after 2 seconds
      setTimeout(async () => {
        const { error: deliveryError } = await supabase
          .from('user_onboarding')
          .update({
            welcome_email_delivered: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', onboardingId);

        if (!deliveryError) {
          await loadOnboardingData();
        }
      }, 2000);

      await loadOnboardingData();
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  };

  const handleResendWelcomeEmail = async (recordId: string) => {
    try {
      await handleSendWelcomeEmail(recordId);
      
      toast({
        title: "Success",
        description: "Welcome email sent successfully.",
      });
    } catch (error) {
      console.error('Error resending email:', error);
      toast({
        title: "Error",
        description: "Failed to resend welcome email.",
        variant: "destructive",
      });
    }
  };

  const handleMarkOnboardingCompleted = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('user_onboarding')
        .update({
          first_login_completed: true,
          password_reset_required: false,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error updating onboarding status:', error);
        toast({
          title: "Error",
          description: "Failed to update onboarding status.",
          variant: "destructive",
        });
        return;
      }

      await loadOnboardingData();
      
      toast({
        title: "Success",
        description: "Onboarding marked as completed.",
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding.",
        variant: "destructive",
      });
    }
  };

  const handleMarkEmailOpened = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('user_onboarding')
        .update({
          welcome_email_opened: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error updating email opened status:', error);
        return;
      }

      await loadOnboardingData();
    } catch (error) {
      console.error('Error marking email as opened:', error);
    }
  };

  // Function to automatically check and update onboarding status
  const checkOnboardingStatus = async () => {
    try {
      // Get all pending onboarding records
      const pendingRecords = onboardingRecords.filter(record => !record.onboarding_completed);
      
      for (const record of pendingRecords) {
        if (record.user_id) {
          // Check if user has logged in by querying auth.users or checking last sign in
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(record.user_id);
          
          if (!userError && userData.user && userData.user.last_sign_in_at) {
            // User has logged in, mark onboarding as completed
            await handleMarkOnboardingCompleted(record.id);
          }
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const getEmailStatusBadge = (record: UserOnboardingRecord) => {
    if (record.welcome_email_failed) {
      return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    }
    if (!record.welcome_email_sent) {
      return <Badge variant="secondary" className="text-xs">Not Sent</Badge>;
    }
    if (!record.welcome_email_delivered) {
      return <Badge variant="outline" className="text-xs">Sending...</Badge>;
    }
    if (!record.welcome_email_opened) {
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Delivered</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 text-xs">Opened</Badge>;
  };

  const getOnboardingStatusBadge = (record: UserOnboardingRecord) => {
    if (record.onboarding_completed) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (record.first_login_completed) {
      return <Badge className="bg-blue-100 text-blue-800">First Login Done</Badge>;
    }
    if (record.welcome_email_opened) {
      return <Badge className="bg-yellow-100 text-yellow-800">Email Opened</Badge>;
    }
    if (record.welcome_email_delivered) {
      return <Badge className="bg-orange-100 text-orange-800">Awaiting Action</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const filteredRecords = (status: string) => {
    return onboardingRecords.filter(record => {
      switch (status) {
        case 'pending':
          return !record.onboarding_completed;
        case 'completed':
          return record.onboarding_completed;
        case 'failed':
          return record.welcome_email_failed;
        default:
          return true;
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading onboarding data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="w-7 h-7 mr-2" />
                <span>User Onboarding & Email Tracking</span>
              </CardTitle>
              <CardDescription className='mt-2'>
                Add new users with automated onboarding and track email delivery status
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Download className="w-4 h-4 mr-2" />
                    Bulk Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Import Users</DialogTitle>
                    <DialogDescription>
                      Import multiple users from CSV file with automated onboarding
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="csv_file">CSV File</Label>
                      <Input
                        id="csv_file"
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setBulkImportData({ ...bulkImportData, file });
                        }}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Expected columns: first_name, last_name, email
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="bulk_user_type">User Type</Label>
                      <Select 
                        value={bulkImportData.userType} 
                        onValueChange={(value) => setBulkImportData({ ...bulkImportData, userType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="alumni">Alumni</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsBulkImportDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button disabled>
                      Import Users (Coming Soon)
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                      Create a new user with automated onboarding and welcome email
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={newUserForm.first_name}
                        onChange={(e) => setNewUserForm({...newUserForm, first_name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={newUserForm.last_name}
                        onChange={(e) => setNewUserForm({...newUserForm, last_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="user_type">User Type</Label>
                      <Select value={newUserForm.user_type} onValueChange={(value) => setNewUserForm({...newUserForm, user_type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="alumni">Alumni</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddUser}>
                      Create User & Send Welcome Email
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="pending" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span className="inline">Pending ({filteredRecords('pending').length})</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span className="inline">Completed ({filteredRecords('completed').length})</span>
              </TabsTrigger>
              <TabsTrigger value="failed" className="flex items-center space-x-2">
                <XCircle className="w-4 h-4" />
                <span className="inline">Failed ({filteredRecords('failed').length})</span>
              </TabsTrigger>
            </TabsList>

            {['pending', 'completed', 'failed'].map((status) => (
              <TabsContent key={status} value={status}>
                <div className="rounded-md border max-h-[350px] sm:max-h-[450px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Details</TableHead>
                        <TableHead>User Code</TableHead>
                        <TableHead>Email Status</TableHead>
                        <TableHead>Onboarding Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords(status).map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {record.user_profiles?.first_name} {record.user_profiles?.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{record.user_profiles?.email}</div>
                              <Badge variant="outline" className="text-xs mt-1 capitalize">
                                {record.user_profiles?.user_type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {record.user_profiles?.user_code}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getEmailStatusBadge(record)}
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                {record.welcome_email_sent && <Mail className="w-3 h-3" />}
                                {record.welcome_email_opened && <Eye className="w-3 h-3" />}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getOnboardingStatusBadge(record)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(record.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {(!record.welcome_email_sent || record.welcome_email_failed) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResendWelcomeEmail(record.id)}
                                  title="Resend Welcome Email"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {record.welcome_email_delivered && !record.welcome_email_opened && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkEmailOpened(record.id)}
                                  title="Mark Email as Opened"
                                >
                                  <Mail className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {record.welcome_email_opened && !record.onboarding_completed && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleMarkOnboardingCompleted(record.id)}
                                  title="Mark Onboarding as Completed"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </Button>
                              )}
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                title="View Details"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredRecords(status).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No {status} onboarding records found.
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserOnboarding;