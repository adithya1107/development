
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Settings, Database, Mail, Bell, Globe, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SystemSettingsProps {
  userProfile: any;
}

const SystemSettings = ({ userProfile }: SystemSettingsProps) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  const handleSystemAction = async (action: string) => {
    try {
      toast({
        title: "Action Initiated",
        description: `${action} process started. This may take a few moments.`,
      });

      // In a real implementation, these would call actual system APIs
      setTimeout(() => {
        toast({
          title: "Success",
          description: `${action} completed successfully.`,
        });
      }, 2000);
    } catch (error) {
      console.error('Error performing system action:', error);
      toast({
        title: "Error",
        description: `Failed to ${action.toLowerCase()}.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>System Status</span>
          </CardTitle>
          <CardDescription>
            Monitor and control overall system status and operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Database className="w-4 h-4 text-green-500" />
                <span className="font-medium">Database</span>
              </div>
              <Badge variant="default">Online</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Email Service</span>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-purple-500" />
                <span className="font-medium">API Gateway</span>
              </div>
              <Badge variant="default">Healthy</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Bell className="w-4 h-4 text-orange-500" />
                <span className="font-medium">Notifications</span>
              </div>
              <Badge variant="default">Running</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Maintenance Mode</span>
          </CardTitle>
          <CardDescription>
            Control system maintenance mode and display custom messages to users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Maintenance Mode</Label>
              <div className="text-sm text-gray-500">
                This will make the system unavailable to all users except super admins.
              </div>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-message">Maintenance Message</Label>
            <Textarea
              id="maintenance-message"
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="Enter a message to display to users during maintenance..."
              rows={3}
            />
          </div>

          {maintenanceMode && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Maintenance mode is enabled
                </span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Only super admins can access the system while maintenance mode is active.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>System Operations</span>
          </CardTitle>
          <CardDescription>
            Perform critical system operations and maintenance tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => handleSystemAction('Database Backup')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">Backup Database</div>
              <div className="text-sm text-gray-500 mt-1">
                Create a full system backup
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSystemAction('Cache Clear')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">Clear Cache</div>
              <div className="text-sm text-gray-500 mt-1">
                Clear all system caches
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSystemAction('System Optimization')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">Optimize System</div>
              <div className="text-sm text-gray-500 mt-1">
                Run system optimization tasks
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSystemAction('Log Cleanup')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">Clean Logs</div>
              <div className="text-sm text-gray-500 mt-1">
                Archive old system logs
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>System Notifications</span>
          </CardTitle>
          <CardDescription>
            Configure system-wide notification settings and alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Email Notifications</Label>
              <div className="text-sm text-gray-500">
                Send email notifications for system events and alerts.
              </div>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">System Alerts</Label>
              <div className="text-sm text-gray-500">
                Display in-app alerts for critical system events.
              </div>
            </div>
            <Switch
              checked={systemAlerts}
              onCheckedChange={setSystemAlerts}
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>Emergency Actions</span>
          </CardTitle>
          <CardDescription className="text-red-600">
            Use these actions only in emergency situations. These operations cannot be undone.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="destructive"
              onClick={() => handleSystemAction('Emergency Shutdown')}
              className="h-auto p-4 flex flex-col items-start w-full transition-transform duration-200 ease-in-out hover:scale-[1.001] active:scale-[0.98]"
            >
              <div className="font-medium">Emergency Shutdown</div>
              <div className="text-xs sm:text-sm opacity-90 mt-1">
                Immediately shut down all services
              </div>
            </Button>

            <Button
              variant="destructive"
              onClick={() => handleSystemAction('Reset All Sessions')}
              className="h-auto p-4 flex flex-col items-start w-full transition-transform duration-200 ease-in-out hover:scale-[1.001] active:scale-[0.98]"
            >
              <div className="font-medium">Reset All Sessions</div>
              <div className="text-xs sm:text-sm opacity-90 mt-1">
                Force logout all users immediately
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default SystemSettings;
