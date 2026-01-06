import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Briefcase, Plus, Edit, Search, AlertCircle, Trash2, AlertTriangle, Users, Download, Eye, FileText, Building2, Calendar, MapPin, DollarSign, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  college_id: string;
  user_type: string;
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
  application_count?: number;
}

interface PlacementApplication {
  id: string;
  student_id: string;
  application_status: string;
  applied_at: string;
  cover_letter: string;
  additional_info: any;
  student: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
  cv: {
    cv_url: string;
    cv_file_name: string;
  };
}

const PlacementManagement = ({ userProfile }: { userProfile: UserProfile }) => {
  const [placements, setPlacements] = useState<PlacementPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApplicationsDialogOpen, setIsApplicationsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementPost | null>(null);
  const [placementToDelete, setPlacementToDelete] = useState<PlacementPost | null>(null);
  const [applications, setApplications] = useState<PlacementApplication[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const [placementForm, setPlacementForm] = useState({
    company_name: '',
    job_title: '',
    job_description: '',
    job_type: 'full_time',
    location: '',
    salary_range: '',
    experience_required: '',
    skills_required: '',
    eligibility_criteria: {
      min_cgpa: '',
      allowed_branches: [],
      allowed_years: []
    },
    application_deadline: '',
    interview_date: ''
  });

  const [editForm, setEditForm] = useState({
    company_name: '',
    job_title: '',
    job_description: '',
    job_type: 'full_time',
    location: '',
    salary_range: '',
    experience_required: '',
    skills_required: '',
    eligibility_criteria: {
      min_cgpa: '',
      allowed_branches: [],
      allowed_years: []
    },
    application_deadline: '',
    interview_date: '',
    is_active: true
  });

  useEffect(() => {
    loadPlacements();
  }, [userProfile]);

  const loadPlacements = async () => {
    try {
      if (!userProfile?.college_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('placement_posts')
        .select('*')
        .eq('college_id', userProfile.college_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get application counts for each placement
      const placementsWithCounts = await Promise.all(
        (data || []).map(async (placement) => {
          const { count } = await supabase
            .from('placement_applications')
            .select('*', { count: 'exact', head: true })
            .eq('placement_post_id', placement.id);
          
          return { ...placement, application_count: count || 0 };
        })
      );

      setPlacements(placementsWithCounts);
    } catch (error) {
      console.error('Error loading placements:', error);
      toast({
        title: "Error",
        description: "Failed to load placement posts.",
        variant: "destructive",
      });
      setPlacements([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;
      const filePath = `company-logos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('placement-assets')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('placement-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload company logo.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleAddPlacement = async () => {
    if (!placementForm.company_name || !placementForm.job_title) {
      toast({
        title: "Validation Error",
        description: "Please fill in company name and job title.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const logoUrl = await uploadLogo();

      const skillsArray = placementForm.skills_required
        .split(',')
        .map(s => s.trim())
        .filter(s => s);

      const newPlacement = {
        ...placementForm,
        company_logo: logoUrl,
        skills_required: skillsArray,
        college_id: userProfile.college_id,
        posted_by: userProfile.id
      };

      const { data, error } = await supabase
        .from('placement_posts')
        .insert([newPlacement])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Placement post created successfully.",
      });

      setIsAddDialogOpen(false);
      setPlacementForm({
        company_name: '',
        job_title: '',
        job_description: '',
        job_type: 'full_time',
        location: '',
        salary_range: '',
        experience_required: '',
        skills_required: '',
        eligibility_criteria: {
          min_cgpa: '',
          allowed_branches: [],
          allowed_years: []
        },
        application_deadline: '',
        interview_date: ''
      });
      setLogoFile(null);
      setLogoPreview('');
      loadPlacements();
    } catch (error) {
      console.error('Error creating placement:', error);
      toast({
        title: "Error",
        description: "Failed to create placement post.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (placement: PlacementPost) => {
    setSelectedPlacement(placement);
    setEditForm({
      company_name: placement.company_name,
      job_title: placement.job_title,
      job_description: placement.job_description || '',
      job_type: placement.job_type,
      location: placement.location || '',
      salary_range: placement.salary_range || '',
      experience_required: placement.experience_required || '',
      skills_required: placement.skills_required?.join(', ') || '',
      eligibility_criteria: placement.eligibility_criteria || { min_cgpa: '', allowed_branches: [], allowed_years: [] },
      application_deadline: placement.application_deadline || '',
      interview_date: placement.interview_date || '',
      is_active: placement.is_active
    });
    setLogoPreview(placement.company_logo || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdatePlacement = async () => {
    if (!selectedPlacement) return;

    setIsSubmitting(true);
    try {
      let logoUrl = logoPreview;
      if (logoFile) {
        logoUrl = await uploadLogo() || logoUrl;
      }

      const skillsArray = editForm.skills_required
        .split(',')
        .map(s => s.trim())
        .filter(s => s);

      const updates = {
        ...editForm,
        company_logo: logoUrl,
        skills_required: skillsArray,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('placement_posts')
        .update(updates)
        .eq('id', selectedPlacement.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Placement post updated successfully.",
      });

      setIsEditDialogOpen(false);
      setSelectedPlacement(null);
      setLogoFile(null);
      setLogoPreview('');
      loadPlacements();
    } catch (error) {
      console.error('Error updating placement:', error);
      toast({
        title: "Error",
        description: "Failed to update placement post.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (placement: PlacementPost) => {
    setPlacementToDelete(placement);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!placementToDelete) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('placement_posts')
        .delete()
        .eq('id', placementToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Placement post deleted successfully.",
      });

      setPlacements(placements.filter(p => p.id !== placementToDelete.id));
      setIsDeleteDialogOpen(false);
      setPlacementToDelete(null);
    } catch (error) {
      console.error('Error deleting placement:', error);
      toast({
        title: "Error",
        description: "Failed to delete placement post.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewApplications = async (placement: PlacementPost) => {
    setSelectedPlacement(placement);
    setIsLoadingApplications(true);
    setIsApplicationsDialogOpen(true);

    try {
      const { data, error } = await supabase
        .from('placement_applications')
        .select(`
          *,
          student:user_profiles!placement_applications_student_id_fkey(first_name, last_name, email, phone_number),
          cv:student_cvs!placement_applications_cv_id_fkey(cv_url, cv_file_name)
        `)
        .eq('placement_post_id', placement.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications.",
        variant: "destructive",
      });
      setApplications([]);
    } finally {
      setIsLoadingApplications(false);
    }
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('placement_applications')
        .update({ 
          application_status: newStatus, 
          reviewed_by: userProfile.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', applicationId);

      if (error) throw error;

      setApplications(applications.map(app =>
        app.id === applicationId ? { ...app, application_status: newStatus } : app
      ));

      toast({
        title: "Success",
        description: "Application status updated.",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    }
  };

  const handleExportApplications = () => {
    if (!selectedPlacement || applications.length === 0) return;

    // Create CSV content
    const headers = ['Name', 'Email', 'Phone', 'Applied Date', 'Status', 'CV Link'];
    const rows = applications.map(app => [
      `${app.student.first_name} ${app.student.last_name}`,
      app.student.email,
      app.student.phone_number || 'N/A',
      new Date(app.applied_at).toLocaleDateString(),
      app.application_status,
      app.cv.cv_url
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPlacement.company_name}_${selectedPlacement.job_title}_applications.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Applications exported successfully.",
    });
  };

  const filteredPlacements = placements.filter(placement => {
    const matchesSearch =
      placement.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      placement.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      placement.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === 'all' ||
      placement.job_type === filterType ||
      (filterType === 'active' && placement.is_active) ||
      (filterType === 'inactive' && !placement.is_active);

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shortlisted': return 'bg-blue-100 text-blue-800';
      case 'selected': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading placement posts...</p>
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
                <Briefcase className="w-5 h-5 mr-2" />
                <span>Placement Management</span>
              </CardTitle>
              <CardDescription className='mt-2'>
                Manage campus placement drives, job postings, and student applications.
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-60">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Placement Drive
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Placement Drive</DialogTitle>
                  <DialogDescription>
                    Create a new placement opportunity for students.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="company_logo">Company Logo</Label>
                    <div className="mt-2">
                      {logoPreview ? (
                        <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                          <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview('');
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <Input
                            id="company_logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                          <Label htmlFor="company_logo" className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
                            Click to upload company logo
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={placementForm.company_name}
                      onChange={(e) => setPlacementForm({ ...placementForm, company_name: e.target.value })}
                      placeholder="e.g., Google Inc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="job_title">Job Title *</Label>
                    <Input
                      id="job_title"
                      value={placementForm.job_title}
                      onChange={(e) => setPlacementForm({ ...placementForm, job_title: e.target.value })}
                      placeholder="e.g., Software Engineer"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="job_description">Job Description</Label>
                    <Textarea
                      id="job_description"
                      value={placementForm.job_description}
                      onChange={(e) => setPlacementForm({ ...placementForm, job_description: e.target.value })}
                      placeholder="Detailed job description..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="job_type">Job Type</Label>
                    <Select value={placementForm.job_type} onValueChange={(value) => setPlacementForm({ ...placementForm, job_type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={placementForm.location}
                      onChange={(e) => setPlacementForm({ ...placementForm, location: e.target.value })}
                      placeholder="e.g., Bangalore, India"
                    />
                  </div>

                  <div>
                    <Label htmlFor="salary_range">Salary Range</Label>
                    <Input
                      id="salary_range"
                      value={placementForm.salary_range}
                      onChange={(e) => setPlacementForm({ ...placementForm, salary_range: e.target.value })}
                      placeholder="e.g., 10-15 LPA"
                    />
                  </div>

                  <div>
                    <Label htmlFor="experience_required">Experience Required</Label>
                    <Input
                      id="experience_required"
                      value={placementForm.experience_required}
                      onChange={(e) => setPlacementForm({ ...placementForm, experience_required: e.target.value })}
                      placeholder="e.g., 0-2 years"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="skills_required">Skills Required (comma-separated)</Label>
                    <Input
                      id="skills_required"
                      value={placementForm.skills_required}
                      onChange={(e) => setPlacementForm({ ...placementForm, skills_required: e.target.value })}
                      placeholder="e.g., React, Node.js, TypeScript"
                    />
                  </div>

                  <div>
                    <Label htmlFor="min_cgpa">Minimum CGPA</Label>
                    <Input
                      id="min_cgpa"
                      type="number"
                      step="0.1"
                      value={placementForm.eligibility_criteria.min_cgpa}
                      onChange={(e) => setPlacementForm({
                        ...placementForm,
                        eligibility_criteria: { ...placementForm.eligibility_criteria, min_cgpa: e.target.value }
                      })}
                      placeholder="e.g., 7.0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="application_deadline">Application Deadline</Label>
                    <Input
                      id="application_deadline"
                      type="datetime-local"
                      value={placementForm.application_deadline}
                      onChange={(e) => setPlacementForm({ ...placementForm, application_deadline: e.target.value })}
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="interview_date">Interview Date (Optional)</Label>
                    <Input
                      id="interview_date"
                      type="datetime-local"
                      value={placementForm.interview_date}
                      onChange={(e) => setPlacementForm({ ...placementForm, interview_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddPlacement} disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Placement Drive'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search companies, job titles, locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48 text-black">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posts</SelectItem>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Placements Table */}
          {filteredPlacements.length > 0 ? (
            <div className="rounded-md border max-h-[450px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Job Details</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Applications</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlacements.map((placement) => (
                    <TableRow key={placement.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {placement.company_logo && (
                            <img src={placement.company_logo} alt={placement.company_name} className="w-10 h-10 rounded object-contain" />
                          )}
                          <div className="font-medium">{placement.company_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{placement.job_title}</div>
                          <div className="text-sm text-gray-500">
                            <Badge variant="outline" className="mr-1">{placement.job_type.replace('_', ' ')}</Badge>
                            {placement.salary_range && <span className="text-xs">{placement.salary_range}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-3 h-3 mr-1" />
                          {placement.location || 'Remote'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{placement.application_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {placement.application_deadline && (
                          <div className="text-sm">
                            {new Date(placement.application_deadline).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={placement.is_active ? "default" : "secondary"}>
                          {placement.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(placement)}
                            title="Edit placement"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewApplications(placement)}
                            title="View applications"
                          >
                            <Users className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteClick(placement)}
                            title="Delete placement"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Placement Posts Found</h3>
              <p>Create your first placement drive to get started.</p>
              <Button
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Placement Drive
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - Similar structure to Add Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Placement Drive</DialogTitle>
            <DialogDescription>Update placement drive information.</DialogDescription>
          </DialogHeader>
          {/* Similar form fields as Add Dialog with editForm state */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePlacement} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Placement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Delete Placement Drive</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this placement drive? This will also delete all applications.
            </DialogDescription>
          </DialogHeader>
          {placementToDelete && (
            <Alert>
              <AlertDescription>
                <strong>{placementToDelete.company_name}</strong> - {placementToDelete.job_title}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Applications Dialog */}
      <Dialog open={isApplicationsDialogOpen} onOpenChange={setIsApplicationsDialogOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Applications</span>
              {applications.length > 0 && (
                <Button size="sm" onClick={handleExportApplications}>
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              )}
            </DialogTitle>
            {selectedPlacement && (
              <DialogDescription>
                <span className="font-medium">{selectedPlacement.company_name}</span> - {selectedPlacement.job_title}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4">
            {isLoadingApplications ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading applications...</p>
              </div>
            ) : applications.length > 0 ? (
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>CV</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.student.first_name} {application.student.last_name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{application.student.email}</div>
                            <div className="text-gray-500">{application.student.phone_number || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(application.applied_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(application.cv.cv_url, '_blank')}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View CV
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(application.application_status)}>
                            {application.application_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={application.application_status}
                            onValueChange={(value) => handleStatusChange(application.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="shortlisted">Shortlisted</SelectItem>
                              <SelectItem value="selected">Selected</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Applications Yet</h3>
                <p>No students have applied for this position yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlacementManagement;