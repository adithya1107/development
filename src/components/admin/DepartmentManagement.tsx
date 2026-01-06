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
import { Building2, Plus, Edit, Search, AlertCircle, Trash2, AlertTriangle, BookOpen, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Department {
  id: string;
  department_code: string;
  department_name: string;
  description: string;
  hod_id: string;
  department_color: string;
  is_active: boolean;
  created_at: string;
  hod?: {
    first_name: string;
    last_name: string;
  };
  course_count?: number;
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  department_id: string;
}

interface UserProfile {
  id: string;
  college_id: string;
  user_type: string;
}

const DepartmentManagement = ({ userProfile }: { userProfile: UserProfile }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCoursesDialogOpen, setIsCoursesDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facultyMembers, setFacultyMembers] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [departmentCourses, setDepartmentCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  const [deptForm, setDeptForm] = useState({
    department_code: '',
    department_name: '',
    description: '',
    hod_id: '',
    department_color: '#3b82f6'
  });

  const [editForm, setEditForm] = useState({
    department_code: '',
    department_name: '',
    description: '',
    hod_id: '',
    department_color: '#3b82f6',
    is_active: true
  });

  useEffect(() => {
    loadDepartments();
    loadFacultyMembers();
    loadAllCourses();
  }, [userProfile]);

  const loadDepartments = async () => {
    try {
      if (!userProfile?.college_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          hod:user_profiles(first_name, last_name)
        `)
        .eq('college_id', userProfile.college_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading departments:', error);
        toast({
          title: "Error",
          description: "Failed to load departments.",
          variant: "destructive",
        });
        setDepartments([]);
      } else {
        // Get course counts for each department
        const deptWithCounts = await Promise.all(
          (data || []).map(async (dept) => {
            const { count } = await supabase
              .from('courses')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id);
            return { ...dept, course_count: count || 0 };
          })
        );
        setDepartments(deptWithCounts);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments.",
        variant: "destructive",
      });
      setDepartments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFacultyMembers = async () => {
    try {
      if (!userProfile?.college_id) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('college_id', userProfile.college_id)
        .eq('user_type', 'faculty')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading faculty:', error);
      } else {
        setFacultyMembers(data || []);
      }
    } catch (error) {
      console.error('Error loading faculty:', error);
    }
  };

  const loadAllCourses = async () => {
    try {
      if (!userProfile?.college_id) return;

      const { data, error } = await supabase
        .from('courses')
        .select('id, course_code, course_name, department_id')
        .eq('college_id', userProfile.college_id);

      if (error) {
        console.error('Error loading courses:', error);
      } else {
        setCourses(data || []);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadDepartmentCourses = async (departmentId: string) => {
    setIsLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_code, course_name, department_id')
        .eq('department_id', departmentId);

      if (error) {
        console.error('Error loading department courses:', error);
        setDepartmentCourses([]);
      } else {
        setDepartmentCourses(data || []);
      }

      // Load available courses (not assigned to any department or assigned to this one)
      const { data: availData, error: availError } = await supabase
        .from('courses')
        .select('id, course_code, course_name, department_id')
        .eq('college_id', userProfile.college_id)
        .or(`department_id.is.null,department_id.eq.${departmentId}`);

      if (!availError) {
        setAvailableCourses(availData || []);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const assignHODRole = async (departmentId: string, facultyId: string) => {
    try {
      // Get the generic 'hod' tag
      const { data: hodTag, error: tagError } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'hod')
        .single();

      if (tagError || !hodTag) {
        console.error('HOD tag not found. Please run the setup SQL first.');
        return;
      }

      // Remove old HOD assignment for this department if exists
      const { error: removeError } = await supabase
        .from('user_tag_assignments')
        .update({ is_active: false })
        .eq('tag_id', hodTag.id)
        .eq('context_type', 'department')
        .eq('context_id', departmentId);

      // Assign new HOD with context
      const { error: assignError } = await supabase
        .from('user_tag_assignments')
        .insert({
          user_id: facultyId,
          tag_id: hodTag.id,
          context_type: 'department',
          context_id: departmentId,
          assigned_by: userProfile.id
        });

      if (assignError) throw assignError;

      console.log('✅ HOD role assigned with context');
    } catch (error) {
      console.error('Error assigning HOD role:', error);
      // Don't fail the whole operation if tag assignment fails
    }
  };

  const handleAddDepartment = async () => {
    if (!deptForm.department_code || !deptForm.department_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in department code and name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{
          ...deptForm,
          college_id: userProfile.college_id
        }])
        .select(`
          *,
          hod:user_profiles(first_name, last_name)
        `)
        .single();

      if (error) {
        console.error('Error creating department:', error);
        toast({
          title: "Error",
          description: "Failed to create department.",
          variant: "destructive",
        });
      } else {
        setDepartments([{ ...data, course_count: 0 }, ...departments]);
        
        // If HOD was assigned, also create the tag assignment
        if (data && deptForm.hod_id) {
          await assignHODRole(data.id, deptForm.hod_id);
        }
        
        setIsAddDialogOpen(false);
        setDeptForm({
          department_code: '',
          department_name: '',
          description: '',
          hod_id: '',
          department_color: '#3b82f6'
        });

        toast({
          title: "Success",
          description: "Department created successfully.",
        });
      }
    } catch (error) {
      console.error('Error creating department:', error);
      toast({
        title: "Error",
        description: "Failed to create department.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (dept: Department) => {
    setSelectedDepartment(dept);
    setEditForm({
      department_code: dept.department_code,
      department_name: dept.department_name,
      description: dept.description || '',
      hod_id: dept.hod_id || '',
      department_color: dept.department_color || '#3b82f6',
      is_active: dept.is_active
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateDepartment = async () => {
    if (!selectedDepartment || !editForm.department_code || !editForm.department_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in department code and name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .update(editForm)
        .eq('id', selectedDepartment.id)
        .select(`
          *,
          hod:user_profiles(first_name, last_name)
        `)
        .single();

      if (error) {
        console.error('Error updating department:', error);
        toast({
          title: "Error",
          description: "Failed to update department.",
          variant: "destructive",
        });
      } else {
        setDepartments(departments.map(d => 
          d.id === selectedDepartment.id ? { ...data, course_count: d.course_count } : d
        ));
        
        // Update HOD tag assignment if HOD changed
        if (data && editForm.hod_id && editForm.hod_id !== selectedDepartment.hod_id) {
          await assignHODRole(data.id, editForm.hod_id);
        }
        
        setIsEditDialogOpen(false);
        setSelectedDepartment(null);

        toast({
          title: "Success",
          description: "Department updated successfully.",
        });
      }
    } catch (error) {
      console.error('Error updating department:', error);
      toast({
        title: "Error",
        description: "Failed to update department.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (dept: Department) => {
    setDeptToDelete(dept);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deptToDelete) return;

    setIsSubmitting(true);
    try {
      // First, unassign all courses from this department
      const { error: courseError } = await supabase
        .from('courses')
        .update({ department_id: null })
        .eq('department_id', deptToDelete.id);

      if (courseError) throw courseError;

      // Remove all role assignments for this department
      const { error: roleError } = await supabase
        .from('user_tag_assignments')
        .update({ is_active: false })
        .eq('context_type', 'department')
        .eq('context_id', deptToDelete.id);

      if (roleError) {
        console.error('Error removing role assignments:', roleError);
        // Don't fail the operation
      }

      // Then delete the department
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', deptToDelete.id);

      if (error) throw error;

      setDepartments(departments.filter(d => d.id !== deptToDelete.id));
      setIsDeleteDialogOpen(false);
      setDeptToDelete(null);

      toast({
        title: "Success",
        description: "Department deleted successfully. All courses have been unassigned.",
      });

      // Reload courses
      loadAllCourses();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({
        title: "Error",
        description: "Failed to delete department.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManageCourses = (dept: Department) => {
    setSelectedDepartment(dept);
    loadDepartmentCourses(dept.id);
    setIsCoursesDialogOpen(true);
  };

  const handleAssignCourse = async (courseId: string) => {
    if (!selectedDepartment) return;

    try {
      const { error } = await supabase
        .from('courses')
        .update({ department_id: selectedDepartment.id })
        .eq('id', courseId);

      if (error) throw error;

      // Reload courses
      await loadDepartmentCourses(selectedDepartment.id);
      await loadAllCourses();
      
      // Update department course count
      setDepartments(departments.map(d => 
        d.id === selectedDepartment.id 
          ? { ...d, course_count: (d.course_count || 0) + 1 }
          : d
      ));

      toast({
        title: "Success",
        description: "Course assigned to department.",
      });
    } catch (error) {
      console.error('Error assigning course:', error);
      toast({
        title: "Error",
        description: "Failed to assign course.",
        variant: "destructive",
      });
    }
  };

  const handleUnassignCourse = async (courseId: string) => {
    if (!selectedDepartment) return;

    try {
      const { error } = await supabase
        .from('courses')
        .update({ department_id: null })
        .eq('id', courseId);

      if (error) throw error;

      // Reload courses
      await loadDepartmentCourses(selectedDepartment.id);
      await loadAllCourses();
      
      // Update department course count
      setDepartments(departments.map(d => 
        d.id === selectedDepartment.id 
          ? { ...d, course_count: Math.max((d.course_count || 0) - 1, 0) }
          : d
      ));

      toast({
        title: "Success",
        description: "Course unassigned from department.",
      });
    } catch (error) {
      console.error('Error unassigning course:', error);
      toast({
        title: "Error",
        description: "Failed to unassign course.",
        variant: "destructive",
      });
    }
  };

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch =
      dept.department_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.department_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dept.hod && `${dept.hod.first_name} ${dept.hod.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading departments...</p>
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
                <Building2 className="w-5 h-5 mr-2" />
                <span>Department Management</span>
              </CardTitle>
              <CardDescription className='mt-2'>
                Manage departments, assign courses, and organize your institution's academic structure.
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-60">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Department
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Department</DialogTitle>
                  <DialogDescription>
                    Create a new department for your institution.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div>
                    <Label htmlFor="dept_code">Department Code *</Label>
                    <Input
                      id="dept_code"
                      value={deptForm.department_code}
                      onChange={(e) => setDeptForm({ ...deptForm, department_code: e.target.value })}
                      placeholder="e.g., CS, ME, EE"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dept_color">Department Color</Label>
                    <Input
                      id="dept_color"
                      type="color"
                      value={deptForm.department_color}
                      onChange={(e) => setDeptForm({ ...deptForm, department_color: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="dept_name">Department Name *</Label>
                    <Input
                      id="dept_name"
                      value={deptForm.department_name}
                      onChange={(e) => setDeptForm({ ...deptForm, department_name: e.target.value })}
                      placeholder="Full department name"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="hod">Head of Department</Label>
                    <Select value={deptForm.hod_id} onValueChange={(value) => setDeptForm({...deptForm, hod_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select faculty member" />
                      </SelectTrigger>
                      <SelectContent>
                        {facultyMembers.map((faculty) => (
                          <SelectItem key={faculty.id} value={faculty.id}>
                            {faculty.first_name} {faculty.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                      placeholder="Department description and objectives"
                    />
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddDepartment} disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Department'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search departments, HODs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Departments Table */}
          {filteredDepartments.length > 0 ? (
            <div className="rounded-md border max-h-[350px] sm:max-h-[450px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>HOD</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: dept.department_color }}
                          />
                          <div>
                            <div className="font-medium">{dept.department_code}</div>
                            <div className="text-sm text-gray-500">{dept.department_name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dept.hod ?
                          `${dept.hod.first_name} ${dept.hod.last_name}`
                          : 'Not Assigned'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          <span>{dept.course_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={dept.is_active ? "default" : "secondary"}>
                          {dept.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditClick(dept)}
                            title="Edit department"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleManageCourses(dept)}
                            title="Manage courses"
                          >
                            <BookOpen className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteClick(dept)}
                            title="Delete department"
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
              <h3 className="text-lg font-medium mb-2">No Departments Found</h3>
              <p>No departments found. Create your first department to get started.</p>
              <Button
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Department
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="edit_dept_code">Department Code *</Label>
              <Input
                id="edit_dept_code"
                value={editForm.department_code}
                onChange={(e) => setEditForm({ ...editForm, department_code: e.target.value })}
                placeholder="e.g., CS, ME, EE"
              />
            </div>
            <div>
              <Label htmlFor="edit_dept_color">Department Color</Label>
              <Input
                id="edit_dept_color"
                type="color"
                value={editForm.department_color}
                onChange={(e) => setEditForm({ ...editForm, department_color: e.target.value })}
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="edit_dept_name">Department Name *</Label>
              <Input
                id="edit_dept_name"
                value={editForm.department_name}
                onChange={(e) => setEditForm({ ...editForm, department_name: e.target.value })}
                placeholder="Full department name"
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="edit_hod">Head of Department</Label>
              <Select value={editForm.hod_id} onValueChange={(value) => setEditForm({...editForm, hod_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select faculty member" />
                </SelectTrigger>
                <SelectContent>
                  {facultyMembers.map((faculty) => (
                    <SelectItem key={faculty.id} value={faculty.id}>
                      {faculty.first_name} {faculty.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Department description and objectives"
              />
            </div>
            <div>
              <Label htmlFor="edit_status">Department Status</Label>
              <Select 
                value={editForm.is_active ? "active" : "inactive"} 
                onValueChange={(value) => setEditForm({...editForm, is_active: value === "active"})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateDepartment} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Department'}
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
              <span>Delete Department</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this department? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deptToDelete && (
            <div className="py-4">
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Department:</strong> {deptToDelete.department_code} - {deptToDelete.department_name}
                </AlertDescription>
              </Alert>
              
              <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Deleting this department will unassign all {deptToDelete.course_count || 0} course(s) from it. The courses will remain in the system but won't be associated with any department.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Courses Dialog */}
      <Dialog open={isCoursesDialogOpen} onOpenChange={setIsCoursesDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Department Courses</DialogTitle>
            {selectedDepartment && (
              <DialogDescription>
                <span className="font-medium">{selectedDepartment.department_code}</span> - {selectedDepartment.department_name}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {isLoadingCourses ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading courses...</p>
              </div>
            ) : (
              <>
                {/* Assigned Courses */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Assigned Courses ({departmentCourses.length})</h3>
                  {departmentCourses.length > 0 ? (
                    <div className="rounded-md border max-h-[250px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course Code</TableHead>
                            <TableHead>Course Name</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {departmentCourses.map((course) => (
                            <TableRow key={course.id}>
                              <TableCell className="font-medium">{course.course_code}</TableCell>
                              <TableCell>{course.course_name}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUnassignCourse(course.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Unassign course"
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border rounded-lg bg-gray-50">
                      <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-500">No courses assigned to this department yet.</p>
                    </div>
                  )}
                </div>

                {/* Available Courses to Assign */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Available Courses</h3>
                  {availableCourses.filter(c => !c.department_id).length > 0 ? (
                    <div className="rounded-md border max-h-[250px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course Code</TableHead>
                            <TableHead>Course Name</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableCourses
                            .filter(c => !c.department_id)
                            .map((course) => (
                              <TableRow key={course.id}>
                                <TableCell className="font-medium">{course.course_code}</TableCell>
                                <TableCell>{course.course_name}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAssignCourse(course.id)}
                                    title="Assign course to department"
                                  >
                                    Assign
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border rounded-lg bg-gray-50">
                      <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-500">No unassigned courses available.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsCoursesDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentManagement;