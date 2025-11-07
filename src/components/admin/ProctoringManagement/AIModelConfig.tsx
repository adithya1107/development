import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  Eye, 
  Mic, 
  Monitor,
  User,
  Settings,
  CheckCircle2
} from 'lucide-react';

interface AIModelConfigProps {
  onSave?: (config: AIDetectionConfig) => void;
}

interface AIDetectionConfig {
  // Face Detection
  faceDetection: {
    enabled: boolean;
    provider: 'tensorflow' | 'aws-rekognition' | 'azure-face' | 'mediapipe';
    model: string;
    confidenceThreshold: number;
    multipleChevckInterval: number;
    noFaceThreshold: number;
  };
  
  // Object Detection
  objectDetection: {
    enabled: boolean;
    provider: 'tensorflow' | 'aws-rekognition' | 'google-vision';
    model: string;
    confidenceThreshold: number;
    checkInterval: number;
    prohibitedObjects: string[];
  };
  
  // Gaze Tracking
  gazeTracking: {
    enabled: boolean;
    provider: 'mediapipe' | 'webgazer' | 'custom';
    confidenceThreshold: number;
    lookAwayThreshold: number;
    checkInterval: number;
  };
  
  // Audio Analysis
  audioAnalysis: {
    enabled: boolean;
    provider: 'web-speech' | 'aws-transcribe' | 'google-speech';
    volumeThreshold: number;
    conversationDetection: boolean;
    backgroundNoiseThreshold: number;
  };
}

const DEFAULT_CONFIG: AIDetectionConfig = {
  faceDetection: {
    enabled: true,
    provider: 'tensorflow',
    model: 'face-api.js',
    confidenceThreshold: 0.7,
    multipleChevckInterval: 5000,
    noFaceThreshold: 3000,
  },
  objectDetection: {
    enabled: true,
    provider: 'tensorflow',
    model: 'coco-ssd',
    confidenceThreshold: 0.6,
    checkInterval: 10000,
    prohibitedObjects: ['cell phone', 'book', 'laptop', 'tablet'],
  },
  gazeTracking: {
    enabled: false,
    provider: 'mediapipe',
    confidenceThreshold: 0.6,
    lookAwayThreshold: 5000,
    checkInterval: 2000,
  },
  audioAnalysis: {
    enabled: false,
    provider: 'web-speech',
    volumeThreshold: 0.3,
    conversationDetection: true,
    backgroundNoiseThreshold: 0.5,
  },
};

