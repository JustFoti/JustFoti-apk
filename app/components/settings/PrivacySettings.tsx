/**
 * Privacy Settings Component
 * Allows users to manage their anonymized data and privacy preferences
 */

'use client';

import { useState } from 'react';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { useUserPreferences } from '@/lib/hooks/useUserPreferences';
import { useViewingHistory } from '@/lib/hooks/useViewingHistory';
import styles from './PrivacySettings.module.css';

export default function PrivacySettings() {
  const { clearUserData, getUserSession } = useAnalytics();
  const { preferences, updatePreferences } = useUserPreferences();
  const { clearHistory, getViewingStats } = useViewingHistory();
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);

  const userSession = getUserSession();
  const viewingStats = getViewingStats();

  const handleClearAllData = () => {
    clearUserData();
    clearHistory();
    setShowConfirmClear(false);
    
    // Show success message
    alert('All your data has been cleared successfully.');
  };

  const handleExportData = () => {
    const exportData = {
      userSession: {
        userId: userSession?.userId,
        deviceId: userSession?.deviceId,
        createdAt: userSession?.createdAt,
      },
      preferences: preferences,
      viewingStats: viewingStats,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flyx-data-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowDataExport(false);
  };

  const toggleDataCollection = (enabled: boolean) => {
    updatePreferences({ dataCollectionEnabled: enabled });
  };

  return (
    <div className={styles.privacySettings}>
      <div className={styles.header}>
        <h2>Privacy & Data Settings</h2>
        <p>Manage your anonymized data and privacy preferences</p>
      </div>

      <div className={styles.section}>
        <h3>Your Anonymous Profile</h3>
        <div className={styles.profileInfo}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Anonymous User ID:</span>
            <span className={styles.value}>
              {userSession?.userId ? `${userSession.userId.substring(0, 12)}...` : 'Not available'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Device ID:</span>
            <span className={styles.value}>
              {userSession?.deviceId ? `${userSession.deviceId.substring(0, 12)}...` : 'Not available'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Profile Created:</span>
            <span className={styles.value}>
              {userSession?.createdAt 
                ? new Date(userSession.createdAt).toLocaleDateString()
                : 'Not available'
              }
            </span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Data Collection</h3>
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h4>Anonymous Analytics</h4>
            <p>
              We collect anonymized usage data to improve your experience. 
              This includes watch progress, preferences, and interaction patterns.
            </p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={preferences?.dataCollectionEnabled !== false}
              onChange={(e) => toggleDataCollection(e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Your Data Summary</h3>
        <div className={styles.dataSummary}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{viewingStats.totalItems}</span>
            <span className={styles.statLabel}>Items Watched</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{viewingStats.completedItems}</span>
            <span className={styles.statLabel}>Completed</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {Math.round(viewingStats.totalWatchTime / 3600)}h
            </span>
            <span className={styles.statLabel}>Total Watch Time</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {Math.round(viewingStats.completionRate)}%
            </span>
            <span className={styles.statLabel}>Completion Rate</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Data Management</h3>
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={() => setShowDataExport(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export My Data
          </button>
          
          <button
            className={`${styles.actionButton} ${styles.danger}`}
            onClick={() => setShowConfirmClear(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
            </svg>
            Clear All Data
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Privacy Information</h3>
        <div className={styles.privacyInfo}>
          <h4>How We Protect Your Privacy</h4>
          <ul>
            <li>All data is stored locally on your device using anonymous identifiers</li>
            <li>We never collect personal information like names, emails, or addresses</li>
            <li>Your viewing data is anonymized and cannot be linked to your identity</li>
            <li>You can clear all data at any time using the button above</li>
            <li>Data is automatically cleaned up after periods of inactivity</li>
          </ul>
          
          <h4>What Data We Collect</h4>
          <ul>
            <li>Watch progress and completion status</li>
            <li>Video quality and playback preferences</li>
            <li>Search queries and interaction patterns</li>
            <li>Device information for optimization (screen size, browser type)</li>
            <li>Anonymous usage statistics for improving the service</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal for Clear Data */}
      {showConfirmClear && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Clear All Data</h3>
            <p>
              This will permanently delete all your watch progress, preferences, 
              and viewing history. This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowConfirmClear(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleClearAllData}
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Export Modal */}
      {showDataExport && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Export Your Data</h3>
            <p>
              This will download a JSON file containing your anonymized data including 
              preferences, viewing statistics, and anonymous identifiers.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowDataExport(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleExportData}
              >
                Download Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}