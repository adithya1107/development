/**
 * VideoCallModal Component
 * Embeds Daily.co video call interface within a modal dialog
 * Supports teacher-parent PTM video calls with real-time participant tracking
 */

import React, { useEffect, useCallback, useState } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { DailyProvider, useDaily, useParticipantIds, useDailyEvent } from '@daily-co/daily-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Clock } from 'lucide-react';
import { meetingService } from '@/services/meetingService';
import { useToast } from '@/hooks/use-toast';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingUrl: string;
  meetingId: string;
  userId: string;
  userName: string;
  userRole: 'teacher' | 'parent';
}

// Inner component that uses Daily.co hooks
const VideoCallInterface: React.FC<{
  meetingId: string;
  userId: string;
  userName: string;
  onLeave: () => void;
}> = ({ meetingId, userId, userName, onLeave }) => {
  const daily = useDaily();
  const participantIds = useParticipantIds();
  const { toast } = useToast();
  
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [duration, setDuration] = useState(0);

  // Track call duration
  useEffect(() => {
    if (callState === 'connected') {
      const interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callState]);

  // Handle joining
  useDailyEvent('joined-meeting', useCallback(async () => {
    console.log('Joined meeting');
    setCallState('connected');
    await meetingService.joinMeeting(meetingId, userId, userName);
    
    toast({
      title: 'Connected',
      description: 'You have joined the meeting',
    });
  }, [meetingId, userId, userName, toast]));

  // Handle participant joining
  useDailyEvent('participant-joined', useCallback((event) => {
    console.log('Participant joined:', event.participant.user_name);
    toast({
      title: 'Participant Joined',
      description: `${event.participant.user_name || 'Someone'} has joined the meeting`,
    });
  }, [toast]));

  // Handle participant leaving
  useDailyEvent('participant-left', useCallback((event) => {
    console.log('Participant left:', event.participant.user_name);
    toast({
      title: 'Participant Left',
      description: `${event.participant.user_name || 'Someone'} has left the meeting`,
      variant: 'destructive',
    });
  }, [toast]));

  // Handle errors
  useDailyEvent('error', useCallback((event) => {
    console.error('Daily.co error:', event);
    toast({
      title: 'Connection Error',
      description: event.errorMsg || 'An error occurred during the call',
      variant: 'destructive',
    });
  }, [toast]));

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    if (!daily) return;
    await daily.setLocalVideo(!isCameraOn);
    setIsCameraOn(!isCameraOn);
  }, [daily, isCameraOn]);

  // Toggle microphone
  const toggleMicrophone = useCallback(async () => {
    if (!daily) return;
    await daily.setLocalAudio(!isMicOn);
    setIsMicOn(!isMicOn);
  }, [daily, isMicOn]);

  // Leave call
  const handleLeave = useCallback(async () => {
    if (!daily) return;
    
    await meetingService.leaveMeeting(meetingId, userId);
    await daily.leave();
    setCallState('ended');
    onLeave();
  }, [daily, meetingId, userId, onLeave]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 border-b">
        <div className="flex items-center gap-4">
          <Badge variant={callState === 'connected' ? 'default' : 'secondary'}>
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'connected' && 'Connected'}
            {callState === 'ended' && 'Ended'}
          </Badge>
          
          {callState === 'connected' && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(duration)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {participantIds.length} participant{participantIds.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Video Container - Daily.co handles rendering */}
      <div className="flex-1 bg-black relative">
        {/* Daily.co iframe renders here automatically */}
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-center gap-4 p-4 bg-slate-900 border-t border-slate-700">
        <Button
          variant={isMicOn ? 'default' : 'destructive'}
          size="lg"
          onClick={toggleMicrophone}
          className="rounded-full w-14 h-14"
        >
          {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>

        <Button
          variant={isCameraOn ? 'default' : 'destructive'}
          size="lg"
          onClick={toggleCamera}
          className="rounded-full w-14 h-14"
        >
          {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={handleLeave}
          className="rounded-full w-14 h-14"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

// Main component
export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  meetingUrl,
  meetingId,
  userId,
  userName,
  userRole,
}) => {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && meetingUrl) {
      // Create Daily.co call object
      const daily = DailyIframe.createCallObject({
        url: meetingUrl,
        userName: userName,
        subscribeToTracksAutomatically: true,
      });

      setCallObject(daily);

      // Join the call
      daily.join().catch(error => {
        console.error('Failed to join call:', error);
        toast({
          title: 'Failed to Join',
          description: 'Could not connect to the video call. Please try again.',
          variant: 'destructive',
        });
        onClose();
      });

      return () => {
        // Cleanup
        if (daily) {
          daily.leave();
          daily.destroy();
        }
      };
    }
  }, [isOpen, meetingUrl, userName, toast, onClose]);

  const handleClose = useCallback(async () => {
    if (callObject) {
      await callObject.leave();
      callObject.destroy();
    }
    setCallObject(null);
    onClose();
  }, [callObject, onClose]);

  if (!isOpen || !meetingUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Parent-Teacher Meeting</DialogTitle>
          <DialogDescription>
            Video call in progress
          </DialogDescription>
        </DialogHeader>

        {callObject ? (
          <DailyProvider callObject={callObject}>
            <VideoCallInterface
              meetingId={meetingId}
              userId={userId}
              userName={userName}
              onLeave={handleClose}
            />
          </DailyProvider>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-300">Connecting to meeting...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;
