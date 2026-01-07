import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Mail, Eye, CheckCircle, XCircle, Clock, RefreshCw, Download, Upload, AlertCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { Checkbox } from '@/components/ui/checkbox';

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

interface ParentInfo {
  first_name: string;
  last_name: string;
  email: string;
  relationship_type: 'father' | 'mother' | 'guardian' | 'other';
  is_primary_contact: boolean;
  contact_info: string;
  occupation: string;
  income: string;
  dob: string;
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
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UserOnboardingRecord | null>(null);
  const [bulkImportData, setBulkImportData] = useState<BulkImportData>({
    file: null,
    userType: 'student',
    preview: []
  });
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [includeParent, setIncludeParent] = useState(false);

  const [newUserForm, setNewUserForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    user_code: '',
    user_type: 'student'
  });

  const [parentForm, setParentForm] = useState<ParentInfo>({
    first_name: '',
    last_name: '',
    email: '',
    relationship_type: 'father',
    is_primary_contact: true,
    contact_info: '',
    occupation: '',
    income: '',
    dob: ''
  });

  useEffect(() => {
    loadOnboardingData();
    
    const interval = setInterval(() => {
      checkOnboardingStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (onboardingRecords.length > 0) {
      checkOnboardingStatus();
    }
  }, [onboardingRecords.length]);

  const loadOnboardingData = async () => {
    try {
      setIsLoading(true);

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

  const generateTempPassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const validateUserCode = (userCode: string): boolean => {
    if (!userCode || userCode.trim().length === 0) {
      return false;
    }
    const regex = /^[A-Za-z0-9_-]{3,20}$/;
    return regex.test(userCode.trim());
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  const validateParentForm = (): string | null => {
    if (!parentForm.first_name || !parentForm.last_name) {
      return "Parent first name and last name are required.";
    }
    if (!parentForm.email || !validateEmail(parentForm.email)) {
      return "Valid parent email is required.";
    }
    if (!parentForm.contact_info || parentForm.contact_info.length < 10) {
      return "Valid parent contact number is required (at least 10 digits).";
    }
    if (!parentForm.occupation) {
      return "Parent occupation is required.";
    }
    if (!parentForm.income) {
      return "Parent income information is required.";
    }
    if (!parentForm.dob) {
      return "Parent date of birth is required.";
    }
    return null;
  };

  const sendWelcomeEmail = async (
    email: string,
    firstName: string,
    userCode: string,
    tempPassword: string,
    onboardingId: string
  ) => {
    try {
      console.log('Sending welcome email to:', email);
      
      await supabase
        .from('user_onboarding')
        .update({
          welcome_email_sent: true,
          welcome_email_delivered: false,
          welcome_email_failed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', onboardingId);

      const { data, error } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          email,
          firstName,
          userCode,
          tempPassword,
          onboardingId
        }
      });

      if (error) {
        console.error('Error from edge function:', error);
        
        await supabase
          .from('user_onboarding')
          .update({
            welcome_email_failed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', onboardingId);
        
        throw new Error(`Email sending failed: ${error.message || 'Unknown error'}`);
      }

      if (!data || !data.success) {
        await supabase
          .from('user_onboarding')
          .update({
            welcome_email_failed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', onboardingId);
        
        throw new Error(data?.error || 'Email sending failed');
      }

      await supabase
        .from('user_onboarding')
        .update({
          welcome_email_delivered: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', onboardingId);

      await loadOnboardingData();
    } catch (error) {
      console.error('Error in sendWelcomeEmail:', error);
      throw error;
    }
  };

  const handleAddUser = async () => {
    try {
      // Validate student form
      if (!newUserForm.first_name || !newUserForm.last_name || !newUserForm.email || !newUserForm.user_code) {
        toast({
          title: "Error",
          description: "Please fill in all required student fields including user code.",
          variant: "destructive",
        });
        return;
      }

      const userCode = newUserForm.user_code.trim();
      
      if (!validateUserCode(userCode)) {
        toast({
          title: "Error",
          description: "User code must be 3-20 characters long and contain only letters, numbers, hyphens, or underscores.",
          variant: "destructive",
        });
        return;
      }

      // Validate parent form if parent is included
      if (includeParent) {
        const parentValidationError = validateParentForm();
        if (parentValidationError) {
          toast({
            title: "Error",
            description: parentValidationError,
            variant: "destructive",
          });
          return;
        }
      }

      const tempPassword = generateTempPassword();
      const parentTempPassword = includeParent ? generateTempPassword() : null;

      // Create student and optionally parent
      const { data: createUserData, error: createUserError } = await supabase.functions.invoke('create-user-with-parent', {
        body: {
          student: {
            first_name: newUserForm.first_name,
            last_name: newUserForm.last_name,
            email: newUserForm.email,
            user_type: newUserForm.user_type,
            college_id: userProfile.college_id,
            user_code: userCode,
            temp_password: tempPassword
          },
          parent: includeParent ? {
            ...parentForm,
            temp_password: parentTempPassword,
            college_id: userProfile.college_id
          } : null
        }
      });

      if (createUserError) {
        console.error('Create user error:', createUserError);
        toast({
          title: "Error",
          description: createUserError.message || "Failed to create user account.",
          variant: "destructive",
        });
        return;
      }

      if (!createUserData || !createUserData.success) {
        const errorMsg = createUserData?.error || "Failed to create user account.";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      // Send welcome emails
      let studentEmailSuccess = false;
      let parentEmailSuccess = false;

      try {
        await sendWelcomeEmail(
          newUserForm.email,
          newUserForm.first_name,
          userCode,
          tempPassword,
          createUserData.student_onboarding_id
        );
        studentEmailSuccess = true;
      } catch (emailError: any) {
        console.error('Student email sending error:', emailError);
      }

      if (includeParent && createUserData.parent_onboarding_id) {
        try {
          await sendWelcomeEmail(
            parentForm.email,
            parentForm.first_name,
            createUserData.parent_user_code,
            parentTempPassword!,
            createUserData.parent_onboarding_id
          );
          parentEmailSuccess = true;
        } catch (emailError: any) {
          console.error('Parent email sending error:', emailError);
        }
      }

      // Reset forms
      setNewUserForm({
        first_name: '',
        last_name: '',
        email: '',
        user_code: '',
        user_type: 'student'
      });
      setParentForm({
        first_name: '',
        last_name: '',
        email: '',
        relationship_type: 'father',
        is_primary_contact: true,
        contact_info: '',
        occupation: '',
        income: '',
        dob: ''
      });
      setIncludeParent(false);
      setIsAddUserDialogOpen(false);

      await loadOnboardingData();

      let description = `Student created successfully.`;
      if (studentEmailSuccess) {
        description += ` Welcome email sent to ${newUserForm.email}.`;
      } else {
        description += ` Student email failed to send.`;
      }
      if (includeParent) {
        description += ` Parent account created.`;
        if (parentEmailSuccess) {
          description += ` Parent welcome email sent to ${parentForm.email}.`;
        } else {
          description += ` Parent email failed to send.`;
        }
      }

      toast({
        title: "Success",
        description,
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    }
  };

  const handleResendWelcomeEmail = async (recordId: string) => {
    try {
      setProcessingAction(recordId);
      
      const { data: record, error } = await supabase
        .from('user_onboarding')
        .select(`
          *,
          user_profiles (
            first_name,
            email,
            user_code
          )
        `)
        .eq('id', recordId)
        .single();

      if (error || !record) {
        throw new Error('Failed to fetch onboarding record');
      }

      await sendWelcomeEmail(
        record.user_profiles.email,
        record.user_profiles.first_name,
        record.user_profiles.user_code,
        record.temp_password,
        recordId
      );
      
      toast({
        title: "Success",
        description: "Welcome email sent successfully.",
      });
    } catch (error: any) {
      console.error('Error resending email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend welcome email.",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleMarkEmailOpened = async (recordId: string) => {
    try {
      setProcessingAction(recordId);
      
      const { error } = await supabase
        .from('user_onboarding')
        .update({
          welcome_email_opened: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) {
        throw error;
      }

      await loadOnboardingData();
      
      toast({
        title: "Success",
        description: "Email marked as opened.",
      });
    } catch (error: any) {
      console.error('Error marking email as opened:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update email status.",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleMarkOnboardingCompleted = async (recordId: string) => {
    try {
      setProcessingAction(recordId);
      
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
        throw error;
      }

      await loadOnboardingData();
      
      toast({
        title: "Success",
        description: "Onboarding marked as completed.",
      });
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding.",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const pendingRecords = onboardingRecords.filter(record => !record.onboarding_completed);
      
      for (const record of pendingRecords) {
        if (record.user_id) {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(record.user_id);
          
          if (!userError && userData.user && userData.user.last_sign_in_at) {
            await handleMarkOnboardingCompleted(record.id);
          }
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleViewDetails = (record: UserOnboardingRecord) => {
    setSelectedRecord(record);
    setIsViewDetailsOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
        complete: (results) => {
          const validRecords = results.data.filter((row: any) => {
            return row.first_name && row.last_name && row.email && row.user_code;
          });

          if (validRecords.length === 0) {
            toast({
              title: "Error",
              description: "No valid records found in CSV. Expected columns: first_name, last_name, email, user_code",
              variant: "destructive",
            });
            return;
          }

          const invalidCodes = validRecords.filter((row: any) => !validateUserCode(row.user_code));
          if (invalidCodes.length > 0) {
            toast({
              title: "Error",
              description: `${invalidCodes.length} record(s) have invalid user codes. User codes must be 3-20 characters (letters, numbers, hyphens, underscores only).`,
              variant: "destructive",
            });
            return;
          }

          setBulkImportData({
            ...bulkImportData,
            file,
            preview: validRecords.slice(0, 5)
          });

          toast({
            title: "CSV Loaded",
            description: `Found ${validRecords.length} valid record(s). Preview showing first ${Math.min(5, validRecords.length)}.`,
          });
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error",
        description: "Failed to read CSV file.",
        variant: "destructive",
      });
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportData.file) {
      toast({
        title: "Error",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingBulk(true);

    try {
      Papa.parse(bulkImportData.file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
        complete: async (results) => {
          const validRecords = results.data.filter((row: any) => {
            return row.first_name && row.last_name && row.email && row.user_code && validateUserCode(row.user_code);
          });

          let successCount = 0;
          let failCount = 0;
          const errors: string[] = [];

          for (const row of validRecords) {
            try {
              const userCode = row.user_code.trim();
              const tempPassword = generateTempPassword();

              const { data: createUserData, error: createUserError } = await supabase.functions.invoke('create-user-with-onboarding', {
                body: {
                  first_name: row.first_name.trim(),
                  last_name: row.last_name.trim(),
                  email: row.email.trim(),
                  user_type: bulkImportData.userType,
                  college_id: userProfile.college_id,
                  user_code: userCode,
                  temp_password: tempPassword
                }
              });

              if (createUserError) {
                throw new Error(createUserError.message || 'Failed to create user');
              }

              if (!createUserData.success) {
                throw new Error(createUserData.error || 'Failed to create user');
              }

              try {
                await sendWelcomeEmail(
                  row.email.trim(),
                  row.first_name.trim(),
                  userCode,
                  tempPassword,
                  createUserData.onboarding_id
                );
                successCount++;
              } catch (emailError: any) {
                console.error(`Email failed for ${row.email}:`, emailError);
                successCount++;
                errors.push(`${row.email}: User created but email failed - ${emailError.message}`);
              }
            } catch (error: any) {
              failCount++;
              errors.push(`${row.email}: ${error.message}`);
              console.error(`Error processing ${row.email}:`, error);
            }
          }

          setIsProcessingBulk(false);
          setIsBulkImportDialogOpen(false);
          setBulkImportData({
            file: null,
            userType: 'student',
            preview: []
          });

          await loadOnboardingData();

          toast({
            title: "Bulk Import Complete",
            description: `Successfully imported ${successCount} user(s). ${failCount > 0 ? `Failed: ${failCount}` : ''}`,
            variant: failCount > 0 ? "destructive" : "default",
          });

          if (errors.length > 0) {
            console.error('Import errors:', errors);
          }
        },
        error: (error) => {
          setIsProcessingBulk(false);
          console.error('CSV parsing error:', error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      setIsProcessingBulk(false);
      console.error('Error in bulk import:', error);
      toast({
        title: "Error",
        description: "Failed to process bulk import.",
        variant: "destructive",
      });
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
      return <Badge className="text-green-800">Completed</Badge>;
    }
    if (record.first_login_completed) {
      return <Badge className="text-blue-800">First Login Done</Badge>;
    }
    if (record.welcome_email_opened) {
      return <Badge className=" text-yellow-800">Email Opened</Badge>;
    }
    if (record.welcome_email_delivered) {
      return <Badge className=" text-orange-800">Awaiting Action</Badge>;
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
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Bulk Import Users</DialogTitle>
                    <DialogDescription>
                      Import multiple users from CSV file with automated onboarding
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-semibold mb-1">CSV Format Requirements:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Required columns: first_name, last_name, email, user_code</li>
                          <li>User codes must be 3-20 characters (letters, numbers, hyphens, underscores)</li>
                          <li>Column names are case-insensitive</li>
                          <li>Empty rows will be skipped</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    <div>
                      <Label htmlFor="csv_file">CSV File *</Label>
                      <Input
                        id="csv_file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        disabled={isProcessingBulk}
                      />
                    </div>

                    <div>
                      <Label htmlFor="bulk_user_type">User Type *</Label>
                      <Select 
                        value={bulkImportData.userType} 
                        onValueChange={(value) => setBulkImportData({ ...bulkImportData, userType: value })}
                        disabled={isProcessingBulk}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="faculty">Teacher</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="alumni">Alumni</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkImportData.preview.length > 0 && (
                      <div>
                        <Label className="mb-2 block">Preview (First 5 Records)</Label>
                        <div className="border rounded-lg overflow-auto max-h-64">
                          <table className="w-full text-sm">
                            <thead>
                              <tr>
                                <th className="px-4 py-2 text-left">First Name</th>
                                <th className="px-4 py-2 text-left">Last Name</th>
                                <th className="px-4 py-2 text-left">Email</th>
                                <th className="px-4 py-2 text-left">User Code</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkImportData.preview.map((row: any, index) => (
                                <tr key={index} className="border-t">
                                  <td className="px-4 py-2">{row.first_name}</td>
                                  <td className="px-4 py-2">{row.last_name}</td>
                                  <td className="px-4 py-2">{row.email}</td>
                                  <td className="px-4 py-2 font-mono">{row.user_code}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsBulkImportDialogOpen(false);
                        setBulkImportData({
                          file: null,
                          userType: 'student',
                          preview: []
                        });
                      }}
                      disabled={isProcessingBulk}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleBulkImport}
                      disabled={!bulkImportData.file || isProcessingBulk}
                    >
                      {isProcessingBulk ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import Users
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                      Create a new user with automated onboarding and welcome email
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Student Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Student Information</h3>
                      <div className="grid grid-cols-2 gap-4">
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
                          <Label htmlFor="user_code">User Code *</Label>
                          <Input
                            id="user_code"
                            value={newUserForm.user_code}
                            onChange={(e) => setNewUserForm({...newUserForm, user_code: e.target.value})}
                            placeholder="e.g., S240001, T240045"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            3-20 characters: letters, numbers, hyphens, or underscores only
                          </p>
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="user_type">User Type</Label>
                          <Select value={newUserForm.user_type} onValueChange={(value) => setNewUserForm({ ...newUserForm, user_type: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="faculty">Teacher</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="alumni">Alumni</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Include Parent Checkbox */}
                    <div className="flex items-center space-x-2 border-t pt-4">
                      <Checkbox 
                        id="include_parent" 
                        checked={includeParent}
                        onCheckedChange={(checked) => setIncludeParent(checked as boolean)}
                      />
                      <label
                        htmlFor="include_parent"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center cursor-pointer"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Include Parent/Guardian Account
                      </label>
                    </div>

                    {/* Parent Information - Only shown if checkbox is checked */}
                    {includeParent && (
                      <div className="space-y-4 border rounded-lg p-4">
                        <h3 className="text-lg font-semibold">Parent/Guardian Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="parent_first_name">First Name *</Label>
                            <Input
                              id="parent_first_name"
                              value={parentForm.first_name}
                              onChange={(e) => setParentForm({...parentForm, first_name: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="parent_last_name">Last Name *</Label>
                            <Input
                              id="parent_last_name"
                              value={parentForm.last_name}
                              onChange={(e) => setParentForm({...parentForm, last_name: e.target.value})}
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="parent_email">Email *</Label>
                            <Input
                              id="parent_email"
                              type="email"
                              value={parentForm.email}
                              onChange={(e) => setParentForm({...parentForm, email: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="relationship_type">Relationship *</Label>
                            <Select 
                              value={parentForm.relationship_type} 
                              onValueChange={(value: any) => setParentForm({ ...parentForm, relationship_type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="father">Father</SelectItem>
                                <SelectItem value="mother">Mother</SelectItem>
                                <SelectItem value="guardian">Guardian</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="parent_contact">Contact Number *</Label>
                            <Input
                              id="parent_contact"
                              type="tel"
                              value={parentForm.contact_info}
                              onChange={(e) => setParentForm({...parentForm, contact_info: e.target.value})}
                              placeholder="10-digit number"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="parent_occupation">Occupation *</Label>
                            <Input
                              id="parent_occupation"
                              value={parentForm.occupation}
                              onChange={(e) => setParentForm({...parentForm, occupation: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="parent_income">Annual Income *</Label>
                            <Input
                              id="parent_income"
                              type="number"
                              value={parentForm.income}
                              onChange={(e) => setParentForm({...parentForm, income: e.target.value})}
                              placeholder="Amount in currency"
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="parent_dob">Date of Birth *</Label>
                            <Input
                              id="parent_dob"
                              type="date"
                              value={parentForm.dob}
                              onChange={(e) => setParentForm({...parentForm, dob: e.target.value})}
                              required
                            />
                          </div>
                          <div className="col-span-2 flex items-center space-x-2">
                            <Checkbox 
                              id="is_primary_contact" 
                              checked={parentForm.is_primary_contact}
                              onCheckedChange={(checked) => setParentForm({...parentForm, is_primary_contact: checked as boolean})}
                            />
                            <label
                              htmlFor="is_primary_contact"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Set as Primary Contact
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddUser}>
                      {includeParent ? 'Create Student & Parent' : 'Create User & Send Welcome Email'}
                    </Button>
                  </DialogFooter>
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
              <TabsTrigger value="failed" className="flex items-center space-x-2 ml-2">
                <XCircle className="w-4 h-4 hidden md:block" />
                <span className="inline">Failed ({filteredRecords('failed').length})</span>
              </TabsTrigger>
            </TabsList>

            {['pending', 'completed', 'failed'].map((status) => (
              <TabsContent key={status} value={status}>
                <div className="rounded-md border max-h-[350px] sm:max-h-[450px] overflow-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">User Details</th>
                        <th className="px-4 py-3 text-left font-medium">User Code</th>
                        <th className="px-4 py-3 text-left font-medium">Email Status</th>
                        <th className="px-4 py-3 text-left font-medium">Onboarding Status</th>
                        <th className="px-4 py-3 text-left font-medium">Created</th>
                        <th className="px-4 py-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords(status).map((record) => (
                        <tr key={record.id} className="border-t">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium">
                                {record.user_profiles?.first_name} {record.user_profiles?.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{record.user_profiles?.email}</div>
                              <Badge variant="outline" className="text-xs mt-1 capitalize">
                                {record.user_profiles?.user_type}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {record.user_profiles?.user_code}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {getEmailStatusBadge(record)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getOnboardingStatusBadge(record)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(record.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              {(!record.welcome_email_sent || record.welcome_email_failed) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResendWelcomeEmail(record.id)}
                                  title="Resend Welcome Email"
                                  disabled={processingAction === record.id}
                                >
                                  {processingAction === record.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                              
                              {record.welcome_email_delivered && !record.welcome_email_opened && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkEmailOpened(record.id)}
                                  title="Mark Email as Opened"
                                  disabled={processingAction === record.id}
                                >
                                  {processingAction === record.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Mail className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                              
                              {record.welcome_email_opened && !record.onboarding_completed && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleMarkOnboardingCompleted(record.id)}
                                  title="Mark Onboarding as Completed"
                                  disabled={processingAction === record.id}
                                >
                                  {processingAction === record.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                title="View Details"
                                onClick={() => handleViewDetails(record)}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

      {selectedRecord && (
        <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Onboarding Details</DialogTitle>
              <DialogDescription>
                Complete onboarding information for {selectedRecord.user_profiles?.first_name} {selectedRecord.user_profiles?.last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Name</Label>
                  <p className="text-sm mt-1">
                    {selectedRecord.user_profiles?.first_name} {selectedRecord.user_profiles?.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="text-sm mt-1">{selectedRecord.user_profiles?.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">User Code</Label>
                  <p className="text-sm mt-1 font-mono">{selectedRecord.user_profiles?.user_code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">User Type</Label>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {selectedRecord.user_profiles?.user_type}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Email Status</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    {selectedRecord.welcome_email_sent ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm">Email Sent</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedRecord.welcome_email_delivered ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm">Email Delivered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedRecord.welcome_email_opened ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm">Email Opened</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedRecord.welcome_email_failed ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    <span className="text-sm">No Failures</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Onboarding Progress</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    {selectedRecord.first_login_completed ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm">First Login</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!selectedRecord.password_reset_required ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-orange-500" />
                    )}
                    <span className="text-sm">Password Reset</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedRecord.onboarding_completed ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-orange-500" />
                    )}
                    <span className="text-sm">Onboarding Complete</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Created At</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedRecord.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedRecord.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserOnboarding;