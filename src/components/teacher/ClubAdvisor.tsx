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
  const [searchTerm, setSearchTerm] = useState('');
  const [newClubDialogOpen, setNewClubDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [editClubDialogOpen, setEditClubDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<any>(null);

  const [newClub, setNewClub] = useState({
    club_name: '',
    description: '',
    club_category: 'academic',
    club_logo: ''
  });

  useEffect(() => {
    if (teacherData?.user_id) {
      fetchAdvisorClubs();
    }
  }, [teacherData]);

  useEffect(() => {
    if (selectedClub) {
      fetchClubMembers();
    }
  }, [selectedClub]);

  const fetchAdvisorClubs = async () => {
    try {
      setLoading(true);
      console.log('Fetching clubs for advisor:', teacherData.user_id);
      
      // First, get all clubs where this teacher is assigned as advisor (president tag)
      const { data: tagAssignments, error: tagError } = await supabase
        .from('user_tag_assignments')
        .select(`
          tag_id,
          user_tags!inner (
            id,
            tag_name,
            tag_category
          )
        `)
        .eq('user_id', teacherData.user_id)
        .eq('is_active', true)
        .eq('user_tags.tag_category', 'club');

      if (tagError) {
        console.error('Error fetching tag assignments:', tagError);
        throw tagError;
      }

      console.log('Tag assignments:', tagAssignments);

      // Get club IDs from president tags
      const presidentTagIds = tagAssignments?.map(ta => ta.tag_id) || [];

      if (presidentTagIds.length === 0) {
        setClubs([]);
        setLoading(false);
        return;
      }

      // Fetch clubs where the teacher is the president (advisor)
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('*')
        .in('president_tag_id', presidentTagIds)
        .eq('is_active', true)
        .order('club_name', { ascending: true });

      if (clubsError) {
        console.error('Error fetching clubs:', clubsError);
        throw clubsError;
      }

      console.log('Fetched clubs:', clubsData);
      setClubs(clubsData || []);
      
      if (clubsData && clubsData.length > 0 && !selectedClub) {
        setSelectedClub(clubsData[0]);
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
      
      // Fetch all users with the club's member tag
      const { data, error } = await supabase
        .from('user_tag_assignments')
        .select(`
          id,
          user_id,
          assigned_at,
          user_profiles!inner (
            id,
            first_name,
            last_name,
            email,
            user_code,
            user_type
          )
        `)
        .eq('tag_id', selectedClub.member_tag_id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching club members:', error);
        throw error;
      }

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

      // Create president tag
      const presidentTagName = `${newClub.club_name.toLowerCase().replace(/\s+/g, '_')}_president`;
      const { data: presidentTag, error: presidentTagError } = await supabase
        .from('user_tags')
        .insert({
          tag_name: presidentTagName,
          tag_category: 'club',
          display_name: `${newClub.club_name} - President`,
          description: `President/Advisor of ${newClub.club_name}`,
          base_user_type: 'faculty',
          created_by: teacherData.user_id
        })
        .select()
        .single();

      if (presidentTagError) throw presidentTagError;

      // Create member tag
      const memberTagName = `${newClub.club_name.toLowerCase().replace(/\s+/g, '_')}_member`;
      const { data: memberTag, error: memberTagError } = await supabase
        .from('user_tags')
        .insert({
          tag_name: memberTagName,
          tag_category: 'club',
          display_name: `${newClub.club_name} - Member`,
          description: `Member of ${newClub.club_name}`,
          base_user_type: 'student',
          created_by: teacherData.user_id
        })
        .select()
        .single();

      if (memberTagError) throw memberTagError;

      // Create club
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .insert({
          college_id: teacherData.college_id,
          club_name: newClub.club_name,
          description: newClub.description,
          club_category: newClub.club_category,
          club_logo: newClub.club_logo || null,
          president_tag_id: presidentTag.id,
          member_tag_id: memberTag.id,
          created_by: teacherData.user_id
        })
        .select()
        .single();

      if (clubError) throw clubError;

      // Assign president tag to teacher
      const { error: assignError } = await supabase
        .from('user_tag_assignments')
        .insert({
          user_id: teacherData.user_id,
          tag_id: presidentTag.id,
          assigned_by: teacherData.user_id
        });

      if (assignError) throw assignError;

      toast({
        title: 'Success',
        description: `${newClub.club_name} created successfully`
      });

      setNewClubDialogOpen(false);
      setNewClub({
        club_name: '',
        description: '',
        club_category: 'academic',
        club_logo: ''
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
      const { error } = await supabase
        .from('user_tag_assignments')
        .insert({
          user_id: studentId,
          tag_id: selectedClub.member_tag_id,
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

  const removeMember = async (assignmentId: string, memberName: string) => {
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
    setEditingClub({
      id: club.id,
      club_name: club.club_name,
      description: club.description || '',
      club_category: club.club_category,
      club_logo: club.club_logo || ''
    });
    setEditClubDialogOpen(true);
  };

  const updateClub = async () => {
    try {
      if (!editingClub.club_name || !editingClub.club_category) {
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
          club_name: editingClub.club_name,
          description: editingClub.description || null,
          club_category: editingClub.club_category,
          club_logo: editingClub.club_logo || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingClub.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Club updated successfully'
      });

      setEditClubDialogOpen(false);
      setEditingClub(null);
      await fetchAdvisorClubs();
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
                                      onClick={() => addMember(student.id)}
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
                      {clubMembers.map((member) => (
                        <Card key={member.id} className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {member.user_profiles.first_name} {member.user_profiles.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.user_profiles.user_code} • {member.user_profiles.email}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Joined {new Date(member.assigned_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeMember(member.id, `${member.user_profiles.first_name} ${member.user_profiles.last_name}`)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
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
                    value={editingClub.club_name}
                    onChange={(e) => setEditingClub({...editingClub, club_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Enter club description"
                    value={editingClub.description}
                    onChange={(e) => setEditingClub({...editingClub, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <Select
                    value={editingClub.club_category}
                    onValueChange={(value) => setEditingClub({...editingClub, club_category: value})}
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
                  <label className="text-sm font-medium">Club Logo URL</label>
                  <Input
                    placeholder="Enter logo URL (optional)"
                    value={editingClub.club_logo}
                    onChange={(e) => setEditingClub({...editingClub, club_logo: e.target.value})}
                  />
                </div>
                
                <Button 
                  onClick={updateClub} 
                  className="w-full"
                  disabled={!editingClub.club_name || !editingClub.club_category}
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