export function AIModelConfig({ onSave }: AIModelConfigProps) {
  const [config, setConfig] = useState<AIDetectionConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // TODO: Save to backend or localStorage
      // For now, just show success message
      
      toast({
        title: 'Configuration saved',
        description: 'AI detection settings have been updated successfully.',
      });

      if (onSave) {
        onSave(config);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save AI configuration.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    toast({
      title: 'Configuration reset',
      description: 'Settings have been reset to defaults.',
    });
  };

  const updateFaceDetection = <K extends keyof AIDetectionConfig['faceDetection']>(
    key: K,
    value: AIDetectionConfig['faceDetection'][K]
  ) => {
    setConfig(prev => ({
      ...prev,
      faceDetection: { ...prev.faceDetection, [key]: value },
    }));
  };

  const updateObjectDetection = <K extends keyof AIDetectionConfig['objectDetection']>(
    key: K,
    value: AIDetectionConfig['objectDetection'][K]
  ) => {
    setConfig(prev => ({
      ...prev,
      objectDetection: { ...prev.objectDetection, [key]: value },
    }));
  };

  const updateGazeTracking = <K extends keyof AIDetectionConfig['gazeTracking']>(
    key: K,
    value: AIDetectionConfig['gazeTracking'][K]
  ) => {
    setConfig(prev => ({
      ...prev,
      gazeTracking: { ...prev.gazeTracking, [key]: value },
    }));
  };

  const updateAudioAnalysis = <K extends keyof AIDetectionConfig['audioAnalysis']>(
    key: K,
    value: AIDetectionConfig['audioAnalysis'][K]
  ) => {
    setConfig(prev => ({
      ...prev,
      audioAnalysis: { ...prev.audioAnalysis, [key]: value },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Model Configuration
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure AI detection models and thresholds
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Settings className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Configuration Guide</p>
              <p className="text-sm text-blue-800 mt-1">
                These settings control the AI detection models used during proctoring. Higher confidence thresholds 
                reduce false positives but may miss some violations. Lower thresholds catch more violations but may 
                produce more false positives. Test thoroughly before deploying to production.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="face" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="face" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Face Detection
          </TabsTrigger>
          <TabsTrigger value="object" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Object Detection
          </TabsTrigger>
          <TabsTrigger value="gaze" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Gaze Tracking
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Audio Analysis
          </TabsTrigger>
        </TabsList>

        {/* Face Detection Tab */}
        <TabsContent value="face" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Face Detection Configuration</CardTitle>
                  <CardDescription>
                    Detect multiple faces or absence of student's face
                  </CardDescription>
                </div>
                <Badge variant={config.faceDetection.enabled ? 'default' : 'secondary'}>
                  {config.faceDetection.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select
                  value={config.faceDetection.provider}
                  onValueChange={(value: any) => updateFaceDetection('provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tensorflow">TensorFlow.js (face-api.js)</SelectItem>
                    <SelectItem value="aws-rekognition">AWS Rekognition</SelectItem>
                    <SelectItem value="azure-face">Azure Face API</SelectItem>
                    <SelectItem value="mediapipe">MediaPipe Face Detection</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {config.faceDetection.provider === 'tensorflow' && 'Client-side, free, moderate accuracy'}
                  {config.faceDetection.provider === 'aws-rekognition' && 'Server-side, paid, high accuracy'}
                  {config.faceDetection.provider === 'azure-face' && 'Server-side, paid, high accuracy'}
                  {config.faceDetection.provider === 'mediapipe' && 'Client-side, free, high accuracy'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={config.faceDetection.model}
                  onChange={(e) => updateFaceDetection('model', e.target.value)}
                  placeholder="Model name or version"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Confidence Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {(config.faceDetection.confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[config.faceDetection.confidenceThreshold]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([value]) => updateFaceDetection('confidenceThreshold', value)}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum confidence score to consider a detection valid
                </p>
              </div>

              <div className="space-y-2">
                <Label>Multiple Face Check Interval (ms)</Label>
                <Input
                  type="number"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={config.faceDetection.multipleChevckInterval}
                  onChange={(e) => updateFaceDetection('multipleChevckInterval', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  How often to check for multiple faces
                </p>
              </div>

              <div className="space-y-2">
                <Label>No Face Threshold (ms)</Label>
                <Input
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={config.faceDetection.noFaceThreshold}
                  onChange={(e) => updateFaceDetection('noFaceThreshold', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Trigger violation if no face detected for this duration
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Object Detection Tab */}
        <TabsContent value="object" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Object Detection Configuration</CardTitle>
                  <CardDescription>
                    Detect prohibited objects like phones, books, and additional screens
                  </CardDescription>
                </div>
                <Badge variant={config.objectDetection.enabled ? 'default' : 'secondary'}>
                  {config.objectDetection.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select
                  value={config.objectDetection.provider}
                  onValueChange={(value: any) => updateObjectDetection('provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tensorflow">TensorFlow.js (COCO-SSD)</SelectItem>
                    <SelectItem value="aws-rekognition">AWS Rekognition</SelectItem>
                    <SelectItem value="google-vision">Google Cloud Vision</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={config.objectDetection.model}
                  onChange={(e) => updateObjectDetection('model', e.target.value)}
                  placeholder="Model name or version"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Confidence Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {(config.objectDetection.confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[config.objectDetection.confidenceThreshold]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([value]) => updateObjectDetection('confidenceThreshold', value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Check Interval (ms)</Label>
                <Input
                  type="number"
                  min="5000"
                  max="60000"
                  step="5000"
                  value={config.objectDetection.checkInterval}
                  onChange={(e) => updateObjectDetection('checkInterval', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  How often to scan for prohibited objects
                </p>
              </div>

              <div className="space-y-2">
                <Label>Prohibited Objects</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {config.objectDetection.prohibitedObjects.map((obj, index) => (
                    <Badge key={index} variant="secondary">
                      {obj}
                      <button
                        className="ml-1 hover:text-red-600"
                        onClick={() => {
                          const newObjects = config.objectDetection.prohibitedObjects.filter((_, i) => i !== index);
                          updateObjectDetection('prohibitedObjects', newObjects);
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add prohibited object..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = e.currentTarget.value.trim();
                      if (value && !config.objectDetection.prohibitedObjects.includes(value)) {
                        updateObjectDetection('prohibitedObjects', [
                          ...config.objectDetection.prohibitedObjects,
                          value,
                        ]);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Press Enter to add objects. Common: cell phone, book, laptop, tablet, monitor
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gaze Tracking Tab */}
        <TabsContent value="gaze" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gaze Tracking Configuration</CardTitle>
                  <CardDescription>
                    Monitor where the student is looking
                  </CardDescription>
                </div>
                <Badge variant={config.gazeTracking.enabled ? 'default' : 'secondary'}>
                  {config.gazeTracking.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      Gaze tracking is experimental and may not work reliably on all devices. It can produce 
                      many false positives. Use with caution and always review flagged events manually.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select
                  value={config.gazeTracking.provider}
                  onValueChange={(value: any) => updateGazeTracking('provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mediapipe">MediaPipe Face Mesh</SelectItem>
                    <SelectItem value="webgazer">WebGazer.js</SelectItem>
                    <SelectItem value="custom">Custom Model</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Confidence Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {(config.gazeTracking.confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[config.gazeTracking.confidenceThreshold]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([value]) => updateGazeTracking('confidenceThreshold', value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Look Away Threshold (ms)</Label>
                <Input
                  type="number"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={config.gazeTracking.lookAwayThreshold}
                  onChange={(e) => updateGazeTracking('lookAwayThreshold', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Trigger violation if looking away for this duration
                </p>
              </div>

              <div className="space-y-2">
                <Label>Check Interval (ms)</Label>
                <Input
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={config.gazeTracking.checkInterval}
                  onChange={(e) => updateGazeTracking('checkInterval', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audio Analysis Tab */}
        <TabsContent value="audio" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audio Analysis Configuration</CardTitle>
                  <CardDescription>
                    Detect conversations and background voices
                  </CardDescription>
                </div>
                <Badge variant={config.audioAnalysis.enabled ? 'default' : 'secondary'}>
                  {config.audioAnalysis.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select
                  value={config.audioAnalysis.provider}
                  onValueChange={(value: any) => updateAudioAnalysis('provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web-speech">Web Speech API</SelectItem>
                    <SelectItem value="aws-transcribe">AWS Transcribe</SelectItem>
                    <SelectItem value="google-speech">Google Speech-to-Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Volume Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {(config.audioAnalysis.volumeThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[config.audioAnalysis.volumeThreshold]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([value]) => updateAudioAnalysis('volumeThreshold', value)}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum volume level to start analyzing audio
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Background Noise Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {(config.audioAnalysis.backgroundNoiseThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[config.audioAnalysis.backgroundNoiseThreshold]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([value]) => updateAudioAnalysis('backgroundNoiseThreshold', value)}
                />
                <p className="text-sm text-muted-foreground">
                  Trigger violation if background noise exceeds this level
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Testing Section */}
      <Card>
        <CardHeader>
          <CardTitle>Model Testing</CardTitle>
          <CardDescription>
            Test your AI configuration before deploying
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            It's recommended to test these settings in a controlled environment before using them in production exams.
            Create a test exam and verify that detection works as expected without generating too many false positives.
          </p>
          <Button variant="outline">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Run Test Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
