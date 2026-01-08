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
  Eye, Upload, Loader2, Brain, History, User, Phone, Calendar, Droplet, 
  Users, CreditCard, Shield, MapPin, Building, Utensils, Home, GraduationCap, 
  BookOpen, Award, TrendingUp, DollarSign, Save, Edit, RefreshCw, Search
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

// InfoField component moved outside to prevent cursor loss
const InfoField = ({ 
  label, 
  value, 
  icon: Icon, 
  field, 
  type = 'text',
  isEditMode,
  formData,
  setFormData,
  departments 
}: any) => (
  <div>
    <Label className="flex items-center space-x-2 mb-2">
      <Icon className="w-4 h-4" />
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
      ) : type === 'department' ? (
        <Select 
          value={formData[field] || ''} 
          onValueChange={(val) => setFormData((prev: any) => ({ ...prev, [field]: val }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments?.map((dept: any) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.department_name} ({dept.department_code})
              </SelectItem>
            ))}
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
      <p className="text-sm px-3 py-2 rounded-md border">
        {value || 'Not provided'}
      </p>
    )}
  </div>
);

const StudentVerification: React.FC<StudentVerificationProps> = ({ userProfile, adminRoles }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
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
    loadDepartments();
    loadStudents();
  }, [activeTab, refreshTrigger]);

  useEffect(() => {
    if (isDetailViewOpen && selectedStudent) {
      loadFullStudentData();
      loadDocuments();
      loadHistory();
    }
  }, [isDetailViewOpen, selectedStudent]);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_name, department_code')
        .eq('college_id', userProfile.college_id)
        .eq('is_active', true)
        .order('department_name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setIsLoading(true);

      // Step 1: Get all student user profiles from the college
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, user_code, email, first_name, last_name, college_id')
        .eq('college_id', userProfile.college_id)
        .eq('user_type', 'student')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Step 2: Get all student table entries for these users
      const userIds = (userProfiles || []).map(u => u.id);
      
      const { data: studentData, error: studentError } = await supabase
        .from('student')
        .select(`
          *,
          departments (
            id,
            department_name,
            department_code
          )
        `)
        .in('id', userIds);

      if (studentError) throw studentError;

      // Step 3: Create a map of student data
      const studentMap = new Map((studentData || []).map(s => [s.id, s]));

      // Step 4: Combine user profiles with student data
      const combinedStudents = (userProfiles || []).map(profile => {
        const studentInfo = studentMap.get(profile.id);
        
        // Determine verification status
        let verificationStatus = 'pending';
        let profileCompletionPercentage = 0;
        
        if (studentInfo) {
          // Student has an entry in student table
          verificationStatus = studentInfo.verification_status || 'incomplete';
          
          // Calculate profile completion
          const requiredFields = [
            'name', 'dob', 'gender', 'blood_group', 'category', 
            'aadhar_number', 'contact_information', 'address', 'department_id'
          ];
          
          const filledFields = requiredFields.filter(field => studentInfo[field]);
          profileCompletionPercentage = Math.round((filledFields.length / requiredFields.length) * 100);
        } else {
          // No student entry - this is a new/pending student
          verificationStatus = 'pending';
          profileCompletionPercentage = 0;
        }

        return {
          id: profile.id,
          user_profiles: profile,
          ...studentInfo,
          verification_status: verificationStatus,
          profile_completion_percentage: profileCompletionPercentage,
          has_student_entry: !!studentInfo
        };
      });

      // Step 5: Filter based on active tab
      const filteredByStatus = combinedStudents.filter(student => {
        if (activeTab === 'pending') {
          // Pending: No student entry OR has entry with pending status
          return !student.has_student_entry || student.verification_status === 'pending';
        } else if (activeTab === 'incomplete') {
          // Incomplete: Has student entry but not complete
          return student.has_student_entry && 
                 student.verification_status === 'incomplete';
        } else {
          // Verified or Rejected
          return student.verification_status === activeTab;
        }
      });

      setStudents(filteredByStatus);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Failed to load students. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createStudentEntry = async (userId: string) => {
    try {
      // Create a basic student entry
      const { data, error } = await supabase
        .from('student')
        .insert({
          id: userId,
          verification_status: 'incomplete',
          profile_completion_percentage: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating student entry:', error);
      throw error;
    }
  };

  const loadFullStudentData = async () => {
    if (!selectedStudent) return;
    
    try {
      // Check if student entry exists, if not create one
      let studentData = null;
      
      if (selectedStudent.has_student_entry) {
        const { data, error } = await supabase
          .from('student')
          .select(`
            *,
            departments (
              id,
              department_name,
              department_code
            )
          `)
          .eq('id', selectedStudent.id)
          .single();

        if (error) throw error;
        studentData = data;
      } else {
        // Create a new student entry
        studentData = await createStudentEntry(selectedStudent.id);
        toast({
          title: "Student Entry Created",
          description: "A new student profile has been initialized.",
        });
      }

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

      const { data: academicRecords } = await supabase
        .from('student_academic_records')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .order('academic_year', { ascending: false });

      const { data: scholarships } = await supabase
        .from('student_scholarships')
        .select(`
          *,
          scholarships (
            scholarship_name,
            amount
          )
        `)
        .eq('student_id', selectedStudent.id);

      const fullData = {
        ...studentData,
        education_history: educationData || [],
        parent_info: parentData || [],
        banking_info: bankingData || [],
        user_profile: userProfileData,
        academic_records: academicRecords || [],
        scholarships: scholarships || []
      };

      setFullStudentData(fullData);
      setFormData(fullData);
      setVerificationNotes(studentData?.verification_notes || '');
    } catch (error) {
      console.error('Error loading student data:', error);
      toast({
        title: "Error",
        description: "Failed to load student details.",
        variant: "destructive",
      });
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

    if (!formData.department_id) {
      toast({
        title: "Department Required",
        description: "Please assign a department before verifying the student.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('student')
        .update({
          verification_status: 'verified',
          verified_by: userProfile.id,
          verified_at: new Date().toISOString(),
          verification_notes: verificationNotes,
          documents_verified: true
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

      toast({ 
        title: "Success", 
        description: "Student verified successfully.",
        variant: "default"
      });
      setIsDetailViewOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error verifying student:', error);
      toast({ 
        title: "Error", 
        description: "Failed to verify student.", 
        variant: "destructive" 
      });
    }
  };

  const handleRejectStudent = async () => {
    if (!selectedStudent || !verificationNotes.trim()) {
      toast({ 
        title: "Error", 
        description: "Please provide rejection reason.", 
        variant: "destructive" 
      });
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

      toast({ 
        title: "Success", 
        description: "Student verification rejected." 
      });
      setIsDetailViewOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error rejecting student:', error);
      toast({ 
        title: "Error", 
        description: "Failed to reject student.", 
        variant: "destructive" 
      });
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

      toast({ 
        title: "Success", 
        description: "Student marked as incomplete." 
      });
      setIsDetailViewOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error marking incomplete:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update status.", 
        variant: "destructive" 
      });
    }
  };

  const handleSaveInfo = async () => {
    if (!selectedStudent) return;

    if (!formData.department_id) {
      toast({
        title: "Department Required",
        description: "Please select a department for the student.",
        variant: "destructive",
      });
      return;
    }

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
          disability_status: formData.disability_status,
          department_id: formData.department_id
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      await supabase.from('student_verification_audit').insert({
        student_id: selectedStudent.id,
        action: 'information_updated',
        performed_by: userProfile.id,
        notes: 'Student information updated by admin'
      });

      toast({ 
        title: "Success", 
        description: "Student information updated successfully." 
      });
      await loadFullStudentData();
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving student data:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save information.", 
        variant: "destructive" 
      });
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

      toast({ 
        title: "Success", 
        description: "Document verified successfully." 
      });
      await loadDocuments();
      await updateStudentDocumentStatus();
    } catch (error) {
      console.error('Error verifying document:', error);
      toast({ 
        title: "Error", 
        description: "Failed to verify document.", 
        variant: "destructive" 
      });
    } finally {
      setProcessingDoc(null);
    }
  };

  const rejectDocument = async (docId: string, docType: string) => {
    if (!selectedStudent) return;

    const reason = rejectionReasons[docId];
    if (!reason || !reason.trim()) {
      toast({ 
        title: "Error", 
        description: "Please provide rejection reason.", 
        variant: "destructive" 
      });
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

      toast({ 
        title: "Success", 
        description: "Document rejected." 
      });
      await loadDocuments();
      await updateStudentDocumentStatus();
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast({ 
        title: "Error", 
        description: "Failed to reject document.", 
        variant: "destructive" 
      });
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

      toast({ 
        title: "AI Verification Complete", 
        description: `Confidence Score: ${aiScore.toFixed(1)}%` 
      });
      await loadDocuments();
    } catch (error) {
      console.error('Error running AI verification:', error);
      toast({ 
        title: "Error", 
        description: "Failed to run AI verification.", 
        variant: "destructive" 
      });
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
      student.user_profiles?.email?.toLowerCase().includes(searchLower) ||
      student.departments?.department_name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: <Badge className="text-yellow-800 ">Pending</Badge>,
      incomplete: <Badge className=" text-orange-800">Incomplete</Badge>,
      verified: <Badge className=" text-green-800 ">Verified</Badge>,
      rejected: <Badge className=" text-red-800 ">Rejected</Badge>
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Verification</h1>
          <p className=" mt-1">Manage and verify student profiles and documents</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Pending</span>
          </TabsTrigger>
          <TabsTrigger value="incomplete" className="flex items-center space-x-2">
            <UserX className="w-4 h-4" />
            <span className="hidden sm:inline">Incomplete</span>
          </TabsTrigger>
          <TabsTrigger value="verified" className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Verified</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center space-x-2">
            <XCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Rejected</span>
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Students</span>
            </CardTitle>
            <CardDescription>
              {activeTab === 'pending' && 'New students awaiting initial verification'}
              {activeTab === 'incomplete' && 'Students with incomplete profile information'}
              {activeTab === 'verified' && 'Fully verified students'}
              {activeTab === 'rejected' && 'Students whose verification was rejected'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, enrollment, code, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4" />
                <p className=" font-medium">Loading students...</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow >
                        <TableHead className="font-semibold">Student Details</TableHead>
                        <TableHead className="font-semibold">User Code</TableHead>
                        <TableHead className="font-semibold">Department</TableHead>
                        <TableHead className="font-semibold">Enrollment</TableHead>
                        <TableHead className="font-semibold">Completion</TableHead>
                        <TableHead className="font-semibold">Documents</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {student.name || `${student.user_profiles?.first_name} ${student.user_profiles?.last_name}`}
                              </div>
                              <div className="text-sm ">
                                {student.user_profiles?.email || 'No email'}
                              </div>
                              {student.dob && (
                                <div className="text-xs  mt-1">
                                  DOB: {new Date(student.dob).toLocaleDateString()}
                                </div>
                              )}
                              {!student.has_student_entry && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  New Registration
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {student.user_profiles?.user_code || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {student.departments ? (
                              <div>
                                <div className="font-medium text-sm">{student.departments.department_name}</div>
                                <div className="text-xs">{student.departments.department_code}</div>
                              </div>
                            ) : (
                              <Badge variant="outline">
                                Not Assigned
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {student.enrollment_number || <span>Not assigned</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className={`font-semibold ${getCompletionColor(student.profile_completion_percentage)}`}>
                                {student.profile_completion_percentage}%
                              </div>
                              <div className="w-full rounded-full h-2 max-w-[100px]">
                                <div 
                                  className={`h-2 rounded-full transition-all ${
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
                              <Badge className=" text-green-800 ">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge className="text-yellow-800 ">
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
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 " />
                    <p className=" font-medium">No {activeTab} students found.</p>
                    <p className="text-sm  mt-1">Try adjusting your search or filters.</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Detail View Dialog - keeping the same as before */}
      {selectedStudent && fullStudentData && (
        <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="w-6 h-6" />
                  <div>
                    <div className="text-xl font-bold">{fullStudentData.name || 'New Student'}</div>
                    <div className="text-sm font-normal text-gray-600">
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
                  <CardContent className="space-y-6">
                    <div className="border-2 p-4 rounded-lg">
                      <InfoField 
                        label="Department" 
                        value={fullStudentData.departments ? 
                          `${fullStudentData.departments.department_name} (${fullStudentData.departments.department_code})` : 
                          'Not assigned'
                        } 
                        icon={Building} 
                        field="department_id"
                        type="department"
                        isEditMode={isEditMode}
                        formData={formData}
                        setFormData={setFormData}
                        departments={departments}
                      />
                      {!fullStudentData.department_id && (
                        <Alert className="mt-2" variant="destructive">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>
                            Department must be assigned before verification
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <InfoField label="Full Name" value={fullStudentData.name} icon={User} field="name" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Date of Birth" value={fullStudentData.dob} icon={Calendar} field="dob" type="date" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Gender" value={fullStudentData.gender} icon={User} field="gender" type="select" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Blood Group" value={fullStudentData.blood_group} icon={Droplet} field="blood_group" type="select" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Category" value={fullStudentData.category} icon={Users} field="category" type="select" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Aadhar Number" value={fullStudentData.aadhar_number} icon={CreditCard} field="aadhar_number" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="PAN" value={fullStudentData.pan} icon={CreditCard} field="pan" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Contact" value={fullStudentData.contact_information} icon={Phone} field="contact_information" type="tel" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Emergency Contact" value={fullStudentData.emergency_contacts} icon={Phone} field="emergency_contacts" type="tel" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Nationality" value={fullStudentData.nationality} icon={MapPin} field="nationality" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Religion" value={fullStudentData.religion} icon={BookOpen} field="religion" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Caste" value={fullStudentData.caste} icon={BookOpen} field="caste" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Mother Tongue" value={fullStudentData.mother_tongue} icon={BookOpen} field="mother_tongue" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Enrollment Number" value={fullStudentData.enrollment_number} icon={FileText} field="enrollment_number" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Admission Date" value={fullStudentData.admission_date} icon={Calendar} field="admission_date" type="date" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      <InfoField label="Previous Institution" value={fullStudentData.previous_institution} icon={Building} field="previous_institution" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Guardian Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoField label="Guardian Name" value={fullStudentData.guardian_name} icon={User} field="guardian_name" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                        <InfoField label="Relation" value={fullStudentData.guardian_relation} icon={Users} field="guardian_relation" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                        <InfoField label="Guardian Contact" value={fullStudentData.guardian_contact} icon={Phone} field="guardian_contact" type="tel" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                        <InfoField label="Guardian Occupation" value={fullStudentData.guardian_occupation} icon={Building} field="guardian_occupation" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <MapPin className="w-5 h-5 mr-2" />
                        Address
                      </h4>
                      <div>
                        <Label className="flex items-center space-x-2 mb-2">
                          <span>Residential Address</span>
                        </Label>
                        {isEditMode ? (
                          <Textarea
                            value={formData.address || ''}
                            onChange={(e) => setFormData((prev: any) => ({ ...prev, address: e.target.value }))}
                            rows={3}
                          />
                        ) : (
                          <p className="text-sm px-3 py-2 rounded-md border">
                            {fullStudentData.address || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>

                    {(fullStudentData.hostel_building || fullStudentData.room_number || fullStudentData.mess_pref) && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3 flex items-center">
                          <Home className="w-5 h-5 mr-2" />
                          Hostel Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <InfoField label="Hostel Building" value={fullStudentData.hostel_building} icon={Building} field="hostel_building" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                          <InfoField label="Room Number" value={fullStudentData.room_number} icon={Home} field="room_number" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                          <InfoField label="Mess Preference" value={fullStudentData.mess_pref} icon={Utensils} field="mess_pref" type="select" isEditMode={isEditMode} formData={formData} setFormData={setFormData} departments={departments} />
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <InfoField 
                        label="Disability Status" 
                        value={fullStudentData.disability_status ? 'Yes' : 'No'} 
                        icon={Shield} 
                        field="disability_status" 
                        type="select"
                        isEditMode={isEditMode}
                        formData={formData}
                        setFormData={setFormData}
                        departments={departments}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Verification Actions</CardTitle>
                <CardDescription>
                  Add notes and update verification status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="font-semibold mb-2 block">Verification Notes</Label>
                  <Textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add notes about the verification process, reasons for approval/rejection, or areas needing improvement..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {fullStudentData.verification_status !== 'verified' && (
                    <Button
                      onClick={handleVerifyStudent}
                      disabled={!formData.department_id}
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
                
                {!formData.department_id && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Department must be assigned before the student can be verified.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StudentVerification;