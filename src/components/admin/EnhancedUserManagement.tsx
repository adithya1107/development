
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, Mail } from 'lucide-react';
import UserManagement from './UserManagement';
import UserOnboarding from './UserOnboarding';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_code: string;
  user_type: 'student' | 'faculty' | 'admin' | 'staff';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  college_id: string;
  hierarchy_level: string;
}

interface AdminRole {
  role_type: string;
  permissions: any;
  assigned_at: string;
}

interface EnhancedUserManagementProps {
  userProfile: UserProfile;
  adminRoles: AdminRole[];
}

const EnhancedUserManagement = ({ userProfile, adminRoles }: EnhancedUserManagementProps) => {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
        <TabsTrigger value="users" className="flex items-center space-x-2">
          <Users className="w-4 h-4" />
          <span className="inline">User Management</span>
        </TabsTrigger>
        <TabsTrigger value="onboarding" className="flex items-center space-x-2">
          <UserPlus className="w-4 h-4" />
          <span className="inline">User Onboarding</span>
        </TabsTrigger>
      </TabsList>

        <TabsContent value="users">
          <UserManagement userProfile={userProfile} adminRoles={adminRoles} />
        </TabsContent>

        <TabsContent value="onboarding">
          <UserOnboarding userProfile={userProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedUserManagement;
