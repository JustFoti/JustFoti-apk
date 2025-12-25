'use client';

/**
 * Bot Filter Controls Component
 * Provides UI controls for bot filtering options in the admin panel
 * Uses the StatsContext for consistent bot filtering across all pages
 */

import { useStats } from '../context/StatsContext';

export default function BotFilterControls() {
  const { botFilterOptions, setBotFilterOptions, stats } = useStats();

  const handleIncludeBotsChange = (includeBots: boolean) => {
    setBotFilterOptions({
      ...botFilterOptions,
      includeBots,
    });
  };

  const handleThresholdChange = (threshold: number) => {
    setBotFilterOptions({
      ...botFilterOptions,
      confidenceThreshold: threshold,
    });
  };

  const handleShowMetricsChange = (showBotMetrics: boolean) => {
    setBotFilterOptions({
      ...botFilterOptions,
      showBotMetrics,
    });
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <h3 style={{
          color: '#f1f5f9',
          fontSize: '14px',
          fontWeight: '600',
          margin: 0,
        }}>
          🤖 Bot Detection & Filtering
        </h3>
        
        {botFilterOptions.showBotMetrics && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12px',
            color: '#94a3b8',
          }}>
            <span>Detected: {stats.botDetection.totalDetections}</span>
            <span>Suspected: {stats.botDetection.suspectedBots}</span>
            <span>Confirmed: {stats.botDetection.confirmedBots}</span>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap',
      }}>
        {/* Include/Exclude Bots Toggle */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#e2e8f0',
          fontSize: '13px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={botFilterOptions.includeBots}
            onChange={(e) => handleIncludeBotsChange(e.target.checked)}
            style={{
              accentColor: '#3b82f6',
            }}
          />
          Include bot traffic in analytics
        </label>

        {/* Confidence Threshold Slider */}
        {!botFilterOptions.includeBots && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <label style={{
              color: '#e2e8f0',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}>
              Bot confidence threshold:
            </label>
            <input
              type="range"
              min="30"
              max="95"
              step="5"
              value={botFilterOptions.confidenceThreshold}
              onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
              style={{
                width: '100px',
                accentColor: '#3b82f6',
              }}
            />
            <span style={{
              color: '#94a3b8',
              fontSize: '12px',
              minWidth: '35px',
            }}>
              {botFilterOptions.confidenceThreshold}%
            </span>
          </div>
        )}

        {/* Show Bot Metrics Toggle */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#e2e8f0',
          fontSize: '13px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={botFilterOptions.showBotMetrics}
            onChange={(e) => handleShowMetricsChange(e.target.checked)}
            style={{
              accentColor: '#3b82f6',
            }}
          />
          Show bot detection metrics
        </label>
      </div>

      {/* Help Text */}
      <div style={{
        marginTop: '12px',
        padding: '8px 12px',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#94a3b8',
        lineHeight: '1.4',
      }}>
        <strong>Bot filtering:</strong> When disabled, suspected bots above the confidence threshold are excluded from analytics.
        This provides more accurate user engagement metrics by filtering out automated traffic.
        {!botFilterOptions.includeBots && (
          <span> Currently filtering bots with ≥{botFilterOptions.confidenceThreshold}% confidence.</span>
        )}
      </div>
    </div>
  );
}