import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Plus, Edit, Users, Calendar, Search, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  description: string;
  credits: number;
  semester: string;
  academic_year: string;
  instructor_id: string;
  max_students: number;
  is_active: boolean;
  created_at: string;
  instructor?: {
    first_name: string;
    last_name: string;
  };
  enrollment_count?: number;
}

interface UserProfile {
  id: string;
  college_id: string;
  user_type: string;
}

const CourseManagement = ({ userProfile }: { userProfile: UserProfile }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSemester, setFilterSemester] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instructors, setInstructors] = useState<any[]>([]);

  const [courseForm, setCourseForm] = useState({
    course_code: '',
    course_name: '',
    description: '',
    credits: 3,
    semester: '',
    academic_year: '2024-25',
    instructor_id: '',
    max_students: 50
  });

  useEffect(() => {
    loadCourses();
    loadInstructors();
  }, [userProfile]);

  const loadCourses = async () => {
    try {
      if (!userProfile?.college_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:user_profiles(first_name, last_name)
        `)
        .eq('college_id', userProfile.college_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading courses:', error);
        toast({
          title: "Error",
          description: "Failed to load courses.",
          variant: "destructive",
        });
        setCourses([]);
      } else {
        setCourses(data || []);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses.",
        variant: "destructive",
      });
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInstructors = async () => {
    try {
      if (!userProfile?.college_id) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('college_id', userProfile.college_id)
        .eq('user_type', 'faculty') // Changed from ['teacher', 'admin'] to 'faculty'
        .eq('is_active', true);

      if (error) {
        console.error('Error loading instructors:', error);
        toast({
          title: "Error",
          description: "Failed to load faculty members.",
          variant: "destructive",
        });
      } else {
        setInstructors(data || []);
      }
    } catch (error) {
      console.error('Error loading instructors:', error);
      toast({
        title: "Error",
        description: "Failed to load faculty members.",
        variant: "destructive",
      });
    }
  };

  const handleAddCourse = async () => {
    if (!courseForm.course_code || !courseForm.course_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in course code and name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([{
          ...courseForm,
          college_id: userProfile.college_id
        }])
        .select(`
          *,
          instructor:user_profiles(first_name, last_name)
        `)
        .single();

      if (error) {
        console.error('Error creating course:', error);
        toast({
          title: "Error",
          description: "Failed to create course.",
          variant: "destructive",
        });
      } else {
        setCourses([data, ...courses]);
        setIsAddDialogOpen(false);
        setCourseForm({
          course_code: '',
          course_name: '',
          description: '',
          credits: 3,
          semester: '',
          academic_year: '2024-25',
          instructor_id: '',
          max_students: 50
        });

        toast({
          title: "Success",
          description: "Course created successfully.",
        });
      }
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: "Failed to create course.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch =
      course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.instructor && `${course.instructor.first_name} ${course.instructor.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSemester = filterSemester === 'all' || course.semester === filterSemester;

    return matchesSearch && matchesSemester;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading courses...</p>
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
                <BookOpen className="w-5 h-5 mr-2" />
                <span>Course & Academic Management</span>
              </CardTitle>
              <CardDescription className='mt-2'>
                Manage courses, enrollment, and academic schedules for your institution.
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-60">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Course</DialogTitle>
                  <DialogDescription>
                    Create a new course for the academic program.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div>
                    <Label htmlFor="course_code">Course Code *</Label>
                    <Input
                      id="course_code"
                      value={courseForm.course_code}
                      onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })}
                      placeholder="e.g., CS101"
                    />
                  </div>
                  <div>
                    <Label htmlFor="credits">Credits</Label>
                    <Input
                      id="credits"
                      type="number"
                      value={courseForm.credits}
                      onChange={(e) => setCourseForm({ ...courseForm, credits: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="course_name">Course Name *</Label>
                    <Input
                      id="course_name"
                      value={courseForm.course_name}
                      onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })}
                      placeholder="Full course name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="semester">Semester</Label>
                    <Select value={courseForm.semester} onValueChange={(value) => setCourseForm({ ...courseForm, semester: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fall">Fall</SelectItem>
                        <SelectItem value="Spring">Spring</SelectItem>
                        <SelectItem value="Summer">Summer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="instructor">Faculty Instructor</Label>
                    <Select value={courseForm.instructor_id} onValueChange={(value) => setCourseForm({ ...courseForm, instructor_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select faculty member" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructors.map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id}>
                            {instructor.first_name} {instructor.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                      placeholder="Course description and objectives"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_students">Max Students</Label>
                    <Input
                      id="max_students"
                      type="number"
                      value={courseForm.max_students}
                      onChange={(e) => setCourseForm({ ...courseForm, max_students: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleAddCourse} disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? 'Creating...' : 'Create Course'}
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
                placeholder="Search courses, instructors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                <SelectItem value="Fall">Fall</SelectItem>
                <SelectItem value="Spring">Spring</SelectItem>
                <SelectItem value="Summer">Summer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Courses Table */}
          {filteredCourses.length > 0 ? (
            <div className="rounded-md border  max-h-[350px] sm:max-h-[450px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Max Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{course.course_code}</div>
                          <div className="text-sm text-gray-500">{course.course_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.instructor ?
                          `${course.instructor.first_name} ${course.instructor.last_name}`
                          : 'Not Assigned'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {course.semester} {course.academic_year}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.credits}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{course.max_students}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={course.is_active ? "default" : "secondary"}>
                          {course.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Users className="w-3 h-3" />
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
              <h3 className="text-lg font-medium mb-2">No Courses Found</h3>
              <p>No courses found matching your criteria. Create your first course to get started.</p>
              <Button
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Course
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseManagement;