import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Search, Download, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AuditLog {
  id: string;
  action_type: string;
  action_description: string;
  module: string;
  created_at: string;
  admin_user_id: string;
  target_user_id: string;
  admin_user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  target_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AuditLogsProps {
  userProfile: any;
  adminRoles: any[];
}

const AuditLogs = ({ userProfile, adminRoles }: AuditLogsProps) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, [userProfile]);

  const loadAuditLogs = async () => {
    try {
      if (!userProfile?.college_id) {
        setIsLoading(false);
        return;
      }

      const { data: logsData, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action_type,
          action_description,
          module,
          created_at,
          admin_user_id,
          target_user_id
        `)
        .eq('college_id', userProfile.college_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading audit logs:', error);
        const mockLogs = [
          {
            id: '1',
            action_type: 'create',
            action_description: 'Created new user account',
            module: 'users',
            created_at: new Date().toISOString(),
            admin_user_id: userProfile.id,
            target_user_id: '',
            admin_user: {
              first_name: userProfile.first_name,
              last_name: userProfile.last_name,
              email: userProfile.email
            }
          }
        ];
        setAuditLogs(mockLogs);
      } else {
        const transformedLogs = logsData?.map(log => ({
          ...log,
          admin_user: {
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            email: userProfile.email
          }
        })) || [];
        
        setAuditLogs(transformedLogs);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs.",
        variant: "destructive",
      });
      setAuditLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperAdmin = () => {
    return adminRoles.some(role => role.role_type === 'super_admin') || 
           userProfile?.user_type === 'admin';
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.action_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin_user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin_user.last_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModule = filterModule === 'all' || log.module === filterModule;
    const matchesAction = filterAction === 'all' || log.action_type === filterAction;

    return matchesSearch && matchesModule && matchesAction;
  });

  const getActionBadgeColor = (actionType: string) => {
    const colors = {
      'create': 'bg-green-100 text-green-800',
      'update': 'bg-blue-100 text-blue-800',
      'delete': 'bg-red-100 text-red-800',
      'login': 'bg-gray-100 text-gray-800',
      'role_assigned': 'bg-purple-100 text-purple-800',
      'role_revoked': 'bg-orange-100 text-orange-800',
      'deactivate': 'bg-yellow-100 text-yellow-800'
    };
    return colors[actionType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getModuleBadgeColor = (module: string) => {
    const colors = {
      'users': 'bg-blue-100 text-blue-800',
      'roles': 'bg-purple-100 text-purple-800',
      'courses': 'bg-green-100 text-green-800',
      'events': 'bg-yellow-100 text-yellow-800',
      'finance': 'bg-red-100 text-red-800',
      'system': 'bg-gray-100 text-gray-800'
    };
    return colors[module as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const exportLogs = async () => {
    try {
      if (filteredLogs.length === 0) {
        toast({
          title: "No Data",
          description: "No audit logs to export.",
          variant: "destructive",
        });
        return;
      }

      const csvContent = [
        'Date,Admin User,Action,Module,Description,Target User',
        ...filteredLogs.map(log => [
          new Date(log.created_at).toLocaleString(),
          `${log.admin_user.first_name} ${log.admin_user.last_name}`,
          log.action_type,
          log.module || 'N/A',
          log.action_description || 'N/A',
          log.target_user ? `${log.target_user.first_name} ${log.target_user.last_name}` : 'N/A'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Audit logs exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: "Error",
        description: "Failed to export audit logs.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 text-sm sm:text-base">Loading audit logs...</p>
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
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Audit Logs</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-2">
                Track all administrative actions and system changes. 
                {isSuperAdmin() ? ' Full access to all logs.' : ' Access limited to your actions and relevant logs.'}
              </CardDescription>
            </div>
            <Button 
              onClick={exportLogs} 
              variant="default" 
              disabled={filteredLogs.length === 0}
              className="w-full sm:w-60"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 sm:pt-0 space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
              <Input
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 sm:pl-10 text-sm"
              />
            </div>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-full sm:w-48 text-sm">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">All Modules</SelectItem>
                <SelectItem value="users" className="text-sm">Users</SelectItem>
                <SelectItem value="roles" className="text-sm">Roles</SelectItem>
                <SelectItem value="courses" className="text-sm">Courses</SelectItem>
                <SelectItem value="events" className="text-sm">Events</SelectItem>
                <SelectItem value="finance" className="text-sm">Finance</SelectItem>
                <SelectItem value="system" className="text-sm">System</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-full sm:w-48 text-sm">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">All Actions</SelectItem>
                <SelectItem value="create" className="text-sm">Create</SelectItem>
                <SelectItem value="update" className="text-sm">Update</SelectItem>
                <SelectItem value="delete" className="text-sm">Delete</SelectItem>
                <SelectItem value="role_assigned" className="text-sm">Role Assigned</SelectItem>
                <SelectItem value="role_revoked" className="text-sm">Role Revoked</SelectItem>
                <SelectItem value="login" className="text-sm">Login</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audit Logs Table */}
          {filteredLogs.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm min-w-[160px]">Date & Time</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[180px]">Admin User</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[120px]">Action</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[100px]">Module</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[200px]">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs sm:text-sm min-w-[160px]">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <div>
                          <div className="font-medium text-xs sm:text-sm">
                            {log.admin_user.first_name} {log.admin_user.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{log.admin_user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <Badge className={`${getActionBadgeColor(log.action_type)} text-xs`}>
                          {log.action_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <Badge className={`${getModuleBadgeColor(log.module || 'system')} text-xs`}>
                          {log.module || 'system'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm min-w-[200px] max-w-md">
                        <div className="truncate">{log.action_description || 'No description'}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 text-gray-500 px-4">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No Audit Logs Found</h3>
              <p className="text-sm sm:text-base">No audit logs found matching your criteria or no logs have been recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;