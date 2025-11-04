/**
 * Video Player Types
 * Type definitions for the advanced video player system
 */

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  url: string;
  default?: boolean;
}

export interface QualityLevel {
  height: number;
  bitrate: number;
  label: string;
}

export interface PlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  fullscreen: boolean;
  pictureInPicture: boolean;
  quality: 'auto' | string;
  playbackRate: number;
  subtitleTrack: number | null;
  buffered: number;
  seeking: boolean;
  loading: boolean;
  error: string | null;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  subtitles?: SubtitleTrack[];
  autoPlay?: boolean;
  startTime?: number;
  onProgress?: (time: number, duration: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  contentId?: string;
  contentType?: 'movie' | 'episode';
}

export interface ControlsProps {
  state: PlayerState;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  onPictureInPictureToggle: () => void;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSubtitleChange: (trackIndex: number | null) => void;
  qualities: QualityLevel[];
  subtitles: SubtitleTrack[];
  visible: boolean;
}

export interface TimelineProps {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  thumbnails?: string;
}

export interface GestureState {
  startX: number;
  startY: number;
  startTime: number;
  seeking: boolean;
  volumeAdjusting: boolean;
}
