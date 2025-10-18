import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Shield, Plus, Trash2, Users, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AdminRoleAssignment {
  id: string;
  user_id: string;
  admin_role_type: string;
  assigned_at: string;
  is_active: boolean;
  user_profiles: {
    first_name: string;
    last_name: string;
    email: string;
    user_code: string;
  };
}

interface RoleManagementProps {
  userProfile: any;
}

const RoleManagement = ({ userProfile }: RoleManagementProps) => {
  const [roleAssignments, setRoleAssignments] = useState<AdminRoleAssignment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const adminRoleTypes = [
    { value: 'course_management_admin', label: 'Course Management Admin', description: 'Manages courses, enrollments, and academic schedules' },
    { value: 'estate_logistics_admin', label: 'Estate & Logistics Admin', description: 'Handles campus infrastructure and logistics' },
    { value: 'event_admin', label: 'Event Admin', description: 'Organizes and manages college events' },
    { value: 'finance_admin', label: 'Finance Admin', description: 'Manages financial operations and transactions' },
    { value: 'it_admin', label: 'IT Admin', description: 'Handles IT infrastructure and technical support' }
  ];

  useEffect(() => {
    loadRoleAssignments();
    loadAvailableUsers();
  }, []);

  const loadRoleAssignments = async () => {
    try {
      const mockAssignments: AdminRoleAssignment[] = [
        {
          id: '1',
          user_id: userProfile.id,
          admin_role_type: 'super_admin',
          assigned_at: new Date().toISOString(),
          is_active: true,
          user_profiles: {
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            email: userProfile.email,
            user_code: userProfile.user_code
          }
        }
      ];

      setRoleAssignments(mockAssignments);
    } catch (error) {
      console.error('Error loading role assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load role assignments.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('college_id', userProfile.college_id)
        .in('user_type', ['admin', 'teacher'])
        .eq('is_active', true);

      if (error) {
        console.error('Error loading users:', error);
      } else {
        setAvailableUsers(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: "Missing Information",
        description: "Please select both a user and a role.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Success",
        description: "Role assignment simulated successfully. Database integration pending.",
      });

      setIsAssignDialogOpen(false);
      setSelectedUser('');
      setSelectedRole('');
      loadRoleAssignments();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to assign role.",
        variant: "destructive",
      });
    }
  };

  const revokeRole = async (roleId: string, targetUserId: string, roleType: string) => {
    try {
      toast({
        title: "Success",
        description: "Role revocation simulated successfully. Database integration pending.",
      });

      loadRoleAssignments();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to revoke role.",
        variant: "destructive",
      });
    }
  };

  const getRoleDisplayName = (roleType: string) => {
    const role = adminRoleTypes.find(r => r.value === roleType);
    return role ? role.label : roleType.replace('_', ' ');
  };

  const getRoleBadgeColor = (roleType: string) => {
    const colors = {
      'super_admin': 'bg-red-100 text-red-800',
      'course_management_admin': 'bg-blue-100 text-blue-800',
      'estate_logistics_admin': 'bg-green-100 text-green-800',
      'event_admin': 'bg-purple-100 text-purple-800',
      'finance_admin': 'bg-yellow-100 text-yellow-800',
      'it_admin': 'bg-gray-100 text-gray-800'
    };
    return colors[roleType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 text-sm sm:text-base">Loading role assignments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Role Management</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-2">
                Assign and manage admin roles for your college. Only Super Admins can manage roles.
              </CardDescription>
            </div>
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-60">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Role
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Assign Admin Role</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Select a user and role to assign admin privileges.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id} className="text-sm">
                            {user.first_name} {user.last_name} ({user.user_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Select Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {adminRoleTypes.map((role) => (
                          <SelectItem key={role.value} value={role.value} className="text-sm">
                            <div>
                              <div className="font-medium">{role.label}</div>
                              <div className="text-xs text-gray-500">{role.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={assignRole} className="w-full text-sm">
                    Assign Role
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 sm:pt-0">
          {/* Horizontally Scrollable Table */}
          <div className="rounded-md border overflow-x-auto max-h-[350px] sm:max-h-[450px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm min-w-[200px]">User</TableHead>
                  <TableHead className="text-xs sm:text-sm min-w-[180px]">Role</TableHead>
                  <TableHead className="text-xs sm:text-sm min-w-[120px]">Assigned Date</TableHead>
                  <TableHead className="text-xs sm:text-sm min-w-[100px]">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="min-w-[200px]">
                      <div>
                        <div className="font-medium text-xs sm:text-sm">
                          {assignment.user_profiles.first_name} {assignment.user_profiles.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {assignment.user_profiles.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <Badge className={`${getRoleBadgeColor(assignment.admin_role_type)} text-xs`}>
                        {getRoleDisplayName(assignment.admin_role_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm min-w-[120px]">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <Badge variant={assignment.is_active ? "default" : "secondary"} className="text-xs">
                        {assignment.is_active ? "Active" : "Revoked"}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      {assignment.is_active && assignment.admin_role_type !== 'super_admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 text-xs"
                          onClick={() => revokeRole(assignment.id, assignment.user_id, assignment.admin_role_type)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {roleAssignments.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No role assignments found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Hierarchy Info */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>Admin Role Hierarchy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {adminRoleTypes.map((role) => (
              <div key={role.value} className="p-3 sm:p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Award className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <h4 className="font-medium text-sm sm:text-base">{role.label}</h4>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManagement;