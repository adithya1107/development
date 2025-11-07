/**
 * Media Capture Utilities
 * 
 * Provides comprehensive WebRTC-based media capture functionality for proctoring:
 * - Webcam video capture
 * - Microphone audio capture
 * - Screen sharing/recording
 * - Snapshot capture
 * - Recording management
 * 
 * @module lib/mediaCapture
 */

export interface MediaCaptureConfig {
  video?: {
    enabled: boolean;
    width?: number;
    height?: number;
    frameRate?: number;
    facingMode?: "user" | "environment";
  };
  audio?: {
    enabled: boolean;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
  };
  screen?: {
    enabled: boolean;
    audio?: boolean;
  };
}

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: "videoinput" | "audioinput" | "audiooutput";
}

export interface MediaCaptureState {
  isVideoActive: boolean;
  isAudioActive: boolean;
  isScreenActive: boolean;
  videoDeviceId?: string;
  audioDeviceId?: string;
}

export interface SnapshotOptions {
  quality?: number; // 0.0 to 1.0
  format?: "image/png" | "image/jpeg" | "image/webp";
  width?: number;
  height?: number;
}

/**
 * Media Capture Manager Class
 */
export class MediaCaptureManager {
  private videoStream: MediaStream | null = null;
  private audioStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;

  /**
   * Check if browser supports required media APIs
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      navigator.mediaDevices.getDisplayMedia &&
      window.MediaRecorder
    );
  }

  /**
   * Request permissions for media devices
   */
  async requestPermissions(config: MediaCaptureConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const constraints: MediaStreamConstraints = {};

      if (config.video?.enabled) {
        constraints.video = {
          width: { ideal: config.video.width || 640 },
          height: { ideal: config.video.height || 480 },
          frameRate: { ideal: config.video.frameRate || 30 },
          facingMode: config.video.facingMode || "user",
        };
      }

      if (config.audio?.enabled) {
        constraints.audio = {
          echoCancellation: config.audio.echoCancellation ?? true,
          noiseSuppression: config.audio.noiseSuppression ?? true,
          autoGainControl: config.audio.autoGainControl ?? true,
        };
      }

      // Request permissions
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stop the stream immediately - we just wanted to check permissions
      stream.getTracks().forEach(track => track.stop());

      return { success: true };
    } catch (error: any) {
      console.error("Permission request failed:", error);
      return {
        success: false,
        error: this.getPermissionErrorMessage(error),
      };
    }
  }

  /**
   * Get user-friendly error message
   */
  private getPermissionErrorMessage(error: any): string {
    if (error.name === "NotAllowedError") {
      return "Camera/microphone access was denied. Please allow permissions and try again.";
    } else if (error.name === "NotFoundError") {
      return "No camera or microphone found. Please connect a device and try again.";
    } else if (error.name === "NotReadableError") {
      return "Camera/microphone is already in use by another application.";
    } else if (error.name === "OverconstrainedError") {
      return "Camera/microphone doesn't meet the required specifications.";
    }
    return "Failed to access camera/microphone. Please check your browser settings.";
  }

  /**
   * Get list of available media devices
   */
  async getAvailableDevices(): Promise<{
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
  }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevices = devices
        .filter(device => device.kind === "videoinput")
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
          kind: device.kind as "videoinput",
        }));

      const audioDevices = devices
        .filter(device => device.kind === "audioinput")
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
          kind: device.kind as "audioinput",
        }));

      return { videoDevices, audioDevices };
    } catch (error) {
      console.error("Error enumerating devices:", error);
      return { videoDevices: [], audioDevices: [] };
    }
  }

  /**
   * Start video capture
   */
  async startVideoCapture(options?: {
    deviceId?: string;
    width?: number;
    height?: number;
    frameRate?: number;
  }): Promise<{ stream: MediaStream | null; error?: string }> {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: options?.deviceId ? { exact: options.deviceId } : undefined,
          width: { ideal: options?.width || 640 },
          height: { ideal: options?.height || 480 },
          frameRate: { ideal: options?.frameRate || 30 },
        },
      };

      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      return { stream: this.videoStream };
    } catch (error: any) {
      console.error("Error starting video capture:", error);
      return { stream: null, error: this.getPermissionErrorMessage(error) };
    }
  }

  /**
   * Start audio capture
   */
  async startAudioCapture(options?: {
    deviceId?: string;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
  }): Promise<{ stream: MediaStream | null; error?: string }> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: options?.deviceId ? { exact: options.deviceId } : undefined,
          echoCancellation: options?.echoCancellation ?? true,
          noiseSuppression: options?.noiseSuppression ?? true,
          autoGainControl: true,
        },
      };

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      return { stream: this.audioStream };
    } catch (error: any) {
      console.error("Error starting audio capture:", error);
      return { stream: null, error: this.getPermissionErrorMessage(error) };
    }
  }

  /**
   * Start screen capture
   */
  async startScreenCapture(options?: {
    includeAudio?: boolean;
  }): Promise<{ stream: MediaStream | null; error?: string }> {
    try {
      const constraints: DisplayMediaStreamOptions = {
        video: {
          cursor: "always" as any,
        },
        audio: options?.includeAudio || false,
      };

      this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);

      // Listen for user stopping screen share
      this.screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        this.stopScreenCapture();
      });

      return { stream: this.screenStream };
    } catch (error: any) {
      console.error("Error starting screen capture:", error);
      return {
        stream: null,
        error: error.name === "NotAllowedError"
          ? "Screen sharing was denied."
          : "Failed to capture screen.",
      };
    }
  }

  /**
   * Stop video capture
   */
  stopVideoCapture(): void {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
  }

  /**
   * Stop audio capture
   */
  stopAudioCapture(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }

  /**
   * Stop screen capture
   */
  stopScreenCapture(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
  }

  /**
   * Stop all captures
   */
  stopAllCaptures(): void {
    this.stopVideoCapture();
    this.stopAudioCapture();
    this.stopScreenCapture();
    if (this.isRecording) {
      this.stopRecording();
    }
  }

  /**
   * Capture snapshot from video stream
   */
  captureSnapshot(
    videoElement: HTMLVideoElement,
    options?: SnapshotOptions
  ): string | null {
    try {
      const canvas = document.createElement("canvas");
      const width = options?.width || videoElement.videoWidth;
      const height = options?.height || videoElement.videoHeight;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(videoElement, 0, 0, width, height);

      const format = options?.format || "image/jpeg";
      const quality = options?.quality || 0.8;

      return canvas.toDataURL(format, quality);
    } catch (error) {
      console.error("Error capturing snapshot:", error);
      return null;
    }
  }

  /**
   * Capture snapshot as Blob for upload
   */
  async captureSnapshotBlob(
    videoElement: HTMLVideoElement,
    options?: SnapshotOptions
  ): Promise<Blob | null> {
    try {
      const canvas = document.createElement("canvas");
      const width = options?.width || videoElement.videoWidth;
      const height = options?.height || videoElement.videoHeight;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(videoElement, 0, 0, width, height);

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob),
          options?.format || "image/jpeg",
          options?.quality || 0.8
        );
      });
    } catch (error) {
      console.error("Error capturing snapshot blob:", error);
      return null;
    }
  }

  /**
   * Start recording combined streams
   */
  async startRecording(options?: {
    videoBitsPerSecond?: number;
    audioBitsPerSecond?: number;
    mimeType?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isRecording) {
        return { success: false, error: "Recording already in progress" };
      }

      // Combine all active streams
      const tracks: MediaStreamTrack[] = [];
      
      if (this.videoStream) {
        tracks.push(...this.videoStream.getVideoTracks());
      }
      if (this.audioStream) {
        tracks.push(...this.audioStream.getAudioTracks());
      }
      if (this.screenStream) {
        tracks.push(...this.screenStream.getVideoTracks());
      }

      if (tracks.length === 0) {
        return { success: false, error: "No active streams to record" };
      }

      const combinedStream = new MediaStream(tracks);

      // Determine best supported MIME type
      const mimeType = this.getBestMimeType(options?.mimeType);

      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: options?.videoBitsPerSecond || 2500000,
        audioBitsPerSecond: options?.audioBitsPerSecond || 128000,
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;

      return { success: true };
    } catch (error: any) {
      console.error("Error starting recording:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get best supported MIME type
   */
  private getBestMimeType(preferred?: string): string {
    const types = [
      preferred,
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ].filter(Boolean) as string[];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "";
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder?.mimeType || "video/webm",
        });
        this.recordedChunks = [];
        this.isRecording = false;
        this.mediaRecorder = null;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Pause recording
   */
  pauseRecording(): boolean {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
      return true;
    }
    return false;
  }

  /**
   * Resume recording
   */
  resumeRecording(): boolean {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
      return true;
    }
    return false;
  }

  /**
   * Get current capture state
   */
  getCaptureState(): MediaCaptureState {
    return {
      isVideoActive: !!this.videoStream && this.videoStream.active,
      isAudioActive: !!this.audioStream && this.audioStream.active,
      isScreenActive: !!this.screenStream && this.screenStream.active,
      videoDeviceId: this.videoStream?.getVideoTracks()[0]?.getSettings().deviceId,
      audioDeviceId: this.audioStream?.getAudioTracks()[0]?.getSettings().deviceId,
    };
  }

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get recording duration in seconds
   */
  getRecordingDuration(): number {
    if (!this.isRecording || !this.recordedChunks.length) {
      return 0;
    }
    // Estimate based on chunks (rough approximation)
    return this.recordedChunks.length;
  }

  /**
   * Monitor audio levels (for silence detection)
   */
  startAudioLevelMonitoring(
    callback: (level: number) => void,
    interval: number = 100
  ): () => void {
    if (!this.audioStream) {
      console.warn("No audio stream available for monitoring");
      return () => {};
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(this.audioStream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 1024;
    microphone.connect(analyser);

    const intervalId = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalizedLevel = average / 255; // 0 to 1
      callback(normalizedLevel);
    }, interval);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      microphone.disconnect();
      audioContext.close();
    };
  }

  /**
   * Test camera and microphone
   */
  async testDevices(): Promise<{
    camera: { working: boolean; error?: string };
    microphone: { working: boolean; error?: string };
  }> {
    const result = {
      camera: { working: false, error: undefined as string | undefined },
      microphone: { working: false, error: undefined as string | undefined },
    };

    // Test camera
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      result.camera.working = true;
      videoStream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      result.camera.error = this.getPermissionErrorMessage(error);
    }

    // Test microphone
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      result.microphone.working = true;
      audioStream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      result.microphone.error = this.getPermissionErrorMessage(error);
    }

    return result;
  }

  /**
   * Get device information for logging
   */
  async getDeviceInfo(): Promise<Record<string, any>> {
    try {
      const devices = await this.getAvailableDevices();
      const state = this.getCaptureState();

      return {
        videoDevices: devices.videoDevices.length,
        audioDevices: devices.audioDevices.length,
        currentVideoDevice: state.videoDeviceId,
        currentAudioDevice: state.audioDeviceId,
        videoActive: state.isVideoActive,
        audioActive: state.isAudioActive,
        screenActive: state.isScreenActive,
        browser: navigator.userAgent,
        platform: navigator.platform,
        recording: this.isRecording,
      };
    } catch (error) {
      console.error("Error getting device info:", error);
      return {};
    }
  }
}

// Export singleton instance
export const mediaCaptureManager = new MediaCaptureManager();
export default mediaCaptureManager;
