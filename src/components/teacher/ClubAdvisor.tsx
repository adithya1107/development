/**
 * ClubAdvisor Component
 * 
 * This component manages clubs using a tag-based role system:
 * 
 * Tag Assignments with Context:
 * - club_advisor: Assigned to teachers with context_type='club' and context_id=[club_id]
 * - club_member: Assigned to students with context_type='club' and context_id=[club_id]
 * - club_president: Assigned to ONE student per club with context_type='club' and context_id=[club_id]
 * 
 * All role assignments use generic tags with context to scope them to specific clubs.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus,
  UserPlus,
  UserMinus,
  Shield,
  Calendar,
  Trash2,
  Edit,
  Search,
  X,
  Crown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import PermissionWrapper from '@/components/PermissionWrapper';

interface ClubAdvisorProps {
  teacherData: any;
  userTags?: any[];
}

const ClubAdvisor = ({ teacherData, userTags }: ClubAdvisorProps) => {
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClubDialogOpen, setNewClubDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [editClubDialogOpen, setEditClubDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<any>(null);
  const [clubPresidents, setClubPresidents] = useState<{[key: string]: any}>({});

  const [newClub, setNewClub] = useState({
    club_name: '',
    description: '',
    club_category: 'academic',
    club_logo: '',
    club_president_id: ''
  });

  const [editForm, setEditForm] = useState({
    club_name: '',
    description: '',
    club_category: 'academic',
    club_logo: '',
    club_president_id: ''
  });

  useEffect(() => {
    if (teacherData?.user_id) {
      fetchAdvisorClubs();
      fetchAllStudents();
    }
  }, [teacherData]);

  useEffect(() => {
    if (selectedClub) {
      fetchClubMembers();
    }
  }, [selectedClub]);

  const fetchAllStudents = async () => {
    try {
      const { data: students, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, user_code')
        .eq('college_id', teacherData.college_id)
        .eq('user_type', 'student')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setAllStudents(students || []);
    } catch (error) {
      console.error('Error fetching all students:', error);
    }
  };

  const fetchClubPresidents = async (clubIds: string[]) => {
    try {
      const { data: presidentTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'club_president')
        .single();

      if (!presidentTag) return;

      const { data: assignments, error } = await supabase
        .from('user_tag_assignments')
        .select(`
          context_id,
          user_profiles!user_tag_assignments_user_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .eq('tag_id', presidentTag.id)
        .eq('context_type', 'club')
        .in('context_id', clubIds)
        .eq('is_active', true);

      if (error) throw error;

      const presidentsMap: {[key: string]: any} = {};
      assignments?.forEach(assignment => {
        presidentsMap[assignment.context_id] = assignment.user_profiles;
      });
      
      setClubPresidents(presidentsMap);
    } catch (error) {
      console.error('Error fetching club presidents:', error);
    }
  };

  const fetchAdvisorClubs = async () => {
    try {
      setLoading(true);
      console.log('Fetching clubs for advisor:', teacherData.user_id);
      
      // Get all clubs where this teacher has club_advisor tag
      const { data: advisorAssignments, error: assignError } = await supabase
        .from('user_tag_assignments')
        .select(`
          context_id,
          user_tags!inner (
            tag_name
          )
        `)
        .eq('user_id', teacherData.user_id)
        .eq('context_type', 'club')
        .eq('user_tags.tag_name', 'club_advisor')
        .eq('is_active', true);

      if (assignError) throw assignError;

      console.log('Advisor assignments:', advisorAssignments);

      if (!advisorAssignments || advisorAssignments.length === 0) {
        setClubs([]);
        setLoading(false);
        return;
      }

      // Get club IDs
      const clubIds = advisorAssignments.map(a => a.context_id);

      // Fetch full club details
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('*')
        .in('id', clubIds)
        .eq('is_active', true)
        .order('club_name', { ascending: true });

      if (clubsError) throw clubsError;

      console.log('Fetched clubs:', clubsData);
      setClubs(clubsData || []);
      
      // Fetch presidents for all clubs
      if (clubsData && clubsData.length > 0) {
        await fetchClubPresidents(clubsData.map(c => c.id));
        
        if (!selectedClub) {
          setSelectedClub(clubsData[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching advisor clubs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch clubs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClubMembers = async () => {
    if (!selectedClub) return;

    try {
      console.log('Fetching members for club:', selectedClub.id);
      
      // Get the generic club_member tag ID
      const { data: memberTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'club_member')
        .single();

      if (!memberTag) {
        console.error('club_member tag not found!');
        return;
      }

      // Fetch all users with club_member tag for this club
      const { data, error } = await supabase
        .from('user_tag_assignments')
        .select(`
          id,
          user_id,
          assigned_at,
          user_profiles!user_tag_assignments_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            user_code,
            user_type
          )
        `)
        .eq('tag_id', memberTag.id)
        .eq('context_type', 'club')
        .eq('context_id', selectedClub.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      console.log('Fetched club members:', data);
      setClubMembers(data || []);
    } catch (error) {
      console.error('Error fetching club members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch club members',
        variant: 'destructive'
      });
    }
  };

  const fetchAvailableStudents = async () => {
    if (!selectedClub) return;

    try {
      // Get all students in the college
      const { data: allStudents, error: studentsError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, user_code')
        .eq('college_id', teacherData.college_id)
        .eq('user_type', 'student')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (studentsError) throw studentsError;

      // Get current members
      const currentMemberIds = clubMembers.map(m => m.user_profiles.id);

      // Filter out current members
      const available = allStudents?.filter(s => !currentMemberIds.includes(s.id)) || [];
      
      setAvailableStudents(available);
    } catch (error) {
      console.error('Error fetching available students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch available students',
        variant: 'destructive'
      });
    }
  };

  const assignPresidentRole = async (studentId: string, clubId: string) => {
    try {
      // Get the generic club_president tag
      const { data: presidentTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'club_president')
        .single();

      if (!presidentTag) {
        console.error('club_president tag not found. Please run the setup SQL first.');
        return false;
      }

      // Remove old president assignment for this club if exists
      await supabase
        .from('user_tag_assignments')
        .update({ is_active: false })
        .eq('tag_id', presidentTag.id)
        .eq('context_type', 'club')
        .eq('context_id', clubId);

      // Assign new president with context
      const { error } = await supabase
        .from('user_tag_assignments')
        .insert({
          user_id: studentId,
          tag_id: presidentTag.id,
          context_type: 'club',
          context_id: clubId,
          assigned_by: teacherData.user_id
        });

      if (error) throw error;

      console.log('✅ Club president role assigned with context');
      return true;
    } catch (error) {
      console.error('Error assigning president:', error);
      return false;
    }
  };

  const createClub = async () => {
    try {
      if (!newClub.club_name || !newClub.club_category) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      // 1. Get or verify generic tags exist
      const { data: advisorTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'club_advisor')
        .single();

      const { data: memberTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'club_member')
        .single();

      const { data: presidentTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'club_president')
        .single();

      if (!advisorTag || !memberTag || !presidentTag) {
        toast({
          title: 'Error',
          description: 'Generic club tags not found. Please run setup SQL first.',
          variant: 'destructive'
        });
        return;
      }

      // 2. Create club
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .insert({
          college_id: teacherData.college_id,
          club_name: newClub.club_name,
          description: newClub.description,
          club_category: newClub.club_category,
          club_logo: newClub.club_logo || null,
          created_by: teacherData.user_id
        })
        .select()
        .single();

      if (clubError) throw clubError;

      // 3. Assign advisor tag to teacher with context
      const { data: existingAssignment } = await supabase
        .from('user_tag_assignments')
        .select('id, is_active')
        .eq('user_id', teacherData.user_id)
        .eq('tag_id', advisorTag.id)
        .eq('context_type', 'club')
        .eq('context_id', clubData.id)
        .maybeSingle();

      if (existingAssignment) {
        if (!existingAssignment.is_active) {
          const { error: updateError } = await supabase
            .from('user_tag_assignments')
            .update({ is_active: true })
            .eq('id', existingAssignment.id);
          
          if (updateError) throw updateError;
        }
      } else {
        const { error: assignError } = await supabase
          .from('user_tag_assignments')
          .insert({
            user_id: teacherData.user_id,
            tag_id: advisorTag.id,
            context_type: 'club',
            context_id: clubData.id,
            assigned_by: teacherData.user_id
          });

        if (assignError) throw assignError;
      }

      // 4. Assign president role if selected
      if (clubData && newClub.club_president_id) {
        // First add the student as a member
        const { error: memberError } = await supabase
          .from('user_tag_assignments')
          .insert({
            user_id: newClub.club_president_id,
            tag_id: memberTag.id,
            context_type: 'club',
            context_id: clubData.id,
            assigned_by: teacherData.user_id
          });

        if (memberError) {
          console.error('Error adding president as member:', memberError);
        }

        // Then assign president role
        await assignPresidentRole(newClub.club_president_id, clubData.id);
      }

      toast({
        title: 'Success',
        description: `${newClub.club_name} created successfully${newClub.club_president_id ? ' with president assigned' : ''}`
      });

      setNewClubDialogOpen(false);
      setNewClub({
        club_name: '',
        description: '',
        club_category: 'academic',
        club_logo: '',
        club_president_id: ''
      });

      await fetchAdvisorClubs();
    } catch (error) {
      console.error('Error creating club:', error);
      toast({
        title: 'Error',
        description: 'Failed to create club',
        variant: 'destructive'
      });
    }
  };

  const addMember = async (studentId: string) => {
    if (!selectedClub) return;

    try {
      // Get the generic club_member tag
      const { data: memberTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'club_member')
        .single();

      if (!memberTag) {
        toast({
          title: 'Error',
          description: 'club_member tag not found',
          variant: 'destructive'
        });
        return;
      }

      // Assign member tag with club context
      const { error } = await supabase
        .from('user_tag_assignments')
        .insert({
          user_id: studentId,
          tag_id: memberTag.id,
          context_type: 'club',
          context_id: selectedClub.id,
          assigned_by: teacherData.user_id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Member added successfully'
      });

      await fetchClubMembers();
      await fetchAvailableStudents();
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive'
      });
    }
  };

  const makePresident = async (studentId: string) => {
    if (!selectedClub) return;

    // Confirm if there's already a president
    const currentPresident = clubPresidents[selectedClub.id];
    if (currentPresident && currentPresident.id !== studentId) {
      if (!confirm(`This will remove ${currentPresident.first_name} ${currentPresident.last_name} as president and assign the role to the new member. Continue?`)) {
        return;
      }
    }

    const success = await assignPresidentRole(studentId, selectedClub.id);
    if (success) {
      await fetchAdvisorClubs();
      await fetchClubMembers();
      toast({
        title: 'Success',
        description: 'President role assigned successfully'
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to assign president role',
        variant: 'destructive'
      });
    }
  };

  const removeMember = async (assignmentId: string, memberName: string, userId?: string) => {
    if (!selectedClub) return;

    // Check if this member is the president
    const isPresident = clubPresidents[selectedClub.id]?.id === userId;
    
    if (isPresident) {
      toast({
        title: 'Cannot Remove President',
        description: 'Please assign a new president before removing this member.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_tag_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${memberName} removed from club`
      });

      await fetchClubMembers();
      await fetchAvailableStudents();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive'
      });
    }
  };

  const startEditClub = (club: any) => {
    const presidentId = clubPresidents[club.id]?.id || '';
    
    setEditingClub({
      id: club.id,
      club_name: club.club_name,
      description: club.description || '',
      club_category: club.club_category,
      club_logo: club.club_logo || ''
    });
    
    setEditForm({
      club_name: club.club_name,
      description: club.description || '',
      club_category: club.club_category,
      club_logo: club.club_logo || '',
      club_president_id: presidentId
    });
    
    setEditClubDialogOpen(true);
  };

  const updateClub = async () => {
    try {
      if (!editingClub || !editForm.club_name || !editForm.club_category) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('clubs')
        .update({
          club_name: editForm.club_name,
          description: editForm.description || null,
          club_category: editForm.club_category,
          club_logo: editForm.club_logo || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingClub.id);

      if (error) throw error;

      // Update president if changed
      const currentPresidentId = clubPresidents[editingClub.id]?.id || '';
      if (editForm.club_president_id !== currentPresidentId) {
        if (editForm.club_president_id) {
          // Check if new president is already a member
          const isMember = clubMembers.some(m => m.user_profiles.id === editForm.club_president_id);
          
          if (!isMember) {
            // Add as member first
            const { data: memberTag } = await supabase
              .from('user_tags')
              .select('id')
              .eq('tag_name', 'club_member')
              .single();

            if (memberTag) {
              await supabase
                .from('user_tag_assignments')
                .insert({
                  user_id: editForm.club_president_id,
                  tag_id: memberTag.id,
                  context_type: 'club',
                  context_id: editingClub.id,
                  assigned_by: teacherData.user_id
                });
            }
          }
          
          // Assign president role
          await assignPresidentRole(editForm.club_president_id, editingClub.id);
        } else if (currentPresidentId) {
          // Remove president role
          const { data: presidentTag } = await supabase
            .from('user_tags')
            .select('id')
            .eq('tag_name', 'club_president')
            .single();

          if (presidentTag) {
            await supabase
              .from('user_tag_assignments')
              .update({ is_active: false })
              .eq('tag_id', presidentTag.id)
              .eq('context_type', 'club')
              .eq('context_id', editingClub.id);
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Club updated successfully'
      });

      setEditClubDialogOpen(false);
      setEditingClub(null);
      await fetchAdvisorClubs();
      if (selectedClub?.id === editingClub.id) {
        await fetchClubMembers();
      }
    } catch (error) {
      console.error('Error updating club:', error);
      toast({
        title: 'Error',
        description: 'Failed to update club',
        variant: 'destructive'
      });
    }
  };

  const deleteClub = async (clubId: string, clubName: string) => {
    if (!confirm(`Are you sure you want to delete ${clubName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Remove all role assignments for this club
      await supabase
        .from('user_tag_assignments')
        .update({ is_active: false })
        .eq('context_type', 'club')
        .eq('context_id', clubId);

      const { error } = await supabase
        .from('clubs')
        .update({ is_active: false })
        .eq('id', clubId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${clubName} deleted successfully`
      });

      if (selectedClub?.id === clubId) {
        setSelectedClub(null);
      }

      await fetchAdvisorClubs();
    } catch (error) {
      console.error('Error deleting club:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete club',
        variant: 'destructive'
      });
    }
  };

  const filteredStudents = availableStudents.filter(student =>
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.user_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PermissionWrapper permission="manage_clubs">
      <div className="space-y-6">
        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manage">Manage Clubs</TabsTrigger>
            <TabsTrigger value="members">Manage Members</TabsTrigger>
          </TabsList>

          {/* Manage Clubs Tab */}
          <TabsContent value="manage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-base sm:text-lg">My Clubs</span>
                  </div>
                  <Dialog open={newClubDialogOpen} onOpenChange={setNewClubDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Club
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
                      <DialogHeader>
                        <DialogTitle>Create New Club</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Club Name *</label>
                          <Input
                            placeholder="Enter club name"
                            value={newClub.club_name}
                            onChange={(e) => setNewClub({...newClub, club_name: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <Textarea
                            placeholder="Enter club description"
                            value={newClub.description}
                            onChange={(e) => setNewClub({...newClub, description: e.target.value})}
                            rows={3}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">Category *</label>
                          <Select
                            value={newClub.club_category}
                            onValueChange={(value) => setNewClub({...newClub, club_category: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="academic">Academic</SelectItem>
                              <SelectItem value="sports">Sports</SelectItem>
                              <SelectItem value="cultural">Cultural</SelectItem>
                              <SelectItem value="technical">Technical</SelectItem>
                              <SelectItem value="social">Social</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Club President (Optional)</label>
                          <Select
                            value={newClub.club_president_id || "none"}
                            onValueChange={(value) => setNewClub({...newClub, club_president_id: value === "none" ? "" : value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a student" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No President</SelectItem>
                              {allStudents.map((student) => (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.first_name} {student.last_name} ({student.user_code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Club Logo URL</label>
                          <Input
                            placeholder="Enter logo URL (optional)"
                            value={newClub.club_logo}
                            onChange={(e) => setNewClub({...newClub, club_logo: e.target.value})}
                          />
                        </div>
                        
                        <Button 
                          onClick={createClub} 
                          className="w-full"
                          disabled={!newClub.club_name || !newClub.club_category}
                        >
                          Create Club
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clubs.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm sm:text-base px-4">
                      No clubs found. Create your first club to get started!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clubs.map((club) => (
                      <Card key={club.id} className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex-1 w-full min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-semibold text-sm sm:text-base truncate">{club.club_name}</h3>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {club.club_category.charAt(0).toUpperCase() + club.club_category.slice(1)}
                              </Badge>
                              {selectedClub?.id === club.id && (
                                <Badge className="text-xs flex-shrink-0">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Selected
                                </Badge>
                              )}
                            </div>
                            
                            {club.description && (
                              <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                                {club.description}
                              </p>
                            )}
                            
                            {clubPresidents[club.id] && (
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                                <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                                <span>
                                  President: {clubPresidents[club.id].first_name} {clubPresidents[club.id].last_name}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                              Created {new Date(club.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setSelectedClub(club)}
                              className="flex-1 sm:flex-initial text-xs sm:text-sm"
                            >
                              Manage
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => startEditClub(club)}
                              className="flex-1 sm:flex-initial text-xs sm:text-sm"
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => deleteClub(club.id, club.club_name)}
                              className="flex-1 sm:flex-initial text-xs sm:text-sm"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Members Tab */}
          <TabsContent value="members" className="space-y-4">
            {!selectedClub ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm sm:text-base px-4">
                    Select a club from the "Manage Clubs" tab to manage its members
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-base sm:text-lg">{selectedClub.club_name} Members</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {clubMembers.length} member{clubMembers.length !== 1 ? 's' : ''}
                        {clubPresidents[selectedClub.id] && (
                          <span className="ml-2">
                            • President: {clubPresidents[selectedClub.id].first_name} {clubPresidents[selectedClub.id].last_name}
                          </span>
                        )}
                      </p>
                    </div>
                    <Dialog open={addMemberDialogOpen} onOpenChange={(open) => {
                      setAddMemberDialogOpen(open);
                      if (open) {
                        fetchAvailableStudents();
                        setSearchTerm('');
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Add Club Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search students..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          
                          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                            {filteredStudents.length === 0 ? (
                              <div className="text-center py-8">
                                <p className="text-muted-foreground text-sm">
                                  {searchTerm ? 'No students found' : 'All students are already members'}
                                </p>
                              </div>
                            ) : (
                              filteredStudents.map((student) => (
                                <Card key={student.id} className="p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {student.first_name} {student.last_name}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {student.user_code} • {student.email}
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        addMember(student.id);
                                        setAddMemberDialogOpen(false);
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </Card>
                              ))
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clubMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm sm:text-base px-4">
                        No members yet. Add students to get started!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clubMembers.map((member) => {
                        const isPresident = clubPresidents[selectedClub.id]?.id === member.user_profiles.id;
                        
                        return (
                          <Card key={member.id} className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">
                                    {member.user_profiles.first_name} {member.user_profiles.last_name}
                                  </p>
                                  {isPresident && (
                                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                                      <Crown className="h-3 w-3 mr-1 text-yellow-500" />
                                      President
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.user_profiles.user_code} • {member.user_profiles.email}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Joined {new Date(member.assigned_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!isPresident && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => makePresident(member.user_profiles.id)}
                                    title="Make president"
                                  >
                                    <Crown className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeMember(member.id, `${member.user_profiles.first_name} ${member.user_profiles.last_name}`, member.user_profiles.id)}
                                  disabled={isPresident}
                                  title={isPresident ? "Cannot remove president (change president first)" : "Remove member"}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Club Dialog */}
        <Dialog open={editClubDialogOpen} onOpenChange={setEditClubDialogOpen}>
          <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle>Edit Club</DialogTitle>
            </DialogHeader>
            {editingClub && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Club Name *</label>
                  <Input
                    placeholder="Enter club name"
                    value={editForm.club_name}
                    onChange={(e) => setEditForm({...editForm, club_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Enter club description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <Select
                    value={editForm.club_category}
                    onValueChange={(value) => setEditForm({...editForm, club_category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Club President</label>
                  <Select
                    value={editForm.club_president_id || "none"}
                    onValueChange={(value) => setEditForm({...editForm, club_president_id: value === "none" ? "" : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No President</SelectItem>
                      {allStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} ({student.user_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Club Logo URL</label>
                  <Input
                    placeholder="Enter logo URL (optional)"
                    value={editForm.club_logo}
                    onChange={(e) => setEditForm({...editForm, club_logo: e.target.value})}
                  />
                </div>
                
                <Button 
                  onClick={updateClub} 
                  className="w-full"
                  disabled={!editForm.club_name || !editForm.club_category}
                >
                  Update Club
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
};

export default ClubAdvisor;