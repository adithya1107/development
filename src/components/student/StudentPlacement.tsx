import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Briefcase,
  Upload,
  FileText,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Building2,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Search,
  Filter,
  Download,
  ExternalLink,
  AlertCircle,
  TrendingUp,
  Award,
  Target
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudentData {
  user_id: string;
  college_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
}

interface StudentPlacementPortalProps {
  studentData: StudentData;
}

interface PlacementPost {
  id: string;
  company_name: string;
  company_logo: string;
  job_title: string;
  job_description: string;
  job_type: string;
  location: string;
  salary_range: string;
  experience_required: string;
  skills_required: string[];
  eligibility_criteria: any;
  application_deadline: string;
  interview_date: string;
  is_active: boolean;
  created_at: string;
  has_applied?: boolean;
  application_status?: string;
}

interface StudentCV {
  id: string;
  cv_url: string;
  cv_file_name: string;
  uploaded_at: string;
  is_primary: boolean;
}

interface Application {
  id: string;
  placement_post: PlacementPost;
  application_status: string;
  applied_at: string;
  cover_letter: string;
}

const StudentPlacement: React.FC<StudentPlacementPortalProps> = ({ studentData }) => {
  const [placements, setPlacements] = useState<PlacementPost[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [myCVs, setMyCVs] = useState<StudentCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementPost | null>(null);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isUploadCVOpen, setIsUploadCVOpen] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [applicationForm, setApplicationForm] = useState({
    cv_id: '',
    cover_letter: '',
    github: '',
    linkedin: '',
    portfolio: '',
    additional_notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [studentData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPlacements(),
        fetchMyCVs(),
        fetchMyApplications()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlacements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all active placements
      const { data: placementsData, error: placementsError } = await supabase
        .from('placement_posts')
        .select('*')
        .eq('college_id', studentData.college_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (placementsError) throw placementsError;

      // Get student's applications to check which placements they've applied to
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('placement_applications')
        .select('placement_post_id, application_status')
        .eq('student_id', user.id);

      if (applicationsError) throw applicationsError;

      // Create a map of applied placements
      const appliedMap = new Map(
        applicationsData?.map(app => [app.placement_post_id, app.application_status]) || []
      );

      // Merge the data
      const enrichedPlacements = placementsData?.map(placement => ({
        ...placement,
        has_applied: appliedMap.has(placement.id),
        application_status: appliedMap.get(placement.id)
      })) || [];

      setPlacements(enrichedPlacements);
    } catch (error) {
      console.error('Error fetching placements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load placement opportunities',
        variant: 'destructive'
      });
    }
  };

  const fetchMyCVs = async () => {
    try {
      const { data, error } = await supabase
        .from('student_cvs')
        .select('*')
        .eq('student_id', studentData.user_id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setMyCVs(data || []);
    } catch (error) {
      console.error('Error fetching CVs:', error);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('placement_applications')
        .select(`
          *,
          placement_post:placement_posts(*)
        `)
        .eq('student_id', studentData.user_id)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      setMyApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const handleCVUpload = async () => {
    if (!cvFile) {
      toast({
        title: 'Error',
        description: 'Please select a CV file to upload',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = cvFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `student-cvs/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('placement-assets')
        .upload(filePath, cvFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('placement-assets')
        .getPublicUrl(filePath);

      // Save CV record
      const { error: insertError } = await supabase
        .from('student_cvs')
        .insert([{
          student_id: user.id,
          cv_url: publicUrl,
          cv_file_name: cvFile.name,
          is_primary: myCVs.length === 0
        }]);

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: 'CV uploaded successfully'
      });

      setIsUploadCVOpen(false);
      setCvFile(null);
      fetchMyCVs();
    } catch (error: any) {
      console.error('Error uploading CV:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload CV',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyClick = (placement: PlacementPost) => {
    if (myCVs.length === 0) {
      toast({
        title: 'CV Required',
        description: 'Please upload your CV before applying',
        variant: 'destructive'
      });
      setIsUploadCVOpen(true);
      return;
    }

    setSelectedPlacement(placement);
    setApplicationForm({
      cv_id: myCVs.find(cv => cv.is_primary)?.id || myCVs[0]?.id || '',
      cover_letter: '',
      github: '',
      linkedin: '',
      portfolio: '',
      additional_notes: ''
    });
    setIsApplyDialogOpen(true);
  };

  const handleSubmitApplication = async () => {
    if (!selectedPlacement || !applicationForm.cv_id) {
      toast({
        title: 'Error',
        description: 'Please select a CV',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('placement_applications')
        .insert([{
          placement_post_id: selectedPlacement.id,
          student_id: studentData.user_id,
          cv_id: applicationForm.cv_id,
          cover_letter: applicationForm.cover_letter,
          additional_info: {
            github: applicationForm.github,
            linkedin: applicationForm.linkedin,
            portfolio: applicationForm.portfolio,
            additional_notes: applicationForm.additional_notes
          }
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Application submitted successfully'
      });

      setIsApplyDialogOpen(false);
      setSelectedPlacement(null);
      fetchData();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      
      // Check for unique constraint violation
      if (error.code === '23505') {
        toast({
          title: 'Error',
          description: 'You have already applied to this position',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to submit application',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'shortlisted': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'selected': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'selected': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const isDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const filteredPlacements = placements.filter(placement => {
    const matchesSearch =
      placement.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      placement.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      placement.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === 'all' ||
      placement.job_type === filterType ||
      (filterType === 'not_applied' && !placement.has_applied) ||
      (filterType === 'applied' && placement.has_applied);

    return matchesSearch && matchesFilter && placement.is_active;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campus Placements</h1>
          <p className="text-muted-foreground mt-1">
            Explore placement opportunities and manage your applications
          </p>
        </div>
        <Button onClick={() => setIsUploadCVOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload CV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Opportunities</p>
                <p className="text-2xl font-bold text-foreground mt-1">{placements.length}</p>
              </div>
              <Briefcase className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Applications</p>
                <p className="text-2xl font-bold text-foreground mt-1">{myApplications.length}</p>
              </div>
              <Send className="h-10 w-10 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shortlisted</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {myApplications.filter(a => a.application_status === 'shortlisted').length}
                </p>
              </div>
              <Target className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CVs Uploaded</p>
                <p className="text-2xl font-bold text-foreground mt-1">{myCVs.length}</p>
              </div>
              <FileText className="h-10 w-10 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="opportunities" className="space-y-6">
        <TabsList>
          <TabsTrigger value="opportunities">
            <Briefcase className="h-4 w-4 mr-2" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="applications">
            <FileText className="h-4 w-4 mr-2" />
            My Applications
          </TabsTrigger>
          <TabsTrigger value="cvs">
            <Upload className="h-4 w-4 mr-2" />
            My CVs
          </TabsTrigger>
        </TabsList>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies, positions, locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-lg text-black "
            >
              <option value="all">All Opportunities</option>
              <option value="not_applied">Not Applied</option>
              <option value="applied">Applied</option>
              <option value="full_time">Full Time</option>
              <option value="internship">Internship</option>
              <option value="part_time">Part Time</option>
            </select>
          </div>

          {/* Opportunities List */}
          <div className="space-y-4">
            {filteredPlacements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No placement opportunities found</p>
                </CardContent>
              </Card>
            ) : (
              filteredPlacements.map((placement) => {
                const deadlinePassed = isDeadlinePassed(placement.application_deadline);

                return (
                  <Card key={placement.id} className={`transition-all hover:shadow-md ${deadlinePassed ? 'opacity-60' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {placement.company_logo && (
                            <img
                              src={placement.company_logo}
                              alt={placement.company_name}
                              className="w-16 h-16 rounded object-contain border"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <CardTitle className="text-xl">{placement.job_title}</CardTitle>
                              {placement.has_applied && (
                                <Badge className={getStatusColor(placement.application_status || 'pending')}>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Applied
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium">{placement.company_name}</span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {placement.location}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {placement.salary_range}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {placement.experience_required}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Badge>{placement.job_type.replace('_', ' ')}</Badge>
                      </div>

                      <p className="text-sm text-foreground line-clamp-3">
                        {placement.job_description}
                      </p>

                      {placement.skills_required && placement.skills_required.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">Skills Required:</p>
                          <div className="flex flex-wrap gap-2">
                            {placement.skills_required.map((skill, idx) => (
                              <Badge key={idx} variant="outline">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          {deadlinePassed ? (
                            <span className="text-red-500">Deadline passed</span>
                          ) : (
                            <>
                              <Calendar className="h-4 w-4 inline mr-1" />
                              Apply by: {new Date(placement.application_deadline).toLocaleDateString()}
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!placement.has_applied && !deadlinePassed && (
                            <Button onClick={() => handleApplyClick(placement)}>
                              <Send className="h-4 w-4 mr-2" />
                              Apply Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          {myApplications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">You haven't applied to any positions yet</p>
                <Button className="mt-4" onClick={() => document.querySelector('[value="opportunities"]')?.dispatchEvent(new Event('click', { bubbles: true }))}>
                  Browse Opportunities
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myApplications.map((application) => (
                <Card key={application.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {application.placement_post.company_logo && (
                          <img
                            src={application.placement_post.company_logo}
                            alt={application.placement_post.company_name}
                            className="w-12 h-12 rounded object-contain"
                          />
                        )}
                        <div>
                          <CardTitle className="text-lg">{application.placement_post.job_title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{application.placement_post.company_name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(application.application_status)}>
                              {getStatusIcon(application.application_status)}
                              <span className="ml-1">{application.application_status}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Applied on {new Date(application.applied_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {application.cover_letter && (
                    <CardContent>
                      <div className="bg-muted p-3 rounded">
                        <p className="text-sm font-medium mb-1">Cover Letter:</p>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {application.cover_letter}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CVs Tab */}
        <TabsContent value="cvs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myCVs.map((cv) => (
              <Card key={cv.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-10 w-10 text-blue-500" />
                      <div>
                        <p className="font-medium text-foreground">{cv.cv_file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded {new Date(cv.uploaded_at).toLocaleDateString()}
                        </p>
                        {cv.is_primary && (
                          <Badge className="mt-1" variant="outline">Primary CV</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(cv.cv_url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {myCVs.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No CVs uploaded yet</p>
                <Button onClick={() => setIsUploadCVOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First CV
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload CV Dialog */}
      {isUploadCVOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Upload CV</CardTitle>
              <CardDescription>Upload your resume/CV (PDF format recommended)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                {cvFile ? (
                  <div>
                    <FileText className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium">{cvFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(cvFile.size / 1024).toFixed(2)} KB</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCvFile(null)}
                      className="mt-2"
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="cv-upload"
                    />
                    <Label htmlFor="cv-upload" className="cursor-pointer text-blue-600 hover:text-blue-700">
                      Click to select CV
                    </Label>
                    <p className="text-xs text-muted-foreground mt-2">PDF, DOC, or DOCX (Max 5MB)</p>
                  </div>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Make sure your CV includes your contact information, education, skills, and experience.
                </AlertDescription>
              </Alert>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => {
                setIsUploadCVOpen(false);
                setCvFile(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleCVUpload} disabled={!cvFile || isSubmitting}>
                {isSubmitting ? 'Uploading...' : 'Upload CV'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Apply Dialog */}
      {isApplyDialogOpen && selectedPlacement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Apply for {selectedPlacement.job_title}</CardTitle>
              <CardDescription>
                {selectedPlacement.company_name} - {selectedPlacement.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cv_select">Select CV *</Label>
                <select
                  id="cv_select"
                  value={applicationForm.cv_id}
                  onChange={(e) => setApplicationForm({ ...applicationForm, cv_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg mt-1"
                >
                  <option value="">Choose a CV</option>
                  {myCVs.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.cv_file_name} {cv.is_primary && '(Primary)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="cover_letter">Cover Letter</Label>
                <Textarea
                  id="cover_letter"
                  value={applicationForm.cover_letter}
                  onChange={(e) => setApplicationForm({ ...applicationForm, cover_letter: e.target.value })}
                  placeholder="Explain why you're a good fit for this position..."
                  rows={6}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="github">GitHub Profile (Optional)</Label>
                  <Input
                    id="github"
                    value={applicationForm.github}
                    onChange={(e) => setApplicationForm({ ...applicationForm, github: e.target.value })}
                    placeholder="github.com/username"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="linkedin">LinkedIn Profile (Optional)</Label>
                  <Input
                    id="linkedin"
                    value={applicationForm.linkedin}
                    onChange={(e) => setApplicationForm({ ...applicationForm, linkedin: e.target.value })}
                    placeholder="linkedin.com/in/username"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="portfolio">Portfolio/Website (Optional)</Label>
                <Input
                  id="portfolio"
                  value={applicationForm.portfolio}
                  onChange={(e) => setApplicationForm({ ...applicationForm, portfolio: e.target.value })}
                  placeholder="yourwebsite.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="additional_notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="additional_notes"
                  value={applicationForm.additional_notes}
                  onChange={(e) => setApplicationForm({ ...applicationForm, additional_notes: e.target.value })}
                  placeholder="Any additional information you'd like to share..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Review all details carefully before submitting. You cannot modify your application after submission.
                </AlertDescription>
              </Alert>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsApplyDialogOpen(false);
                  setSelectedPlacement(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitApplication} disabled={isSubmitting || !applicationForm.cv_id}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentPlacement;