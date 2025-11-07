import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExamProctoringSettings, AIModelConfig, ProctoringAnalytics } from '@/components/admin/ProctoringManagement';
import { Settings, Brain, BarChart3 } from 'lucide-react';

export default function AdminProctoringManagement() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Proctoring Management</h1>
        <p className="text-muted-foreground">
          Configure AI proctoring settings, models, and view analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="ai-config" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Models
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          <ExamProctoringSettings />
        </TabsContent>

        <TabsContent value="ai-config" className="mt-6">
          <AIModelConfig />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <ProctoringAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
