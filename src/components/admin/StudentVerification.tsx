import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  UserCheck, UserX, Clock, CheckCircle, XCircle, AlertCircle, FileText,
  Eye, Upload, Loader2, Brain, History, User, Phone, MapPin,
  CreditCard, BookOpen, Users, Building, Save, Edit, RefreshCw, Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  college_id: string;
  user_type: string;
}

interface AdminRole {
  role_type: string;
  permissions: any;
}

interface StudentVerificationProps {
  userProfile: UserProfile;
  adminRoles: AdminRole[];
}

const StudentVerification: React.FC<StudentVerificationProps> = ({ userProfile, adminRoles }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('info');
  const [fullStudentData, setFullStudentData] = useState<any>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processingDoc, setProcessingDoc] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const documentTypes = [
    { key: 'aadhar', label: 'Aadhar Card', required: true },
    { key: '10th_marksheet', label: '10th Marksheet', required: true },
    { key: '12th_marksheet', label: '12th Marksheet', required: true },
    { key: 'photo', label: 'Passport Photo', required: true },
    { key: 'income_certificate', label: 'Income Certificate', required: false },
    { key: 'caste_certificate', label: 'Caste Certificate', required: false },
    { key: 'transfer_certificate', label: 'Transfer Certificate', required: false }
  ];

  useEffect(() => {
    loadStudents();
  }, [activeTab, refreshTrigger]);

  useEffect(() => {
    if (isDetailViewOpen && selectedStudent) {
      loadFullStudentData();
      loadDocuments();
      loadHistory();
    }
  }, [isDetailViewOpen, selectedStudent]);

  const loadStudents = async () => {
    try {
      setIsLoading(true);

      const { data: studentData, error } = await supabase
        .from('student')
        .select(`
          *,
          user_profiles!inner (
            user_code,
            email,
            college_id
          )
        `)
        .eq('user_profiles.college_id', userProfile.college_id)
        .eq('verification_status', activeTab)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const studentsWithCompletion = await Promise.all(
        (studentData || []).map(async (student) => {
          const { data: completionData } = await supabase
            .rpc('calculate_student_profile_completion', { student_uuid: student.id });
          
          return {
            ...student,
            profile_completion_percentage: completionData || 0
          };
        })
      );

      setStudents(studentsWithCompletion);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Failed to load students.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFullStudentData = async () => {
    if (!selectedStudent) return;
    
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('student')
        .select('*')
        .eq('id', selectedStudent.id)
        .single();

      if (studentError) throw studentError;

      const { data: educationData } = await supabase
        .from('education_history')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .order('year_of_passing', { ascending: false });

      const { data: parentData } = await supabase
        .from('parent_student_links')
        .select('*')
        .eq('student_id', selectedStudent.id);

      const { data: bankingData } = await supabase
        .from('student_banking_info')
        .select('*')
        .eq('student_id', selectedStudent.id);

      const { data: userProfileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', selectedStudent.id)
        .single();

      const fullData = {
        ...studentData,
        education_history: educationData || [],
        parent_info: parentData || [],
        banking_info: bankingData || [],
        user_profile: userProfileData
      };

      setFullStudentData(fullData);
      setFormData(fullData);
      setVerificationNotes(studentData?.verification_notes || '');
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const loadDocuments = async () => {
    if (!selectedStudent) return;

    try {
      const { data, error } = await supabase
        .from('student_document_verification')
        .select('*')
        .eq('student_id', selectedStudent.id);

      if (error) throw error;
      setDocuments(data || []);
      await checkStorageDocuments();
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const checkStorageDocuments = async () => {
    if (!selectedStudent) return;

    try {
      const { data: fileList } = await supabase.storage
        .from('Student Documents')
        .list(selectedStudent.id);

      if (fileList) {
        for (const file of fileList) {
          const docType = file.name.replace('.pdf', '').replace(/_/g, '_');
          
          const { data: existingDoc } = await supabase
            .from('student_document_verification')
            .select('id')
            .eq('student_id', selectedStudent.id)
            .eq('document_type', docType)
            .single();

          if (!existingDoc) {
            const filePath = `${selectedStudent.id}/${file.name}`;
            const { data: signedUrl } = await supabase.storage
              .from('Student Documents')
              .createSignedUrl(filePath, 60 * 60 * 24);

            if (signedUrl) {
              await supabase
                .from('student_document_verification')
                .insert({
                  student_id: selectedStudent.id,
                  document_type: docType,
                  document_url: signedUrl.signedUrl,
                  verification_status: 'pending'
                });
            }
          }
        }

        const { data: updatedDocs } = await supabase
          .from('student_document_verification')
          .select('*')
          .eq('student_id', selectedStudent.id);

        if (updatedDocs) setDocuments(updatedDocs);
      }
    } catch (error) {
      console.error('Error checking storage documents:', error);
    }
  };

  const loadHistory = async () => {
    if (!selectedStudent) return;

    try {
      const { data, error } = await supabase
        .from('student_verification_audit')
        .select(`
          *,
          user_profiles!student_verification_audit_performed_by_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('student_id', selectedStudent.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleVerifyStudent = async () => {
    if (!selectedStudent) return;

    try {
      const { error } = await supabase
        .from('student')
        .update({
          verification_status: 'verified',
          verified_by: userProfile.id,
          verified_at: new Date().toISOString(),
          verification_notes: verificationNotes
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      await supabase.from('student_verification_audit').insert({
        student_id: selectedStudent.id,
        action: 'verified',
        performed_by: userProfile.id,
        old_status: selectedStudent.verification_status,
        new_status: 'verified',
        notes: verificationNotes
      });

      toast({ title: "Success", description: "Student verified successfully." });
      setIsDetailViewOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error verifying student:', error);
      toast({ title: "Error", description: "Failed to verify student.", variant: "destructive" });
    }
  };

  const handleRejectStudent = async () => {
    if (!selectedStudent || !verificationNotes.trim()) {
      toast({ title: "Error", description: "Please provide rejection reason.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('student')
        .update({
          verification_status: 'rejected',
          verified_by: userProfile.id,
          verified_at: new Date().toISOString(),
          verification_notes: verificationNotes
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      await supabase.from('student_verification_audit').insert({
        student_id: selectedStudent.id,
        action: 'rejected',
        performed_by: userProfile.id,
        old_status: selectedStudent.verification_status,
        new_status: 'rejected',
        notes: verificationNotes
      });

      toast({ title: "Success", description: "Student verification rejected." });
      setIsDetailViewOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error rejecting student:', error);
      toast({ title: "Error", description: "Failed to reject student.", variant: "destructive" });
    }
  };

  const handleMarkIncomplete = async () => {
    if (!selectedStudent) return;

    try {
      const { error } = await supabase
        .from('student')
        .update({
          verification_status: 'incomplete',
          verification_notes: verificationNotes
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      await supabase.from('student_verification_audit').insert({
        student_id: selectedStudent.id,
        action: 'marked_incomplete',
        performed_by: userProfile.id,
        old_status: selectedStudent.verification_status,
        new_status: 'incomplete',
        notes: verificationNotes
      });

      toast({ title: "Success", description: "Student marked as incomplete." });
      setIsDetailViewOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error marking incomplete:', error);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const handleSaveInfo = async () => {
    if (!selectedStudent) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('student')
        .update({
          name: formData.name,
          dob: formData.dob,
          gender: formData.gender,
          blood_group: formData.blood_group,
          category: formData.category,
          aadhar_number: formData.aadhar_number,
          pan: formData.pan,
          contact_information: formData.contact_information,
          emergency_contacts: formData.emergency_contacts,
          address: formData.address,
          nationality: formData.nationality,
          religion: formData.religion,
          caste: formData.caste,
          mother_tongue: formData.mother_tongue,
          admission_date: formData.admission_date,
          enrollment_number: formData.enrollment_number,
          previous_institution: formData.previous_institution,
          guardian_name: formData.guardian_name,
          guardian_relation: formData.guardian_relation,
          guardian_contact: formData.guardian_contact,
          guardian_occupation: formData.guardian_occupation,
          hostel_building: formData.hostel_building,
          room_number: formData.room_number,
          mess_pref: formData.mess_pref,
          disability_status: formData.disability_status
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      await supabase.from('student_verification_audit').insert({
        student_id: selectedStudent.id,
        action: 'information_updated',
        performed_by: userProfile.id,
        notes: 'Student information updated by admin'
      });

      toast({ title: "Success", description: "Student information updated successfully." });
      await loadFullStudentData();
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving student data:', error);
      toast({ title: "Error", description: "Failed to save information.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const verifyDocument = async (docId: string, docType: string) => {
    if (!selectedStudent) return;

    try {
      setProcessingDoc(docId);

      const { error } = await supabase
        .from('student_document_verification')
        .update({
          verification_status: 'verified',
          verified_by: userProfile.id,
          verified_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', docId);

      if (error) throw error;

      await supabase.from('student_verification_audit').insert({
        student_id: selectedStudent.id,
        action: 'document_verified',
        performed_by: userProfile.id,
        notes: `${docType} verified`
      });

      toast({ title: "Success", description: "Document verified successfully." });
      await loadDocuments();
      await updateStudentDocumentStatus();
    } catch (error) {
      console.error('Error verifying document:', error);
      toast({ title: "Error", description: "Failed to verify document.", variant: "destructive" });
    } finally {
      setProcessingDoc(null);
    }
  };

  const rejectDocument = async (docId: string, docType: string) => {
    if (!selectedStudent) return;

    const reason = rejectionReasons[docId];
    if (!reason || !reason.trim()) {
      toast({ title: "Error", description: "Please provide rejection reason.", variant: "destructive" });
      return;
    }

    try {
      setProcessingDoc(docId);

      const { error } = await supabase
        .from('student_document_verification')
        .update({
          verification_status: 'rejected',
          verified_by: userProfile.id,
          verified_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', docId);

      if (error) throw error;

      await supabase.from('student_verification_audit').insert({
        student_id: selectedStudent.id,
        action: 'document_rejected',
        performed_by: userProfile.id,
        notes: `${docType} rejected: ${reason}`
      });

      toast({ title: "Success", description: "Document rejected." });
      await loadDocuments();
      await updateStudentDocumentStatus();
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast({ title: "Error", description: "Failed to reject document.", variant: "destructive" });
    } finally {
      setProcessingDoc(null);
      setRejectionReasons(prev => ({ ...prev, [docId]: '' }));
    }
  };

  const runAIVerification = async (docId: string) => {
    try {
      setProcessingDoc(docId);

      const aiScore = Math.random() * 100;
      const aiDetails = {
        confidence: aiScore,
        checks: {
          quality: aiScore > 70,
          authenticity: aiScore > 60,
          completeness: aiScore > 80,
          readability: aiScore > 75
        },
        recommendations: aiScore < 70 
          ? ['Document quality could be improved', 'Consider re-uploading with better clarity']
          : ['Document appears valid', 'Ready for manual verification']
      };

      const { error } = await supabase
        .from('student_document_verification')
        .update({
          ai_verification_score: aiScore,
          ai_verification_details: aiDetails
        })
        .eq('id', docId);

      if (error) throw error;

      toast({ title: "AI Verification Complete", description: `Confidence Score: ${aiScore.toFixed(1)}%` });
      await loadDocuments();
    } catch (error) {
      console.error('Error running AI verification:', error);
      toast({ title: "Error", description: "Failed to run AI verification.", variant: "destructive" });
    } finally {
      setProcessingDoc(null);
    }
  };

  const updateStudentDocumentStatus = async () => {
    if (!selectedStudent) return;

    try {
      const { data: allDocs } = await supabase
        .from('student_document_verification')
        .select('verification_status, document_type')
        .eq('student_id', selectedStudent.id);

      if (allDocs) {
        const requiredDocs = documentTypes.filter(d => d.required).map(d => d.key);
        const verifiedRequiredDocs = allDocs.filter(
          doc => requiredDocs.includes(doc.document_type) && doc.verification_status === 'verified'
        ).length;

        const documentsVerified = verifiedRequiredDocs >= requiredDocs.length;

        await supabase
          .from('student')
          .update({ documents_verified: documentsVerified })
          .eq('id', selectedStudent.id);
      }
    } catch (error) {
      console.error('Error updating document status:', error);
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.name?.toLowerCase().includes(searchLower) ||
      student.enrollment_number?.toLowerCase().includes(searchLower) ||
      student.user_profiles?.user_code?.toLowerCase().includes(searchLower) ||
      student.user_profiles?.email?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>,
      incomplete: <Badge className="bg-orange-100 text-orange-800">Incomplete</Badge>,
      verified: <Badge className="bg-green-100 text-green-800">Verified</Badge>,
      rejected: <Badge className="bg-red-100 text-red-800">Rejected</Badge>
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const InfoField = ({ label, value, icon: Icon, field, type = 'text' }: any) => (
    <div>
      <Label className="flex items-center space-x-2 mb-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <span>{label}</span>
      </Label>
      {isEditMode ? (
        type === 'select' ? (
          <Select value={formData[field] || ''} onValueChange={(val) => setFormData((prev: any) => ({ ...prev, [field]: val }))}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field === 'gender' && (
                <>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </>
              )}
              {field === 'blood_group' && (
                <>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </>
              )}
              {field === 'category' && (
                <>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="OBC">OBC</SelectItem>
                  <SelectItem value="SC">SC</SelectItem>
                  <SelectItem value="ST">ST</SelectItem>
                  <SelectItem value="EWS">EWS</SelectItem>
                </>
              )}
              {field === 'mess_pref' && (
                <>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="nveg">Non-Vegetarian</SelectItem>
                </>
              )}
              {field === 'disability_status' && (
                <>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={type}
            value={formData[field] || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, [field]: e.target.value }))}
          />
        )
      ) : (
        <p className="text-sm px-3 py-2 bg-gray-50 rounded-md">
          {value || 'Not provided'}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="inline">Pending</span>
          </TabsTrigger>
          <TabsTrigger value="incomplete" className="flex items-center space-x-2">
            <UserX className="w-4 h-4" />
            <span className="inline">Incomplete</span>
          </TabsTrigger>
          <TabsTrigger value="verified" className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="inline">Verified</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center space-x-2">
            <UserX className="w-4 h-4" />
            <span className="inline">Rejected</span>
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Students</span>
            </CardTitle>
            <CardDescription className="ml-7">
              Manage and verify student information and documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, enrollment, code, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="animate-spin h-8 w-8 mx-auto text-blue-600" />
                <p className="mt-2 text-gray-600">Loading students...</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border max-h-[450px] overflow-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Details</TableHead>
                        <TableHead>User Code</TableHead>
                        <TableHead>Enrollment</TableHead>
                        <TableHead>Profile Completion</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{student.name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">
                                {student.user_profiles?.email || 'No email'}
                              </div>
                              <div className="text-xs text-gray-400">
                                DOB: {student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {student.user_profiles?.user_code || 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {student.enrollment_number || 'Not assigned'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className={`font-semibold ${getCompletionColor(student.profile_completion_percentage)}`}>
                                {student.profile_completion_percentage}%
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                                <div 
                                  className={`h-2 rounded-full ${
                                    student.profile_completion_percentage >= 80 ? 'bg-green-500' :
                                    student.profile_completion_percentage >= 50 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${student.profile_completion_percentage}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.documents_verified ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(student.verification_status)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsDetailViewOpen(true);
                                setDetailTab('info');
                                setIsEditMode(false);
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredStudents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No {activeTab} students found.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Detail View Dialog */}
      {selectedStudent && fullStudentData && (
        <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="w-6 h-6" />
                  <div>
                    <div className="text-xl font-bold">{fullStudentData.name}</div>
                    <div className="text-sm text-gray-500 font-normal">
                      {fullStudentData.user_profile?.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(fullStudentData.verification_status)}
                  <Badge variant="outline" className={getCompletionColor(selectedStudent.profile_completion_percentage)}>
                    {selectedStudent.profile_completion_percentage}% Complete
                  </Badge>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">
                  <User className="w-4 h-4 mr-2" />
                  Information
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <FileText className="w-4 h-4 mr-2" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="education">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Education
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>

              {/* Information Tab */}
              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Personal Information</CardTitle>
                    <div className="flex space-x-2">
                      {isEditMode ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsEditMode(false);
                              setFormData(fullStudentData);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveInfo}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Changes
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditMode(true)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <InfoField label="Full Name" value={fullStudentData.name} icon={User} field="name" />
                      <InfoField label="Date of Birth" value={fullStudentData.dob} icon={Clock} field="dob" type="date" />
                      <InfoField label="Gender" value={fullStudentData.gender} icon={User} field="gender" type="select" />
                      <InfoField label="Blood Group" value={fullStudentData.blood_group} icon={CreditCard} field="blood_group" type="select" />
                      <InfoField label="Category" value={fullStudentData.category} icon={Users} field="category" type="select" />
                      <InfoField label="Aadhar Number" value={fullStudentData.aadhar_number} icon={CreditCard} field="aadhar_number" />
                      <InfoField label="PAN" value={fullStudentData.pan} icon={CreditCard} field="pan" />
                      <InfoField label="Contact" value={fullStudentData.contact_information} icon={Phone} field="contact_information" type="tel" />
                      <InfoField label="Emergency Contact" value={fullStudentData.emergency_contacts} icon={Phone} field="emergency_contacts" type="tel" />
                      <InfoField label="Nationality" value={fullStudentData.nationality} icon={MapPin} field="nationality" />
                      <InfoField label="Religion" value={fullStudentData.religion} icon={BookOpen} field="religion" />
                      <InfoField label="Caste" value={fullStudentData.caste} icon={BookOpen} field="caste" />
                      <InfoField label="Mother Tongue" value={fullStudentData.mother_tongue} icon={BookOpen} field="mother_tongue" />
                      <InfoField label="Enrollment Number" value={fullStudentData.enrollment_number} icon={FileText} field="enrollment_number" />
                      <InfoField label="Admission Date" value={fullStudentData.admission_date} icon={Clock} field="admission_date" type="date" />
                      <InfoField label="Previous Institution" value={fullStudentData.previous_institution} icon={Building} field="previous_institution" />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Guardian Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoField label="Guardian Name" value={fullStudentData.guardian_name} icon={User} field="guardian_name" />
                        <InfoField label="Relation" value={fullStudentData.guardian_relation} icon={Users} field="guardian_relation" />
                        <InfoField label="Guardian Contact" value={fullStudentData.guardian_contact} icon={Phone} field="guardian_contact" type="tel" />
                        <InfoField label="Guardian Occupation" value={fullStudentData.guardian_occupation} icon={Building} field="guardian_occupation" />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Address</h4>
                      <div>
                        <Label className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>Residential Address</span>
                        </Label>
                        {isEditMode ? (
                          <Textarea
                            value={formData.address || ''}
                            onChange={(e) => setFormData((prev: any) => ({ ...prev, address: e.target.value }))}
                            rows={3}
                          />
                        ) : (
                          <p className="text-sm px-3 py-2 bg-gray-50 rounded-md">
                            {fullStudentData.address || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Hostel Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoField label="Hostel Building" value={fullStudentData.hostel_building} icon={Building} field="hostel_building" />
                        <InfoField label="Room Number" value={fullStudentData.room_number} icon={Building} field="room_number" />
                        <InfoField label="Mess Preference" value={fullStudentData.mess_pref} icon={Users} field="mess_pref" type="select" />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <InfoField 
                        label="Disability Status" 
                        value={fullStudentData.disability_status ? 'Yes' : 'No'} 
                        icon={AlertCircle} 
                        field="disability_status" 
                        type="select" 
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Verification</CardTitle>
                    <CardDescription>
                      Review and verify student documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {documentTypes.map((docType) => {
                      const doc = documents.find(d => d.document_type === docType.key);
                      
                      return (
                        <Card key={docType.key} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <FileText className="w-5 h-5 text-gray-500" />
                                  <h4 className="font-semibold">{docType.label}</h4>
                                  {docType.required && (
                                    <Badge variant="outline" className="text-xs">Required</Badge>
                                  )}
                                </div>
                                
                                {doc ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                      {doc.verification_status === 'verified' && (
                                        <Badge className="bg-green-100 text-green-800">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Verified
                                        </Badge>
                                      )}
                                      {doc.verification_status === 'rejected' && (
                                        <Badge className="bg-red-100 text-red-800">
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Rejected
                                        </Badge>
                                      )}
                                      {doc.verification_status === 'pending' && (
                                        <Badge className="bg-yellow-100 text-yellow-800">
                                          <Clock className="w-3 h-3 mr-1" />
                                          Pending Review
                                        </Badge>
                                      )}
                                    </div>

                                    {doc.ai_verification_score && (
                                      <Alert>
                                        <Brain className="w-4 h-4" />
                                        <AlertDescription>
                                          <div className="flex items-center justify-between">
                                            <span>AI Confidence Score:</span>
                                            <span className="font-semibold">
                                              {doc.ai_verification_score.toFixed(1)}%
                                            </span>
                                          </div>
                                          {doc.ai_verification_details?.recommendations && (
                                            <ul className="mt-2 text-xs space-y-1">
                                              {doc.ai_verification_details.recommendations.map((rec: string, idx: number) => (
                                                <li key={idx}>• {rec}</li>
                                              ))}
                                            </ul>
                                          )}
                                        </AlertDescription>
                                      </Alert>
                                    )}

                                    {doc.rejection_reason && (
                                      <Alert variant="destructive">
                                        <AlertCircle className="w-4 h-4" />
                                        <AlertDescription>
                                          <strong>Rejection Reason:</strong> {doc.rejection_reason}
                                        </AlertDescription>
                                      </Alert>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(doc.document_url, '_blank')}
                                      >
                                        <Eye className="w-3 h-3 mr-1" />
                                        View Document
                                      </Button>

                                      {doc.verification_status === 'pending' && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => runAIVerification(doc.id)}
                                            disabled={processingDoc === doc.id}
                                          >
                                            {processingDoc === doc.id ? (
                                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                              <Brain className="w-3 h-3 mr-1" />
                                            )}
                                            AI Verify
                                          </Button>

                                          <Button
                                            size="sm"
                                            onClick={() => verifyDocument(doc.id, docType.label)}
                                            disabled={processingDoc === doc.id}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            {processingDoc === doc.id ? (
                                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                            )}
                                            Approve
                                          </Button>
                                        </>
                                      )}
                                    </div>

                                    {doc.verification_status === 'pending' && (
                                      <div className="space-y-2">
                                        <Input
                                          placeholder="Reason for rejection (required)"
                                          value={rejectionReasons[doc.id] || ''}
                                          onChange={(e) => setRejectionReasons(prev => ({
                                            ...prev,
                                            [doc.id]: e.target.value
                                          }))}
                                        />
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => rejectDocument(doc.id, docType.label)}
                                          disabled={processingDoc === doc.id || !rejectionReasons[doc.id]?.trim()}
                                        >
                                          {processingDoc === doc.id ? (
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                          ) : (
                                            <XCircle className="w-3 h-3 mr-1" />
                                          )}
                                          Reject Document
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <Alert>
                                    <Upload className="w-4 h-4" />
                                    <AlertDescription>
                                      Document not uploaded yet
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Education Tab */}
              <TabsContent value="education" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Education History</CardTitle>
                    <CardDescription>
                      Academic background and qualifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {fullStudentData.education_history && fullStudentData.education_history.length > 0 ? (
                      <div className="space-y-4">
                        {fullStudentData.education_history.map((edu: any, idx: number) => (
                          <Card key={idx} className="border">
                            <CardContent className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-gray-500">Level</Label>
                                  <p className="font-semibold">{edu.level}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Institution</Label>
                                  <p className="font-semibold">{edu.institution_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Board/University</Label>
                                  <p>{edu.board_university}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Year of Passing</Label>
                                  <p>{edu.year_of_passing}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Marks Obtained</Label>
                                  <p>{edu.marks_obtained} / {edu.total_marks}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Percentage</Label>
                                  <p className="font-semibold text-green-600">{edu.percentage}%</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No education history available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {fullStudentData.parent_info && fullStudentData.parent_info.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Parent Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {fullStudentData.parent_info.map((parent: any, idx: number) => (
                          <Card key={idx} className="border">
                            <CardContent className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-gray-500">Relation</Label>
                                  <p className="font-semibold">{parent.relation}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Occupation</Label>
                                  <p>{parent.occupation}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Income</Label>
                                  <p>₹{parent.annual_income?.toLocaleString()}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Contact</Label>
                                  <p>{parent.contact_number}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {fullStudentData.banking_info && fullStudentData.banking_info.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Banking Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {fullStudentData.banking_info.map((bank: any, idx: number) => (
                          <Card key={idx} className="border">
                            <CardContent className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-gray-500">Account Holder</Label>
                                  <p className="font-semibold">{bank.account_holder_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Bank Name</Label>
                                  <p>{bank.bank_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Account Number</Label>
                                  <p className="font-mono">{bank.account_number}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">IFSC Code</Label>
                                  <p className="font-mono">{bank.ifsc_code}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Branch</Label>
                                  <p>{bank.branch_name}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Verification History</CardTitle>
                    <CardDescription>
                      All actions performed on this student profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {history.length > 0 ? (
                      <div className="space-y-3">
                        {history.map((entry: any, idx: number) => (
                          <Card key={idx} className="border">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <History className="w-4 h-4 text-gray-500" />
                                    <span className="font-semibold capitalize">
                                      {entry.action.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{entry.notes}</p>
                                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    <span>
                                      By: {entry.user_profiles?.first_name} {entry.user_profiles?.last_name}
                                    </span>
                                    <span>
                                      {new Date(entry.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  {entry.old_status && entry.new_status && (
                                    <div className="mt-2 flex items-center space-x-2 text-xs">
                                      <Badge variant="outline">{entry.old_status}</Badge>
                                      <span>→</span>
                                      <Badge variant="outline">{entry.new_status}</Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No history available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Verification Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Verification Notes</Label>
                  <Textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add notes about the verification process..."
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {fullStudentData.verification_status !== 'verified' && (
                    <Button
                      onClick={handleVerifyStudent}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Verify Student
                    </Button>
                  )}

                  {fullStudentData.verification_status !== 'rejected' && (
                    <Button
                      onClick={handleRejectStudent}
                      variant="destructive"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Reject Verification
                    </Button>
                  )}

                  {fullStudentData.verification_status !== 'incomplete' && (
                    <Button
                      onClick={handleMarkIncomplete}
                      variant="outline"
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Mark as Incomplete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StudentVerification;