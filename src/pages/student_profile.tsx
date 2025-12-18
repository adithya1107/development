"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StudentData } from "./student";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, ShieldAlert, Upload, Mail, Phone, Calendar, Droplet, Users, CreditCard, Shield, AlertCircle, MapPin, Building, Utensils, Home, GraduationCap, BookOpen, Award, TrendingUp, FileText, DollarSign } from "lucide-react";

interface StudentProfileProps {
  studentData: StudentData;
  onNavigate: (v: string) => void;
}

type FullStudentProfile = {
  id: string;
  name: string;
  dob: string;
  gender: string;
  blood_group: string;
  category: string;
  aadhar_number: string;
  pan: string;
  disability_status: boolean;
  contact_information: string | null;
  emergency_contacts: string | null;
  photo_path: string | null;
  address: string | null;
  hostel_building: string | null;
  room_number: string | null;
  mess_pref: string | null;
};

type ParentInfo = {
  parent_id: string;
  relationship_type: string;
  is_primary_contact: boolean;
  DOB: string;
  occupation: string;
  income: number;
  contact_info: number;
  income_certificates: string | null;
};

type EducationHistory = {
  id: string;
  student_id: string;
  institution_name: string;
  board_university: string;
  year_of_passing: number | null;
  marks_grades: string | null;
  percentage: number | null;
  cgpa: number | null;
  has_gap_year: boolean | null;
  gap_year_reason: string | null;
};

type AcademicRecord = {
  student_id: string;
  college_id: string;
  academic_year: string;
  semester: string;
  cgpa: number | null;
  sgpa: number | null;
  total_credits: number | null;
  completed_credits: number | null;
  academic_status: string | null;
  total_grade_points: number | null;
  earned_credits: number | null;
  attempted_credits: number | null;
};

type StudentScholarship = {
  id: string;
  student_id: string;
  scholarship_type: string;
  disbursement_date: string;
  status: string;
  scholarships?: {
    scholarship_name: string;
    amount: number | null;
  };
};

