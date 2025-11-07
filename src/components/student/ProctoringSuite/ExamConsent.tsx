/**
 * Exam Consent Component
 * 
 * Displays proctoring terms and conditions and collects student consent
 * before starting a proctored exam.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Camera, Mic, Monitor, Eye, AlertTriangle } from "lucide-react";

interface ExamConsentProps {
  examName: string;
  requiresWebcam: boolean;
  requiresMicrophone: boolean;
  requiresScreenShare: boolean;
  onConsent: () => void;
  onCancel: () => void;
}

export function ExamConsent({
  examName,
  requiresWebcam,
  requiresMicrophone,
  requiresScreenShare,
  onConsent,
  onCancel,
}: ExamConsentProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [behaviorAccepted, setBehaviorAccepted] = useState(false);

  const canProceed = termsAccepted && privacyAccepted && behaviorAccepted;

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle>Proctoring Consent Required</CardTitle>
          </div>
          <CardDescription>
            {examName} uses AI-powered proctoring. Please review and accept the terms below to continue.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Requirements Section */}
          <div>
            <h3 className="font-semibold mb-3">System Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {requiresWebcam && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Camera className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">Webcam Access Required</span>
                </div>
              )}
              {requiresMicrophone && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Mic className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Microphone Access Required</span>
                </div>
              )}
              {requiresScreenShare && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Monitor className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">Screen Sharing Required</span>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Eye className="h-5 w-5 text-orange-600" />
                <span className="text-sm">AI Monitoring Active</span>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div>
            <h3 className="font-semibold mb-3">Proctoring Terms & Conditions</h3>
            <ScrollArea className="h-48 border rounded-lg p-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">1. Data Collection & Usage</p>
                <p>
                  During this proctored exam, the following data will be collected:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  {requiresWebcam && <li>Video recording from your webcam</li>}
                  {requiresMicrophone && <li>Audio recording from your microphone</li>}
                  {requiresScreenShare && <li>Screen recording and activity monitoring</li>}
                  <li>Browser activity and tab switching</li>
                  <li>System information and timestamps</li>
                </ul>

                <p className="font-medium text-foreground mt-4">2. AI-Powered Monitoring</p>
                <p>
                  An AI system will analyze your exam session in real-time to detect:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Multiple faces in the video feed</li>
                  <li>Absence of your face from the camera view</li>
                  <li>Suspicious objects (phones, books, papers)</li>
                  <li>Looking away from the screen for extended periods</li>
                  <li>Unusual audio patterns or conversations</li>
                  <li>Window/tab switching or screen sharing</li>
                </ul>

                <p className="font-medium text-foreground mt-4">3. Data Retention</p>
                <p>
                  Your proctoring session data will be retained for academic review purposes
                  and may be accessed by instructors and authorized personnel. Recordings are
                  securely stored and will be deleted after the academic term ends.
                </p>

                <p className="font-medium text-foreground mt-4">4. Privacy & Security</p>
                <p>
                  All data is encrypted in transit and at rest. Your privacy is important to us,
                  and data will only be used for academic integrity purposes. You have the right
                  to request access to your proctoring data.
                </p>

                <p className="font-medium text-foreground mt-4">5. Exam Rules</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>You must be alone in a quiet, well-lit room</li>
                  <li>No unauthorized materials or devices are allowed</li>
                  <li>You must remain in front of the camera at all times</li>
                  <li>No communication with others during the exam</li>
                  <li>Browser must remain in fullscreen mode</li>
                  <li>No tab switching or opening new windows</li>
                </ul>

                <p className="font-medium text-foreground mt-4">6. Violations</p>
                <p>
                  Any detected violations will be flagged for instructor review and may result in:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Automatic warnings during the exam</li>
                  <li>Manual intervention by proctors</li>
                  <li>Exam termination</li>
                  <li>Academic integrity proceedings</li>
                </ul>
              </div>
            </ScrollArea>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              />
              <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                I have read and agree to the proctoring terms and conditions. I understand that my
                exam session will be recorded and monitored using AI technology.
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={privacyAccepted}
                onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
              />
              <label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                I consent to the collection, processing, and storage of my video, audio, and activity
                data for academic integrity purposes.
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="behavior"
                checked={behaviorAccepted}
                onCheckedChange={(checked) => setBehaviorAccepted(checked as boolean)}
              />
              <label htmlFor="behavior" className="text-sm leading-relaxed cursor-pointer">
                I understand and agree to follow all exam rules and guidelines. I acknowledge that
                violations may result in disciplinary action.
              </label>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              By accepting these terms, you acknowledge that you have been informed about the proctoring
              process and agree to be monitored during the exam. You cannot proceed without accepting all terms.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onConsent}
            disabled={!canProceed}
            className="min-w-32"
          >
            I Accept - Start Setup
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
