import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { proctoringService } from '@/services/proctoringService';
import { Settings, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Database } from '@/types';

type ProctoringSettings = Database['public']['Tables']['proctoring_settings']['Row'];
type ProctoringSettingsInsert = Database['public']['Tables']['proctoring_settings']['Insert'];

interface ExamProctoringSettingsProps {
  examId?: string;
  onSave?: (settings: ProctoringSettings) => void;
}

export function ExamProctoringSettings({ examId, onSave }: ExamProctoringSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<ProctoringSettingsInsert>>({
    exam_id: examId,
    require_webcam: true,
    require_microphone: false,
    require_screen_share: true,
    require_id_verification: false,
    allow_tab_switching: false,
    allow_copy_paste: false,
    require_fullscreen: true,
    snapshot_interval_seconds: 30,
    recording_enabled: true,
    ai_face_detection: true,
    ai_object_detection: true,
    ai_gaze_tracking: false,
    ai_audio_analysis: false,
    violation_threshold_low: 3,
    violation_threshold_medium: 2,
    violation_threshold_high: 1,
    auto_terminate_on_critical: false,
    proctor_intervention_enabled: true,
    custom_rules: '',
  });

  useEffect(() => {
    if (examId) {
      loadSettings();
    }
  }, [examId]);

  const loadSettings = async () => {
    if (!examId) return;

    try {
      setLoading(true);
      const existingSettings = await proctoringService.getExamSettings(examId);
      if (existingSettings) {
        setSettings(existingSettings);
      }
    } catch (error) {
      console.error('Error loading proctoring settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const result = await proctoringService.upsertSettings(settings as ProctoringSettingsInsert);

      toast({
        title: 'Settings saved',
        description: 'Proctoring settings have been updated successfully.',
      });

      if (onSave && result) {
        onSave(result);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save proctoring settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Proctoring Settings
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure AI-powered proctoring rules and requirements
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Hardware Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Hardware Requirements</CardTitle>
          <CardDescription>
            Specify which devices students must enable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Webcam Required</Label>
              <p className="text-sm text-muted-foreground">
                Students must enable their webcam during the exam
              </p>
            </div>
            <Switch
              checked={settings.require_webcam}
              onCheckedChange={(checked) => updateSetting('require_webcam', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Microphone Required</Label>
              <p className="text-sm text-muted-foreground">
                Students must enable their microphone during the exam
              </p>
            </div>
            <Switch
              checked={settings.require_microphone}
              onCheckedChange={(checked) => updateSetting('require_microphone', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Screen Share Required</Label>
              <p className="text-sm text-muted-foreground">
                Students must share their entire screen during the exam
              </p>
            </div>
            <Switch
              checked={settings.require_screen_share}
              onCheckedChange={(checked) => updateSetting('require_screen_share', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>ID Verification Required</Label>
              <p className="text-sm text-muted-foreground">
                Students must verify their identity before starting
              </p>
            </div>
            <Switch
              checked={settings.require_id_verification}
              onCheckedChange={(checked) => updateSetting('require_id_verification', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Behavioral Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle>Behavioral Restrictions</CardTitle>
          <CardDescription>
            Control what actions students can perform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Tab Switching</Label>
              <p className="text-sm text-muted-foreground">
                Permit students to switch browser tabs (will be logged)
              </p>
            </div>
            <Switch
              checked={settings.allow_tab_switching}
              onCheckedChange={(checked) => updateSetting('allow_tab_switching', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Copy/Paste</Label>
              <p className="text-sm text-muted-foreground">
                Permit students to copy and paste text
              </p>
            </div>
            <Switch
              checked={settings.allow_copy_paste}
              onCheckedChange={(checked) => updateSetting('allow_copy_paste', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Fullscreen</Label>
              <p className="text-sm text-muted-foreground">
                Students must stay in fullscreen mode throughout the exam
              </p>
            </div>
            <Switch
              checked={settings.require_fullscreen}
              onCheckedChange={(checked) => updateSetting('require_fullscreen', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Detection Settings */}
      <Card>
        <CardHeader>
          <CardTitle>AI Detection Features</CardTitle>
          <CardDescription>
            Configure AI-powered anomaly detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Face Detection</Label>
              <p className="text-sm text-muted-foreground">
                Detect multiple faces or absence of student's face
              </p>
            </div>
            <Switch
              checked={settings.ai_face_detection}
              onCheckedChange={(checked) => updateSetting('ai_face_detection', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Object Detection</Label>
              <p className="text-sm text-muted-foreground">
                Detect prohibited objects (phones, books, additional screens)
              </p>
            </div>
            <Switch
              checked={settings.ai_object_detection}
              onCheckedChange={(checked) => updateSetting('ai_object_detection', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Gaze Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Monitor where the student is looking
              </p>
            </div>
            <Switch
              checked={settings.ai_gaze_tracking}
              onCheckedChange={(checked) => updateSetting('ai_gaze_tracking', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Audio Analysis</Label>
              <p className="text-sm text-muted-foreground">
                Detect conversations and background voices
              </p>
            </div>
            <Switch
              checked={settings.ai_audio_analysis}
              onCheckedChange={(checked) => updateSetting('ai_audio_analysis', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recording Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Recording & Monitoring</CardTitle>
          <CardDescription>
            Configure session recording and snapshot intervals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Recording</Label>
              <p className="text-sm text-muted-foreground">
                Record the entire proctoring session for review
              </p>
            </div>
            <Switch
              checked={settings.recording_enabled}
              onCheckedChange={(checked) => updateSetting('recording_enabled', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Snapshot Interval (seconds)</Label>
            <Input
              type="number"
              min="10"
              max="300"
              value={settings.snapshot_interval_seconds}
              onChange={(e) => updateSetting('snapshot_interval_seconds', parseInt(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              How often to capture and analyze snapshots (10-300 seconds)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Violation Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Violation Thresholds</CardTitle>
          <CardDescription>
            Set how many violations trigger automatic actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Low Severity Threshold</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={settings.violation_threshold_low}
                onChange={(e) => updateSetting('violation_threshold_low', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Warning after this many low violations
              </p>
            </div>

            <div className="space-y-2">
              <Label>Medium Severity Threshold</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={settings.violation_threshold_medium}
                onChange={(e) => updateSetting('violation_threshold_medium', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Warning after this many medium violations
              </p>
            </div>

            <div className="space-y-2">
              <Label>High Severity Threshold</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={settings.violation_threshold_high}
                onChange={(e) => updateSetting('violation_threshold_high', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Warning after this many high violations
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label>Auto-Terminate on Critical Violation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically terminate exam when critical violation is detected
              </p>
            </div>
            <Switch
              checked={settings.auto_terminate_on_critical}
              onCheckedChange={(checked) => updateSetting('auto_terminate_on_critical', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Proctor Intervention</Label>
              <p className="text-sm text-muted-foreground">
                Allow proctors to send real-time warnings and interventions
              </p>
            </div>
            <Switch
              checked={settings.proctor_intervention_enabled}
              onCheckedChange={(checked) => updateSetting('proctor_intervention_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Rules & Instructions</CardTitle>
          <CardDescription>
            Add exam-specific rules to display to students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.custom_rules || ''}
            onChange={(e) => updateSetting('custom_rules', e.target.value)}
            placeholder="Enter custom rules and instructions for students..."
            rows={6}
          />
          <p className="text-sm text-muted-foreground mt-2">
            These rules will be displayed during the consent process
          </p>
        </CardContent>
      </Card>

      {/* Warning Message */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Important Considerations</p>
              <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                <li>Stricter settings may cause technical issues for some students</li>
                <li>AI detection may produce false positives - always review flagged events</li>
                <li>Recording and storage will increase for longer exams</li>
                <li>Test these settings before deploying to production exams</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {!examId && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Template Settings</p>
                <p className="text-sm text-blue-800 mt-1">
                  These are default template settings. You can apply them when creating or editing exams.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
