/**
 * Proctoring Indicators Component
 * 
 * Displays real-time proctoring status, warnings, and system health
 * during a proctored exam.
 */

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Mic, Monitor, Eye, Wifi, WifiOff, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProctoringIndicatorsProps {
  cameraActive: boolean;
  microphoneActive: boolean;
  screenShareActive: boolean;
  aiMonitoringActive: boolean;
  networkConnected: boolean;
  currentWarnings: Array<{
    id: string;
    type: string;
    message: string;
    severity: "low" | "medium" | "high" | "critical";
  }>;
  className?: string;
}

export function ProctoringIndicators({
  cameraActive,
  microphoneActive,
  screenShareActive,
  aiMonitoringActive,
  networkConnected,
  currentWarnings,
  className,
}: ProctoringIndicatorsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Indicators */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={cameraActive ? "default" : "destructive"} className="flex items-center gap-1">
          <Camera className="h-3 w-3" />
          {cameraActive ? "Camera On" : "Camera Off"}
        </Badge>

        <Badge variant={microphoneActive ? "default" : "destructive"} className="flex items-center gap-1">
          <Mic className="h-3 w-3" />
          {microphoneActive ? "Mic On" : "Mic Off"}
        </Badge>

        {screenShareActive && (
          <Badge variant="default" className="flex items-center gap-1">
            <Monitor className="h-3 w-3" />
            Screen Shared
          </Badge>
        )}

        <Badge variant={aiMonitoringActive ? "default" : "secondary"} className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {aiMonitoringActive ? "AI Monitoring" : "Monitoring Paused"}
        </Badge>

        <Badge variant={networkConnected ? "default" : "destructive"} className="flex items-center gap-1">
          {networkConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {networkConnected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      {/* Warnings */}
      {currentWarnings.length > 0 && (
        <div className="space-y-2">
          {currentWarnings.map((warning) => (
            <Alert key={warning.id} variant={warning.severity === "critical" || warning.severity === "high" ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="capitalize">{warning.severity} Warning</AlertTitle>
              <AlertDescription>{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* All Clear Indicator */}
      {currentWarnings.length === 0 && cameraActive && microphoneActive && networkConnected && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-900 dark:text-green-100">
            All systems operating normally
          </span>
        </div>
      )}
    </div>
  );
}
