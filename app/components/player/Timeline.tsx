'use client';

/**
 * Timeline Component
 * Video timeline with scrubbing and preview thumbnails
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import type { TimelineProps } from '@/app/types/player';
import styles from './Timeline.module.css';

export function Timeline({
  currentTime,
  duration,
  buffered,
  onSeek,
  onSeekStart,
  onSeekEnd,
  thumbnails,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeFromPosition = useCallback((clientX: number): number => {
    const timeline = timelineRef.current;
    if (!timeline) return 0;

    const rect = timeline.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return position * duration;
  }, [duration]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    onSeekStart?.();
    const time = getTimeFromPosition(e.clientX);
    onSeek(time);
  }, [getTimeFromPosition, onSeek, onSeekStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    const rect = timeline.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = position * duration;

    setHoverTime(time);
    setHoverPosition(position * 100);

    if (isDragging) {
      onSeek(time);
    }
  }, [duration, isDragging, onSeek]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onSeekEnd?.();
    }
  }, [isDragging, onSeekEnd]);

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = Math.min(buffered, 100);

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timeDisplay}>
        <span className={styles.currentTime}>{formatTime(currentTime)}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.duration}>{formatTime(duration)}</span>
      </div>

      <div
        ref={timelineRef}
        className={styles.timeline}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          const timeline = timelineRef.current;
          if (!timeline) return;
          const rect = timeline.getBoundingClientRect();
          const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const time = position * duration;
          setHoverTime(time);
          setHoverPosition(position * 100);
        }}
        onMouseLeave={handleMouseLeave}
        role="slider"
        aria-label="Video timeline"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
      >
        {/* Buffered progress */}
        <div
          className={styles.buffered}
          style={{ width: `${bufferedPercent}%` }}
        />

        {/* Played progress */}
        <div
          className={styles.progress}
          style={{ width: `${progressPercent}%` }}
        />

        {/* Scrubber */}
        <div
          className={styles.scrubber}
          style={{ left: `${progressPercent}%` }}
        />

        {/* Hover preview */}
        {hoverTime !== null && (
          <div
            className={styles.hoverPreview}
            style={{ left: `${hoverPosition}%` }}
          >
            <div className={styles.hoverTime}>
              {formatTime(hoverTime)}
            </div>
            {thumbnails && (
              <div className={styles.thumbnail}>
                {/* Thumbnail sprite would go here */}
                <div className={styles.thumbnailPlaceholder} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