const StudentProfilePage: React.FC<StudentProfileProps> = ({
  studentData,
  onNavigate,
}) => {
  const [fullProfile, setFullProfile] = useState<FullStudentProfile | null>(null);
  const [parentInfo, setParentInfo] = useState<ParentInfo[]>([]);
  const [educationHistory, setEducationHistory] = useState<EducationHistory[]>([]);
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([]);
  const [scholarships, setScholarships] = useState<StudentScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [aadharDocUrl, setAadharDocUrl] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [marksheet10Url, setMarksheet10Url] = useState<string | null>(null);
  const [uploading10, setUploading10] = useState(false);
  const [deleting10, setDeleting10] = useState(false);
  const [marksheet12Url, setMarksheet12Url] = useState<string | null>(null);
  const [uploading12, setUploading12] = useState(false);
  const [deleting12, setDeleting12] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);

      // Fetch student profile
      const { data, error } = await supabase
        .from("student")
        .select("*")
        .eq("id", studentData.user_id)
        .single();

      if (error || !data) {
        setError("No student profile found.");
      } else {
        setFullProfile(data as FullStudentProfile);

        if (data.photo_path) {
          const { data: pub } = supabase.storage
            .from("profile_photo")
            .getPublicUrl(data.photo_path);

          setAvatarUrl(`${pub?.publicUrl}?t=${Date.now()}`);
        }
      }

      // Fetch parent information
      const { data: parentData, error: parentError } = await supabase
        .from("parent_student_links")
        .select("*")
        .eq("student_id", studentData.user_id);

      if (!parentError && parentData) {
        setParentInfo(parentData as ParentInfo[]);
      }

      // Fetch academic records
      const { data: academicData, error: academicError } = await supabase
        .from("student_academic_records")
        .select("*")
        .eq("student_id", studentData.user_id)
        .order("academic_year", { ascending: false })
        .order("semester", { ascending: false });

      if (academicError) {
        console.error("Academic records error:", academicError);
      } else {
        console.log("Academic records data:", academicData);
        setAcademicRecords(academicData as AcademicRecord[]);
      }

      // Fetch scholarships
      const { data: scholarshipData, error: scholarshipError } = await supabase
        .from("student_scholarships")
        .select(`
          *,
          scholarships (
            scholarship_name,
            amount
          )
        `)
        .eq("student_id", studentData.user_id)
        .order("disbursement_date", { ascending: false });

      if (scholarshipError) {
        console.error("Scholarships error:", scholarshipError);
      } else {
        console.log("Scholarships data:", scholarshipData);
        setScholarships(scholarshipData as StudentScholarship[]);
      }

      // Fetch education history
      const { data: educationData, error: educationError } = await supabase
        .from("education_history")
        .select("*")
        .eq("student_id", studentData.user_id)
        .order("year_of_passing", { ascending: false });

      if (educationError) {
        console.error("Education history error:", educationError);
        setDebugInfo(`Education Error: ${educationError.message} (Code: ${educationError.code})`);
      } else {
        console.log("Education history data:", educationData);
        setEducationHistory(educationData as EducationHistory[]);
        // setDebugInfo(`Found ${educationData?.length || 0} education records, ${academicData?.length || 0} academic records, ${scholarshipData?.length || 0} scholarships`);
      }

      // Check for existing documents
      const { data: fileList } = await supabase.storage
        .from("Student Documents")
        .list(studentData.user_id);

      if (fileList) {
        // Check Aadhar
        if (fileList.some(file => file.name === "aadhar.pdf")) {
          const aadharPath = `${studentData.user_id}/aadhar.pdf`;
          const { data: signedUrl } = await supabase.storage
            .from("Student Documents")
            .createSignedUrl(aadharPath, 60 * 60);
          if (signedUrl) {
            setAadharDocUrl(signedUrl.signedUrl);
          }
        }

        // Check 10th Marksheet
        if (fileList.some(file => file.name === "10th_marksheet.pdf")) {
          const marksheet10Path = `${studentData.user_id}/10th_marksheet.pdf`;
          const { data: signedUrl } = await supabase.storage
            .from("Student Documents")
            .createSignedUrl(marksheet10Path, 60 * 60);
          if (signedUrl) {
            setMarksheet10Url(signedUrl.signedUrl);
          }
        }

        // Check 12th Marksheet
        if (fileList.some(file => file.name === "12th_marksheet.pdf")) {
          const marksheet12Path = `${studentData.user_id}/12th_marksheet.pdf`;
          const { data: signedUrl } = await supabase.storage
            .from("Student Documents")
            .createSignedUrl(marksheet12Path, 60 * 60);
          if (signedUrl) {
            setMarksheet12Url(signedUrl.signedUrl);
          }
        }
      }

      setLoading(false);
    };

    fetchProfile();
  }, [studentData.user_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="animate-spin h-12 w-12 text-role-student" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-4">
        <ShieldAlert className="h-16 w-16 text-red-400 mb-4" />
        <p className="text-lg text-red-400">{error}</p>
      </div>
    );
  }

  const disabilityText =
    fullProfile?.disability_status === true
      ? "Yes"
      : fullProfile?.disability_status === false
      ? "No"
      : "—";

  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${studentData.user_id}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profile_photo")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError("Failed to upload photo.");
      setUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("student")
      .update({ photo_path: filePath })
      .eq("id", studentData.user_id);

    if (updateError) {
      setError("Failed to update profile photo.");
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage
      .from("profile_photo")
      .getPublicUrl(filePath);

    setAvatarUrl(`${pub?.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file only.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB.");
      return;
    }

    setUploadingDoc(true);
    setError(null);

    const filePath = `${studentData.user_id}/aadhar.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("Student Documents")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError("Failed to upload document. Please try again.");
      setUploadingDoc(false);
      return;
    }

    const { data: signedUrl } = await supabase.storage
      .from("Student Documents")
      .createSignedUrl(filePath, 60 * 60);

    if (signedUrl) {
      setAadharDocUrl(signedUrl.signedUrl);
    }
    setUploadingDoc(false);
  };

  const handleDocumentDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    setDeletingDoc(true);
    setError(null);

    const filePath = `${studentData.user_id}/aadhar.pdf`;

    const { error: deleteError } = await supabase.storage
      .from("Student Documents")
      .remove([filePath]);

    if (deleteError) {
      setError("Failed to delete document. Please try again.");
      setDeletingDoc(false);
      return;
    }

    setAadharDocUrl(null);
    setDeletingDoc(false);
  };

  const handleMarksheet10Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file only.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB.");
      return;
    }

    setUploading10(true);
    setError(null);

    const filePath = `${studentData.user_id}/10th_marksheet.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("Student Documents")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError("Failed to upload 10th marksheet. Please try again.");
      setUploading10(false);
      return;
    }

    const { data: signedUrl } = await supabase.storage
      .from("Student Documents")
      .createSignedUrl(filePath, 60 * 60);

    if (signedUrl) {
      setMarksheet10Url(signedUrl.signedUrl);
    }
    setUploading10(false);
  };

  const handleMarksheet10Delete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    setDeleting10(true);
    setError(null);

    const filePath = `${studentData.user_id}/10th_marksheet.pdf`;

    const { error: deleteError } = await supabase.storage
      .from("Student Documents")
      .remove([filePath]);

    if (deleteError) {
      setError("Failed to delete 10th marksheet. Please try again.");
      setDeleting10(false);
      return;
    }

    setMarksheet10Url(null);
    setDeleting10(false);
  };

  const handleMarksheet12Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file only.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB.");
      return;
    }

    setUploading12(true);
    setError(null);

    const filePath = `${studentData.user_id}/12th_marksheet.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("Student Documents")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError("Failed to upload 12th marksheet. Please try again.");
      setUploading12(false);
      return;
    }

    const { data: signedUrl } = await supabase.storage
      .from("Student Documents")
      .createSignedUrl(filePath, 60 * 60);

    if (signedUrl) {
      setMarksheet12Url(signedUrl.signedUrl);
    }
    setUploading12(false);
  };

  const handleMarksheet12Delete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    setDeleting12(true);
    setError(null);

    const filePath = `${studentData.user_id}/12th_marksheet.pdf`;

    const { error: deleteError } = await supabase.storage
      .from("Student Documents")
      .remove([filePath]);

    if (deleteError) {
      setError("Failed to delete 12th marksheet. Please try again.");
      setDeleting12(false);
      return;
    }

    setMarksheet12Url(null);
    setDeleting12(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => onNavigate("dashboard")}
          className="mb-4 hover:bg-white/10 transition-colors rounded-lg"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Debug Info (temporary) */}
        {debugInfo && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-400">
            {debugInfo}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden">
          {/* Gradient Background */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-role-student/20 via-role-student/30 to-role-student/20 relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          </div>

          {/* Profile Info */}
          <div className="px-4 sm:px-8 pb-6 sm:pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-20 space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-full overflow-hidden border-4 border-background bg-background/50 backdrop-blur-sm shadow-2xl">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-role-student/20">
                      <User className="h-16 w-16 sm:h-20 sm:w-20 text-role-student" />
                    </div>
                  )}
                </div>

                {/* Upload Button Overlay */}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-white mb-1" />
                      <span className="text-xs text-white font-medium">Upload</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Name and Basic Info */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {fullProfile!.name}
                </h1>
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-role-student" />
                    <span>{studentData.email}</span>
                  </div>
                  <div className="hidden sm:block h-4 w-px bg-white/20"></div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-role-student" />
                    <span>{studentData.user_code}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center">
            <User className="h-6 w-6 mr-3 text-role-student" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { label: "Date of Birth", value: fullProfile?.dob, icon: Calendar },
              { label: "Gender", value: fullProfile?.gender, icon: Users },
              { label: "Blood Group", value: fullProfile?.blood_group, icon: Droplet },
              { label: "Category", value: fullProfile?.category, icon: Users },
              { label: "Aadhar Number", value: fullProfile?.aadhar_number, icon: CreditCard },
              { label: "PAN", value: fullProfile?.pan, icon: CreditCard },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Icon className="h-4 w-4 text-role-student" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {label}
                  </h3>
                </div>
                <p className="text-lg font-medium text-foreground">
                  {value || "—"}
                </p>
              </div>
            ))}

            {/* Disability Status Card */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-role-student" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Disability Status
                </h3>
              </div>
              <p className="text-lg font-medium text-foreground">
                {disabilityText}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center">
            <Phone className="h-6 w-6 mr-3 text-role-student" />
            Contact Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Primary Contact */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-2 mb-2">
                <Phone className="h-4 w-4 text-role-student" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Primary Contact
                </h3>
              </div>
              <p className="text-lg font-medium text-foreground">
                {fullProfile?.contact_information || "—"}
              </p>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Emergency Contact
                </h3>
              </div>
              <p className="text-lg font-medium text-foreground">
                {fullProfile?.emergency_contacts || "—"}
              </p>
            </div>

            {/* Address */}
            <div className="md:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="h-4 w-4 text-role-student" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Address
                </h3>
              </div>
              <p className="text-lg font-medium text-foreground">
                {fullProfile?.address || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Hostel Information Section */}
        {(fullProfile?.hostel_building || fullProfile?.room_number || fullProfile?.mess_pref) && (
          <div className="bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center">
              <Home className="h-6 w-6 mr-3 text-role-student" />
              Hostel Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Hostel Building */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <Building className="h-4 w-4 text-role-student" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Building
                  </h3>
                </div>
                <p className="text-lg font-medium text-foreground">
                  {fullProfile?.hostel_building || "—"}
                </p>
              </div>

              {/* Room Number */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <Home className="h-4 w-4 text-role-student" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Room Number
                  </h3>
                </div>
                <p className="text-lg font-medium text-foreground">
                  {fullProfile?.room_number || "—"}
                </p>
              </div>

              {/* Mess Preference */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <Utensils className="h-4 w-4 text-role-student" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Mess Preference
                  </h3>
                </div>
                <p className="text-lg font-medium text-foreground">
                  {fullProfile?.mess_pref || "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Parent/Guardian Information Section */}
        {parentInfo.length > 0 && (
          <div className="bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center">
              <Users className="h-6 w-6 mr-3 text-role-student" />
              Parent/Guardian Information
            </h2>

            <div className="space-y-6">
              {parentInfo.map((parent, index) => (
                <div
                  key={parent.parent_id}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground capitalize flex items-center space-x-2">
                      <span>{parent.relationship_type}</span>
                      {parent.is_primary_contact && (
                        <span className="text-xs bg-role-student/20 text-role-student px-2 py-1 rounded-full">
                          Primary Contact
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Date of Birth */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="h-3 w-3 text-role-student" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Date of Birth
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {parent.DOB || "—"}
                      </p>
                    </div>

                    {/* Occupation */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <CreditCard className="h-3 w-3 text-role-student" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Occupation
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {parent.occupation || "—"}
                      </p>
                    </div>

                    {/* Contact Info */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Phone className="h-3 w-3 text-role-student" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Contact Number
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {parent.contact_info || "—"}
                      </p>
                    </div>

                    {/* Income Certificates */}
                    {parent.income_certificates && (
                      <div className="md:col-span-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <Shield className="h-3 w-3 text-role-student" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Income Certificate
                          </p>
                        </div>
                        <p className="text-sm font-medium text-foreground break-all">
                          {parent.income_certificates}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Academic Records Section */}
        {academicRecords.length > 0 && (
          <div className="bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center">
              <TrendingUp className="h-6 w-6 mr-3 text-role-student" />
              Academic Records
            </h2>

            <div className="space-y-6">
              {academicRecords.map((record, index) => (
                <div
                  key={`${record.academic_year}-${record.semester}-${index}`}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Academic Year: {record.academic_year}
                      </h3>
                      <p className="text-sm text-role-student font-medium mt-1">
                        Semester: {record.semester}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Status: <span className={`font-medium ${record.academic_status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {record.academic_status || 'N/A'}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end mt-2 sm:mt-0 space-y-1">
                      {record.cgpa !== null && (
                        <div className="flex items-center space-x-2">
                          <Award className="h-4 w-4 text-role-student" />
                          <span className="text-lg font-bold text-foreground">
                            CGPA: {record.cgpa}
                          </span>
                        </div>
                      )}
                      {record.sgpa !== null && (
                        <div className="flex items-center space-x-2">
                          <Award className="h-4 w-4 text-blue-400" />
                          <span className="text-base font-semibold text-foreground">
                            SGPA: {record.sgpa}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Total Credits */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <FileText className="h-3 w-3 text-role-student" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Total Credits
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {record.total_credits ?? 0}
                      </p>
                    </div>

                    {/* Earned Credits */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <FileText className="h-3 w-3 text-green-400" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Earned Credits
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {record.earned_credits ?? 0}
                      </p>
                    </div>

                    {/* Attempted Credits */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <FileText className="h-3 w-3 text-yellow-400" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Attempted Credits
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {record.attempted_credits ?? 0}
                      </p>
                    </div>

                    {/* Total Grade Points */}
                    {record.total_grade_points !== null && record.total_grade_points !== 0 && (
                      <div className="md:col-span-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <TrendingUp className="h-3 w-3 text-role-student" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Total Grade Points
                          </p>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {record.total_grade_points}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scholarships Section */}
        {scholarships.length > 0 && (
          <div className="bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center">
              <Award className="h-6 w-6 mr-3 text-role-student" />
              Scholarships & Awards
            </h2>

            <div className="space-y-6">
              {scholarships.map((scholarship) => (
                <div
                  key={scholarship.id}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {scholarship.scholarship_type}
                      </h3>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          scholarship.status === 'disbursed' ? 'bg-green-500/20 text-green-400' :
                          scholarship.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                          scholarship.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {scholarship.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {scholarship.scholarships?.amount && (
                      <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                        <DollarSign className="h-5 w-5 text-green-400" />
                        <span className="text-xl font-bold text-green-400">
                          ₹{scholarship.scholarships.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Disbursement Date */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="h-3 w-3 text-role-student" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Disbursement Date
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(scholarship.disbursement_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education History Section */}
        {educationHistory.length > 0 && (
          <div className="bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center">
              <GraduationCap className="h-6 w-6 mr-3 text-role-student" />
              Education History
            </h2>

            <div className="space-y-6">
              {educationHistory.map((education) => (
                <div
                  key={education.id}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {education.institution_name}
                      </h3>
                      <p className="text-sm text-role-student font-medium mt-1">
                        {education.board_university}
                      </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end mt-2 sm:mt-0 space-y-1">
                      {education.percentage && (
                        <div className="flex items-center space-x-2">
                          <Award className="h-4 w-4 text-role-student" />
                          <span className="text-lg font-bold text-foreground">
                            {education.percentage}%
                          </span>
                        </div>
                      )}
                      {education.cgpa && (
                        <div className="flex items-center space-x-2">
                          <Award className="h-4 w-4 text-role-student" />
                          <span className="text-lg font-bold text-foreground">
                            {education.cgpa} CGPA
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Year of Passing */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="h-3 w-3 text-role-student" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Year of Passing
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {education.year_of_passing || "—"}
                      </p>
                    </div>

                    {/* Marks/Grades */}
                    {education.marks_grades && (
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <BookOpen className="h-3 w-3 text-role-student" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Marks/Grades
                          </p>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {education.marks_grades}
                        </p>
                      </div>
                    )}

                    {/* Gap Year Status */}
                    {education.has_gap_year && (
                      <div className="md:col-span-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <AlertCircle className="h-3 w-3 text-yellow-500" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Gap Year
                          </p>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {education.gap_year_reason || "Gap year taken"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div className="bg-background/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center">
            <FileText className="h-6 w-6 mr-3 text-role-student" />
            Documents
          </h2>

          {/* Aadhar Card Upload */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-5 w-5 text-role-student" />
                  <h3 className="text-lg font-semibold text-foreground">Aadhar Card</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload your Aadhar card in PDF format (max 5MB)
                </p>
              </div>

              <div className="flex items-center gap-3">
                {aadharDocUrl ? (
                  <>
                    <a
                      href={aadharDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">View Document</span>
                    </a>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDocumentDelete}
                      disabled={deletingDoc}
                      className="flex items-center space-x-2"
                    >
                      {deletingDoc ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {deletingDoc ? "Deleting..." : "Delete"}
                      </span>
                    </Button>
                  </>
                ) : (
                  <label className="flex items-center space-x-2 px-4 py-2 bg-role-student/20 text-role-student border border-role-student/30 rounded-lg hover:bg-role-student/30 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleDocumentUpload}
                      disabled={uploadingDoc}
                    />
                    {uploadingDoc ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {uploadingDoc ? "Uploading..." : "Upload Document"}
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* 10th Marksheet Upload */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <GraduationCap className="h-5 w-5 text-role-student" />
                  <h3 className="text-lg font-semibold text-foreground">10th Marksheet</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload your 10th grade marksheet in PDF format (max 5MB)
                </p>
              </div>

              <div className="flex items-center gap-3">
                {marksheet10Url ? (
                  <>
                    <a
                      href={marksheet10Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">View Document</span>
                    </a>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleMarksheet10Delete}
                      disabled={deleting10}
                      className="flex items-center space-x-2"
                    >
                      {deleting10 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {deleting10 ? "Deleting..." : "Delete"}
                      </span>
                    </Button>
                  </>
                ) : (
                  <label className="flex items-center space-x-2 px-4 py-2 bg-role-student/20 text-role-student border border-role-student/30 rounded-lg hover:bg-role-student/30 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleMarksheet10Upload}
                      disabled={uploading10}
                    />
                    {uploading10 ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {uploading10 ? "Uploading..." : "Upload Document"}
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* 12th Marksheet Upload */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <GraduationCap className="h-5 w-5 text-role-student" />
                  <h3 className="text-lg font-semibold text-foreground">12th Marksheet</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload your 12th grade marksheet in PDF format (max 5MB)
                </p>
              </div>

              <div className="flex items-center gap-3">
                {marksheet12Url ? (
                  <>
                    <a
                      href={marksheet12Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">View Document</span>
                    </a>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleMarksheet12Delete}
                      disabled={deleting12}
                      className="flex items-center space-x-2"
                    >
                      {deleting12 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {deleting12 ? "Deleting..." : "Delete"}
                      </span>
                    </Button>
                  </>
                ) : (
                  <label className="flex items-center space-x-2 px-4 py-2 bg-role-student/20 text-role-student border border-role-student/30 rounded-lg hover:bg-role-student/30 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleMarksheet12Upload}
                      disabled={uploading12}
                    />
                    {uploading12 ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {uploading12 ? "Uploading..." : "Upload Document"}
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;