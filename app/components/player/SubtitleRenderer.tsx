'use client';

/**
 * Subtitle Renderer Component
 * Renders WebVTT subtitles with customizable styling
 */

import { useEffect, useState, useRef } from 'react';
import type { SubtitleTrack } from '@/app/types/player';
import styles from './SubtitleRenderer.module.css';

interface SubtitleRendererProps {
  currentTime: number;
  track: SubtitleTrack | null;
  visible: boolean;
}

interface Cue {
  startTime: number;
  endTime: number;
  text: string;
}

export function SubtitleRenderer({ currentTime, track, visible }: SubtitleRendererProps) {
  const [currentCue, setCurrentCue] = useState<Cue | null>(null);
  const cuesRef = useRef<Cue[]>([]);

  // Load and parse WebVTT file
  useEffect(() => {
    if (!track) {
      cuesRef.current = [];
      setCurrentCue(null);
      return;
    }

    const loadSubtitles = async () => {
      try {
        const response = await fetch(track.url);
        const text = await response.text();
        const parsedCues = parseWebVTT(text);
        cuesRef.current = parsedCues;
      } catch (error) {
        console.error('Failed to load subtitles:', error);
        cuesRef.current = [];
      }
    };

    loadSubtitles();
  }, [track]);

  // Update current cue based on time
  useEffect(() => {
    if (cuesRef.current.length === 0) {
      setCurrentCue(null);
      return;
    }

    const cue = cuesRef.current.find(
      (c) => currentTime >= c.startTime && currentTime <= c.endTime
    );

    setCurrentCue(cue || null);
  }, [currentTime]);

  if (!visible || !currentCue) {
    return null;
  }

  return (
    <div className={styles.subtitleContainer}>
      <div 
        className={styles.subtitle}
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(currentCue.text) }}
      />
    </div>
  );
}

/**
 * Parse WebVTT subtitle format
 */
function parseWebVTT(vttText: string): Cue[] {
  const cues: Cue[] = [];
  const lines = vttText.split('\n');
  let i = 0;

  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();

    // Look for timestamp line
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      const startTime = parseTimestamp(startStr);
      const endTime = parseTimestamp(endStr);

      // Collect text lines
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }

      if (textLines.length > 0) {
        cues.push({
          startTime,
          endTime,
          text: textLines.join('<br>'),
        });
      }
    }

    i++;
  }

  return cues;
}

/**
 * Parse WebVTT timestamp (HH:MM:SS.mmm or MM:SS.mmm)
 */
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Sanitize HTML to prevent XSS while allowing basic formatting
 */
function sanitizeHTML(html: string): string {
  // Allow only basic formatting tags
  const allowedTags = ['b', 'i', 'u', 'br'];
  const tagRegex = /<\/?([a-z]+)[^>]*>/gi;
  
  return html.replace(tagRegex, (match, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      return match;
    }
    return '';
  });
}
