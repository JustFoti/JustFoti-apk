'use client';

/**
 * Offline Indicator Component
 * Shows a banner when the user is offline
 */

import React from 'react';
import { useOfflineDetection } from '@/lib/utils/offline-manager';
import styles from './OfflineIndicator.module.css';

export function OfflineIndicator() {
  const isOffline = useOfflineDetection();
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (isOffline) {
      setShow(true);
    } else {
      // Delay hiding to show "back online" message
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  if (!show) {
    return null;
  }

  return (
    <div className={`${styles.indicator} ${isOffline ? styles.offline : styles.online}`}>
      <div className={styles.content}>
        {isOffline ? (
          <>
            <svg
              className={styles.icon}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" strokeLinecap="round" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" strokeWidth="2" strokeLinecap="round" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" strokeWidth="2" strokeLinecap="round" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" strokeWidth="2" strokeLinecap="round" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" strokeWidth="2" strokeLinecap="round" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className={styles.text}>You're offline</span>
            <span className={styles.subtext}>Some features may be limited</span>
          </>
        ) : (
          <>
            <svg
              className={styles.icon}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={styles.text}>Back online</span>
          </>
        )}
      </div>
    </div>
  );
}
