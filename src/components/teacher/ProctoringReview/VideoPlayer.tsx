import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type EventWithDetails, type ViolationWithEvidence } from '@/services/proctoringService';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipForward, 
  SkipBack,
  Flag,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { Database } from '@/types';

type ViolationSeverity = Database['public']['Enums']['violation_severity'];

interface VideoPlayerProps {
  videoUrl: string;
  violations?: ViolationWithEvidence[];
  events?: EventWithDetails[];
}

interface VideoMarker {
  id: string;
  timestamp: number; // seconds from start
  type: 'violation' | 'event';
  severity?: ViolationSeverity;
  label: string;
  data: ViolationWithEvidence | EventWithDetails;
}

export function VideoPlayer({ videoUrl, violations = [], events = [] }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showMarkers, setShowMarkers] = useState(true);

  // Convert violations and events to timeline markers
  const markers: VideoMarker[] = [
    ...violations.map(v => ({
      id: v.id,
      timestamp: calculateTimestamp(v.detected_at),
      type: 'violation' as const,
      severity: v.severity,
      label: v.violation_type,
      data: v,
    })),
    ...events.filter(e => e.flagged).map(e => ({
      id: e.id,
      timestamp: calculateTimestamp(e.detected_at),
      type: 'event' as const,
      label: e.event_type,
      data: e,
    })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  function calculateTimestamp(detectedAt: string): number {
    // This is a simplified calculation
    // In production, you'd need to calculate relative to video start time
    const detected = new Date(detectedAt).getTime();
    // Return seconds from video start
    // NOTE: This needs proper implementation based on your video recording logic
    return 0; // Placeholder
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const jumpToMarker = (timestamp: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = timestamp;
    setCurrentTime(timestamp);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (severity?: ViolationSeverity): string => {
    if (!severity) return 'bg-yellow-500';
    
    switch (severity) {
      case 'low': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Video Container */}
      <Card>
        <CardContent className="p-0">
          <div className="relative bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full aspect-video"
              onClick={togglePlayPause}
            />

            {/* Video Timeline Markers */}
            {showMarkers && duration > 0 && (
              <div className="absolute bottom-16 left-0 right-0 h-2 px-4">
                <div className="relative h-full">
                  {markers.map(marker => {
                    const position = (marker.timestamp / duration) * 100;
                    return (
                      <div
                        key={marker.id}
                        className={`absolute w-1 h-full ${getSeverityColor(marker.severity)} cursor-pointer hover:scale-y-150 transition-transform`}
                        style={{ left: `${position}%` }}
                        onClick={() => jumpToMarker(marker.timestamp)}
                        title={`${marker.label} at ${formatTime(marker.timestamp)}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="mb-4"
              />

              {/* Control Buttons */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => skip(-10)}
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => skip(10)}
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>

                  <span className="text-sm ml-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Playback Speed */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                    <select
                      value={playbackRate}
                      onChange={(e) => changePlaybackRate(Number(e.target.value))}
                      className="bg-transparent text-white text-sm border-none outline-none"
                    >
                      <option value="0.5" className="bg-black">0.5x</option>
                      <option value="0.75" className="bg-black">0.75x</option>
                      <option value="1" className="bg-black">1x</option>
                      <option value="1.25" className="bg-black">1.25x</option>
                      <option value="1.5" className="bg-black">1.5x</option>
                      <option value="2" className="bg-black">2x</option>
                    </select>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="w-20"
                    />
                  </div>

                  {/* Fullscreen */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Markers Panel */}
      {markers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Timeline Markers ({markers.length})</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMarkers(!showMarkers)}
              >
                {showMarkers ? 'Hide' : 'Show'} Markers
              </Button>
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {markers.map(marker => (
                  <div
                    key={marker.id}
                    className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => jumpToMarker(marker.timestamp)}
                  >
                    <div className="flex items-center gap-2">
                      {marker.type === 'violation' ? (
                        <AlertTriangle className={`h-4 w-4 ${
                          marker.severity === 'critical' ? 'text-red-600' : 
                          marker.severity === 'high' ? 'text-orange-600' :
                          marker.severity === 'medium' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`} />
                      ) : (
                        <Flag className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="text-sm font-medium">{marker.label}</span>
                      {marker.severity && (
                        <Badge variant={
                          marker.severity === 'critical' ? 'destructive' :
                          marker.severity === 'high' ? 'default' :
                          'secondary'
                        }>
                          {marker.severity}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(marker.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
