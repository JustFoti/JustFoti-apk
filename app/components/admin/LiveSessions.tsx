/**
 * LiveSessions Component
 * Displays real-time active sessions
 */

'use client';

import { useEffect, useState } from 'react';
import styles from './LiveSessions.module.css';

export interface Session {
  sessionId: string;
  lastActivity: number;
  currentContent?: {
    title: string;
    contentType: 'movie' | 'tv';
  };
  eventsCount: number;
}

export interface LiveSessionsProps {
  sessions: Session[];
  loading?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function LiveSessions({
  sessions,
  loading = false,
  autoRefresh = false,
  refreshInterval = 30000,
}: LiveSessionsProps) {
  const [, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Live Sessions</h2>
          <div className={styles.pulse}>
            <span className={styles.pulseIcon}></span>
          </div>
        </div>
        <div className={styles.list}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={styles.session}>
              <div className={styles.skeleton}>
                <div className={styles.skeletonLine}></div>
                <div className={styles.skeletonLine}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Live Sessions</h2>
          <div className={styles.count}>0 active</div>
        </div>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>👥</span>
          <p className={styles.emptyText}>No active sessions</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Live Sessions</h2>
        <div className={styles.badge}>
          <span className={styles.pulse}>
            <span className={styles.pulseIcon}></span>
          </span>
          <span className={styles.count}>{sessions.length} active</span>
        </div>
      </div>
      
      <div className={styles.list}>
        {sessions.map((session) => (
          <div key={session.sessionId} className={styles.session}>
            <div className={styles.sessionHeader}>
              <div className={styles.sessionId}>
                Session {session.sessionId.slice(0, 8)}...
              </div>
              <div className={styles.time}>
                {formatTimeAgo(session.lastActivity)}
              </div>
            </div>
            
            {session.currentContent && (
              <div className={styles.content}>
                <span className={styles.contentIcon}>
                  {session.currentContent.contentType === 'movie' ? '🎬' : '📺'}
                </span>
                <span className={styles.contentTitle}>
                  {session.currentContent.title}
                </span>
              </div>
            )}
            
            <div className={styles.meta}>
              <span className={styles.events}>
                {session.eventsCount} events
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
