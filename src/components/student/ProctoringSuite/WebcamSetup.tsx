/**
 * Webcam Setup Component
 * 
 * Guides students through webcam, microphone, and screen sharing setup
 * before starting a proctored exam.
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Camera, Mic, Monitor, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { mediaCaptureManager, type MediaDeviceInfo } from "@/lib/mediaCapture";
import { useToast } from "@/hooks/use-toast";

interface WebcamSetupProps {
  requiresWebcam: boolean;
  requiresMicrophone: boolean;
  requiresScreenShare: boolean;
  onSetupComplete: (deviceInfo: any) => void;
  onBack: () => void;
}

type SetupStep = "camera" | "microphone" | "screen" | "test" | "complete";

export function WebcamSetup({
  requiresWebcam,
  requiresMicrophone,
  requiresScreenShare,
  onSetupComplete,
  onBack,
}: WebcamSetupProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>("camera");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  
  const [cameraStatus, setCameraStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [microphoneStatus, setMicrophoneStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [screenStatus, setScreenStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDevices();
    
    return () => {
      mediaCaptureManager.stopAllCaptures();
    };
  }, []);

  const loadDevices = async () => {
    const devices = await mediaCaptureManager.getAvailableDevices();
    setVideoDevices(devices.videoDevices);
    setAudioDevices(devices.audioDevices);
    
    if (devices.videoDevices.length > 0) {
      setSelectedVideoDevice(devices.videoDevices[0].deviceId);
    }
    if (devices.audioDevices.length > 0) {
      setSelectedAudioDevice(devices.audioDevices[0].deviceId);
    }
  };

  const testCamera = async () => {
    setCameraStatus("testing");
    setErrorMessage("");
    
    const result = await mediaCaptureManager.startVideoCapture({
      deviceId: selectedVideoDevice,
    });
    
    if (result.error) {
      setCameraStatus("error");
      setErrorMessage(result.error);
      toast({
        title: "Camera Error",
        description: result.error,
        variant: "destructive",
      });
    } else if (result.stream && videoRef.current) {
      videoRef.current.srcObject = result.stream;
      setCameraStatus("success");
      toast({
        title: "Camera Connected",
        description: "Your camera is working properly",
      });
    }
  };

  const testMicrophone = async () => {
    setMicrophoneStatus("testing");
    setErrorMessage("");
    
    const result = await mediaCaptureManager.startAudioCapture({
      deviceId: selectedAudioDevice,
    });
    
    if (result.error) {
      setMicrophoneStatus("error");
      setErrorMessage(result.error);
      toast({
        title: "Microphone Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setMicrophoneStatus("success");
      
      // Start audio level monitoring
      const cleanup = mediaCaptureManager.startAudioLevelMonitoring((level) => {
        setAudioLevel(level * 100);
      });
      
      toast({
        title: "Microphone Connected",
        description: "Speak to test your microphone",
      });
      
      setTimeout(() => {
        cleanup();
      }, 5000);
    }
  };

  const testScreenShare = async () => {
    setScreenStatus("testing");
    setErrorMessage("");
    
    const result = await mediaCaptureManager.startScreenCapture();
    
    if (result.error) {
      setScreenStatus("error");
      setErrorMessage(result.error);
      toast({
        title: "Screen Sharing Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setScreenStatus("success");
      toast({
        title: "Screen Sharing Enabled",
        description: "Screen sharing is working properly",
      });
      
      // Stop screen share preview
      setTimeout(() => {
        mediaCaptureManager.stopScreenCapture();
      }, 2000);
    }
  };

  const handleNext = () => {
    if (currentStep === "camera" && requiresMicrophone) {
      setCurrentStep("microphone");
    } else if ((currentStep === "camera" || currentStep === "microphone") && requiresScreenShare) {
      setCurrentStep("screen");
    } else {
      setCurrentStep("test");
    }
  };

  const handleComplete = async () => {
    const deviceInfo = await mediaCaptureManager.getDeviceInfo();
    onSetupComplete(deviceInfo);
  };

  const getProgress = () => {
    const steps = [];
    if (requiresWebcam) steps.push("camera");
    if (requiresMicrophone) steps.push("microphone");
    if (requiresScreenShare) steps.push("screen");
    steps.push("test");
    
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const canProceed = () => {
    if (currentStep === "camera") return cameraStatus === "success";
    if (currentStep === "microphone") return microphoneStatus === "success";
    if (currentStep === "screen") return screenStatus === "success";
    if (currentStep === "test") {
      return (
        (!requiresWebcam || cameraStatus === "success") &&
        (!requiresMicrophone || microphoneStatus === "success") &&
        (!requiresScreenShare || screenStatus === "success")
      );
    }
    return false;
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>System Setup</CardTitle>
          <CardDescription>
            Configure your camera, microphone, and screen sharing for proctoring
          </CardDescription>
          <Progress value={getProgress()} className="mt-4" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Camera Setup */}
          {currentStep === "camera" && requiresWebcam && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                <h3 className="font-semibold">Camera Setup</h3>
              </div>
              
              <Select value={selectedVideoDevice} onValueChange={setSelectedVideoDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {videoDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <Button onClick={testCamera} disabled={cameraStatus === "testing"} className="w-full">
                {cameraStatus === "testing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {cameraStatus === "success" && <CheckCircle className="mr-2 h-4 w-4" />}
                {cameraStatus === "error" && <XCircle className="mr-2 h-4 w-4" />}
                {cameraStatus === "idle" ? "Test Camera" : cameraStatus === "success" ? "Camera Working" : "Retry"}
              </Button>
            </div>
          )}

          {/* Microphone Setup */}
          {currentStep === "microphone" && requiresMicrophone && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                <h3 className="font-semibold">Microphone Setup</h3>
              </div>
              
              <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="p-6 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">Speak to test your microphone</p>
                <div className="h-4 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>

              <Button onClick={testMicrophone} disabled={microphoneStatus === "testing"} className="w-full">
                {microphoneStatus === "testing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {microphoneStatus === "success" && <CheckCircle className="mr-2 h-4 w-4" />}
                {microphoneStatus === "error" && <XCircle className="mr-2 h-4 w-4" />}
                {microphoneStatus === "idle" ? "Test Microphone" : microphoneStatus === "success" ? "Microphone Working" : "Retry"}
              </Button>
            </div>
          )}

          {/* Screen Share Setup */}
          {currentStep === "screen" && requiresScreenShare && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                <h3 className="font-semibold">Screen Sharing Setup</h3>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You will be asked to share your entire screen. Make sure to select your full screen,
                  not just a specific window or browser tab.
                </AlertDescription>
              </Alert>

              <Button onClick={testScreenShare} disabled={screenStatus === "testing"} className="w-full">
                {screenStatus === "testing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {screenStatus === "success" && <CheckCircle className="mr-2 h-4 w-4" />}
                {screenStatus === "error" && <XCircle className="mr-2 h-4 w-4" />}
                {screenStatus === "idle" ? "Enable Screen Sharing" : screenStatus === "success" ? "Screen Sharing Ready" : "Retry"}
              </Button>
            </div>
          )}

          {/* Final Test */}
          {currentStep === "test" && (
            <div className="space-y-4">
              <h3 className="font-semibold">System Check Complete</h3>
              
              <div className="space-y-2">
                {requiresWebcam && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      <span className="text-sm">Camera</span>
                    </div>
                    {cameraStatus === "success" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                )}
                
                {requiresMicrophone && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      <span className="text-sm">Microphone</span>
                    </div>
                    {microphoneStatus === "success" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                )}
                
                {requiresScreenShare && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span className="text-sm">Screen Sharing</span>
                    </div>
                    {screenStatus === "success" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                )}
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All systems are ready. You can now proceed to start your proctored exam.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          {currentStep === "test" ? (
            <Button onClick={handleComplete} disabled={!canProceed()}>
              Start Exam
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
