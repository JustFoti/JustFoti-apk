'use client';

/**
 * Video Player Controls
 * Custom controls with smooth animations and quality/subtitle selection
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Settings,
  Subtitles,
  PictureInPicture,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import type { ControlsProps } from '@/app/types/player';
import { Timeline } from './Timeline';
import styles from './Controls.module.css';

export function Controls({
  state,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onPictureInPictureToggle,
  onQualityChange,
  onPlaybackRateChange,
  onSubtitleChange,
  qualities,
  subtitles,
  visible,
}: ControlsProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const subtitlesRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
      if (subtitlesRef.current && !subtitlesRef.current.contains(event.target as Node)) {
        setShowSubtitles(false);
      }
      if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
        setShowVolume(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSkipBackward = () => {
    onSeek(Math.max(0, state.currentTime - 10));
  };

  const handleSkipForward = () => {
    onSeek(Math.min(state.duration, state.currentTime + 10));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    onVolumeChange(volume);
  };

  return (
    <div className={`${styles.controls} ${visible ? styles.visible : ''}`}>
      {/* Loading indicator */}
      {state.loading && (
        <div className={styles.loadingIndicator}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* Error message */}
      {state.error && (
        <div className={styles.error}>
          <p>{state.error}</p>
        </div>
      )}

      {/* Timeline */}
      <div className={styles.timelineWrapper}>
        <Timeline
          currentTime={state.currentTime}
          duration={state.duration}
          buffered={state.buffered}
          onSeek={onSeek}
        />
      </div>

      {/* Control buttons */}
      <div className={styles.controlsRow}>
        {/* Left controls */}
        <div className={styles.leftControls}>
          <button
            className={styles.controlButton}
            onClick={onPlayPause}
            aria-label={state.playing ? 'Pause' : 'Play'}
          >
            {state.playing ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            className={styles.controlButton}
            onClick={handleSkipBackward}
            aria-label="Skip backward 10 seconds"
          >
            <SkipBack size={20} />
          </button>

          <button
            className={styles.controlButton}
            onClick={handleSkipForward}
            aria-label="Skip forward 10 seconds"
          >
            <SkipForward size={20} />
          </button>

          {/* Volume control */}
          <div className={styles.volumeControl} ref={volumeRef}>
            <button
              className={styles.controlButton}
              onClick={onMuteToggle}
              onMouseEnter={() => setShowVolume(true)}
              aria-label={state.muted ? 'Unmute' : 'Mute'}
            >
              {state.muted || state.volume === 0 ? (
                <VolumeX size={20} />
              ) : (
                <Volume2 size={20} />
              )}
            </button>

            {showVolume && (
              <div 
                className={styles.volumeSlider}
                onMouseLeave={() => setShowVolume(false)}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.muted ? 0 : state.volume}
                  onChange={handleVolumeChange}
                  className={styles.slider}
                  aria-label="Volume"
                />
                <span className={styles.volumeValue}>
                  {Math.round((state.muted ? 0 : state.volume) * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className={styles.rightControls}>
          {/* Subtitles */}
          {subtitles.length > 0 && (
            <div className={styles.menuContainer} ref={subtitlesRef}>
              <button
                className={`${styles.controlButton} ${state.subtitleTrack !== null ? styles.active : ''}`}
                onClick={() => setShowSubtitles(!showSubtitles)}
                aria-label="Subtitles"
              >
                <Subtitles size={20} />
              </button>

              {showSubtitles && (
                <div className={styles.menu}>
                  <div className={styles.menuHeader}>Subtitles</div>
                  <button
                    className={`${styles.menuItem} ${state.subtitleTrack === null ? styles.selected : ''}`}
                    onClick={() => {
                      onSubtitleChange(null);
                      setShowSubtitles(false);
                    }}
                  >
                    Off
                  </button>
                  {subtitles.map((track, index) => (
                    <button
                      key={track.id}
                      className={`${styles.menuItem} ${state.subtitleTrack === index ? styles.selected : ''}`}
                      onClick={() => {
                        onSubtitleChange(index);
                        setShowSubtitles(false);
                      }}
                    >
                      {track.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings (Quality & Speed) */}
          <div className={styles.menuContainer} ref={settingsRef}>
            <button
              className={styles.controlButton}
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>

            {showSettings && (
              <div className={styles.menu}>
                <div className={styles.menuHeader}>Quality</div>
                <button
                  className={`${styles.menuItem} ${state.quality === 'auto' ? styles.selected : ''}`}
                  onClick={() => {
                    onQualityChange('auto');
                  }}
                >
                  Auto
                </button>
                {qualities.map((quality) => (
                  <button
                    key={quality.label}
                    className={`${styles.menuItem} ${state.quality === quality.label ? styles.selected : ''}`}
                    onClick={() => {
                      onQualityChange(quality.label);
                    }}
                  >
                    {quality.label}
                  </button>
                ))}

                <div className={styles.menuDivider} />
                <div className={styles.menuHeader}>Speed</div>
                {playbackRates.map((rate) => (
                  <button
                    key={rate}
                    className={`${styles.menuItem} ${state.playbackRate === rate ? styles.selected : ''}`}
                    onClick={() => {
                      onPlaybackRateChange(rate);
                    }}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Picture-in-Picture */}
          <button
            className={styles.controlButton}
            onClick={onPictureInPictureToggle}
            aria-label="Picture in Picture"
          >
            <PictureInPicture size={20} />
          </button>

          {/* Fullscreen */}
          <button
            className={styles.controlButton}
            onClick={onFullscreenToggle}
            aria-label={state.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {state.fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
