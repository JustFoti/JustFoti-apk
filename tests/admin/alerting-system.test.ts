/**
 * Unit Tests for System Health Alerting System
 * Validates: Requirements 6.2
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';

// Alert severity levels
enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Alert types
enum AlertType {
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  DISK_USAGE = 'disk_usage',
  API_ERROR_RATE = 'api_error_rate',
  DATABASE_SLOW_QUERY = 'database_slow_query',
  HIGH_TRAFFIC = 'high_traffic',
  SYSTEM_DOWN = 'system_down'
}

// Alert configuration interface
interface AlertThreshold {
  type: AlertType;
  severity: AlertSeverity;
  threshold: number;
  duration: number; // Duration in seconds before triggering
  enabled: boolean;
}

// Alert instance interface
interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

// Mock alerting system
class MockAlertingSystem {
  private alerts: Alert[] = [];
  private thresholds: AlertThreshold[] = [];
  private alertCallbacks: Array<(alert: Alert) => void> = [];

  // Configure alert thresholds
  setThresholds(thresholds: AlertThreshold[]) {
    this.thresholds = thresholds;
  }

  // Add alert callback
  onAlert(callback: (alert: Alert) => void) {
    this.alertCallbacks.push(callback);
  }

  // Check metrics against thresholds and generate alerts
  checkMetrics(metrics: Record<string, number>) {
    const now = Date.now();
    
    for (const threshold of this.thresholds) {
      if (!threshold.enabled) continue;
      
      const metricValue = metrics[threshold.type];
      if (metricValue === undefined) continue;
      
      // Check if threshold is exceeded
      if (metricValue > threshold.threshold) {
        // Check if we already have an active alert for this type
        const existingAlert = this.alerts.find(
          alert => alert.type === threshold.type && !alert.resolved
        );
        
        if (!existingAlert) {
          const alert: Alert = {
            id: `alert_${now}_${threshold.type}`,
            type: threshold.type,
            severity: threshold.severity,
            message: this.generateAlertMessage(threshold.type, metricValue, threshold.threshold),
            value: metricValue,
            threshold: threshold.threshold,
            timestamp: now,
            resolved: false,
          };
          
          this.alerts.push(alert);
          
          // Notify callbacks
          this.alertCallbacks.forEach(callback => callback(alert));
        }
      } else {
        // Check if we should resolve existing alerts
        const existingAlert = this.alerts.find(
          alert => alert.type === threshold.type && !alert.resolved
        );
        
        if (existingAlert) {
          existingAlert.resolved = true;
          existingAlert.resolvedAt = now;
        }
      }
    }
  }

  // Generate alert message
  private generateAlertMessage(type: AlertType, value: number, threshold: number): string {
    switch (type) {
      case AlertType.CPU_USAGE:
        return `High CPU usage detected: ${value.toFixed(1)}% (threshold: ${threshold}%)`;
      case AlertType.MEMORY_USAGE:
        return `High memory usage detected: ${value.toFixed(1)}% (threshold: ${threshold}%)`;
      case AlertType.DISK_USAGE:
        return `High disk usage detected: ${value.toFixed(1)}% (threshold: ${threshold}%)`;
      case AlertType.API_ERROR_RATE:
        return `High API error rate detected: ${value.toFixed(2)}% (threshold: ${threshold}%)`;
      case AlertType.DATABASE_SLOW_QUERY:
        return `Slow database queries detected: ${value.toFixed(0)}ms avg (threshold: ${threshold}ms)`;
      case AlertType.HIGH_TRAFFIC:
        return `High traffic detected: ${value.toFixed(0)} req/s (threshold: ${threshold} req/s)`;
      case AlertType.SYSTEM_DOWN:
        return `System downtime detected: ${value.toFixed(0)}s (threshold: ${threshold}s)`;
      default:
        return `Alert triggered for ${type}: ${value} (threshold: ${threshold})`;
    }
  }

  // Get active alerts
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Get all alerts
  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  // Clear all alerts (for testing)
  clearAlerts() {
    this.alerts = [];
  }

  // Get threshold configuration
  getThresholds(): AlertThreshold[] {
    return [...this.thresholds];
  }
}

describe('System Health Alerting System', () => {
  let alertingSystem: MockAlertingSystem;
  let alertCallback: ReturnType<typeof mock>;

  beforeEach(() => {
    alertingSystem = new MockAlertingSystem();
    alertCallback = mock(() => {});
    alertingSystem.onAlert(alertCallback);
  });

  afterEach(() => {
    alertingSystem.clearAlerts();
    alertCallback.mockClear();
  });

  describe('Alert Generation', () => {
    test('generates CPU usage alert when threshold exceeded', () => {
      // Configure CPU usage threshold
      alertingSystem.setThresholds([
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 80,
          duration: 60,
          enabled: true,
        }
      ]);

      // Simulate high CPU usage
      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: 85.5
      });

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].type).toBe(AlertType.CPU_USAGE);
      expect(activeAlerts[0].severity).toBe(AlertSeverity.HIGH);
      expect(activeAlerts[0].value).toBe(85.5);
      expect(activeAlerts[0].threshold).toBe(80);
      expect(activeAlerts[0].message).toContain('High CPU usage detected: 85.5%');
      expect(alertCallback).toHaveBeenCalledTimes(1);
    });

    test('generates memory usage alert when threshold exceeded', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.MEMORY_USAGE,
          severity: AlertSeverity.MEDIUM,
          threshold: 75,
          duration: 30,
          enabled: true,
        }
      ]);

      alertingSystem.checkMetrics({
        [AlertType.MEMORY_USAGE]: 82.3
      });

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].type).toBe(AlertType.MEMORY_USAGE);
      expect(activeAlerts[0].severity).toBe(AlertSeverity.MEDIUM);
      expect(activeAlerts[0].message).toContain('High memory usage detected: 82.3%');
    });

    test('generates API error rate alert when threshold exceeded', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.API_ERROR_RATE,
          severity: AlertSeverity.CRITICAL,
          threshold: 5,
          duration: 120,
          enabled: true,
        }
      ]);

      alertingSystem.checkMetrics({
        [AlertType.API_ERROR_RATE]: 7.8
      });

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].type).toBe(AlertType.API_ERROR_RATE);
      expect(activeAlerts[0].severity).toBe(AlertSeverity.CRITICAL);
      expect(activeAlerts[0].message).toContain('High API error rate detected: 7.80%');
    });

    test('generates database slow query alert when threshold exceeded', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.DATABASE_SLOW_QUERY,
          severity: AlertSeverity.HIGH,
          threshold: 1000,
          duration: 60,
          enabled: true,
        }
      ]);

      alertingSystem.checkMetrics({
        [AlertType.DATABASE_SLOW_QUERY]: 1500
      });

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].type).toBe(AlertType.DATABASE_SLOW_QUERY);
      expect(activeAlerts[0].message).toContain('Slow database queries detected: 1500ms');
    });

    test('does not generate alert when threshold not exceeded', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 80,
          duration: 60,
          enabled: true,
        }
      ]);

      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: 75.0
      });

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
      expect(alertCallback).not.toHaveBeenCalled();
    });

    test('does not generate alert when threshold disabled', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 80,
          duration: 60,
          enabled: false, // Disabled
        }
      ]);

      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: 90.0
      });

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
      expect(alertCallback).not.toHaveBeenCalled();
    });
  });

  describe('Alert Resolution', () => {
    test('resolves alert when metric returns to normal', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 80,
          duration: 60,
          enabled: true,
        }
      ]);

      // Generate alert
      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: 85.0
      });

      expect(alertingSystem.getActiveAlerts()).toHaveLength(1);

      // Metric returns to normal
      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: 70.0
      });

      const activeAlerts = alertingSystem.getActiveAlerts();
      const allAlerts = alertingSystem.getAllAlerts();

      expect(activeAlerts).toHaveLength(0);
      expect(allAlerts).toHaveLength(1);
      expect(allAlerts[0].resolved).toBe(true);
      expect(allAlerts[0].resolvedAt).toBeDefined();
    });

    test('does not generate duplicate alerts for same issue', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.MEMORY_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 80,
          duration: 60,
          enabled: true,
        }
      ]);

      // Generate initial alert
      alertingSystem.checkMetrics({
        [AlertType.MEMORY_USAGE]: 85.0
      });

      // Check again with same high value
      alertingSystem.checkMetrics({
        [AlertType.MEMORY_USAGE]: 87.0
      });

      // Should still have only one active alert
      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(alertCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple Alert Types', () => {
    test('handles multiple alert types simultaneously', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 80,
          duration: 60,
          enabled: true,
        },
        {
          type: AlertType.MEMORY_USAGE,
          severity: AlertSeverity.MEDIUM,
          threshold: 75,
          duration: 30,
          enabled: true,
        },
        {
          type: AlertType.API_ERROR_RATE,
          severity: AlertSeverity.CRITICAL,
          threshold: 5,
          duration: 120,
          enabled: true,
        }
      ]);

      // Trigger multiple alerts
      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: 85.0,
        [AlertType.MEMORY_USAGE]: 80.0,
        [AlertType.API_ERROR_RATE]: 7.5
      });

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(3);
      expect(alertCallback).toHaveBeenCalledTimes(3);

      // Verify each alert type
      const cpuAlert = activeAlerts.find(a => a.type === AlertType.CPU_USAGE);
      const memoryAlert = activeAlerts.find(a => a.type === AlertType.MEMORY_USAGE);
      const apiAlert = activeAlerts.find(a => a.type === AlertType.API_ERROR_RATE);

      expect(cpuAlert).toBeDefined();
      expect(cpuAlert?.severity).toBe(AlertSeverity.HIGH);
      expect(memoryAlert).toBeDefined();
      expect(memoryAlert?.severity).toBe(AlertSeverity.MEDIUM);
      expect(apiAlert).toBeDefined();
      expect(apiAlert?.severity).toBe(AlertSeverity.CRITICAL);
    });
  });

  describe('Alert Threshold Configuration', () => {
    test('allows updating threshold configurations', () => {
      const initialThresholds: AlertThreshold[] = [
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 80,
          duration: 60,
          enabled: true,
        }
      ];

      alertingSystem.setThresholds(initialThresholds);
      expect(alertingSystem.getThresholds()).toEqual(initialThresholds);

      // Update thresholds
      const updatedThresholds: AlertThreshold[] = [
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.CRITICAL,
          threshold: 90,
          duration: 30,
          enabled: true,
        },
        {
          type: AlertType.MEMORY_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 85,
          duration: 60,
          enabled: true,
        }
      ];

      alertingSystem.setThresholds(updatedThresholds);
      expect(alertingSystem.getThresholds()).toEqual(updatedThresholds);
    });

    test('validates different severity levels', () => {
      const thresholds: AlertThreshold[] = [
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.LOW,
          threshold: 60,
          duration: 300,
          enabled: true,
        },
        {
          type: AlertType.MEMORY_USAGE,
          severity: AlertSeverity.MEDIUM,
          threshold: 70,
          duration: 180,
          enabled: true,
        },
        {
          type: AlertType.API_ERROR_RATE,
          severity: AlertSeverity.HIGH,
          threshold: 3,
          duration: 120,
          enabled: true,
        },
        {
          type: AlertType.SYSTEM_DOWN,
          severity: AlertSeverity.CRITICAL,
          threshold: 30,
          duration: 60,
          enabled: true,
        }
      ];

      alertingSystem.setThresholds(thresholds);

      // Trigger alerts for each severity level
      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: 65,
        [AlertType.MEMORY_USAGE]: 75,
        [AlertType.API_ERROR_RATE]: 4,
        [AlertType.SYSTEM_DOWN]: 45
      });

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(4);

      const severities = activeAlerts.map(alert => alert.severity);
      expect(severities).toContain(AlertSeverity.LOW);
      expect(severities).toContain(AlertSeverity.MEDIUM);
      expect(severities).toContain(AlertSeverity.HIGH);
      expect(severities).toContain(AlertSeverity.CRITICAL);
    });
  });

  describe('Edge Cases', () => {
    test('handles missing metrics gracefully', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 80,
          duration: 60,
          enabled: true,
        }
      ]);

      // Check with empty metrics
      alertingSystem.checkMetrics({});

      expect(alertingSystem.getActiveAlerts()).toHaveLength(0);
      expect(alertCallback).not.toHaveBeenCalled();
    });

    test('handles zero and negative values', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 80,
          duration: 60,
          enabled: true,
        }
      ]);

      // Check with zero value
      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: 0
      });

      expect(alertingSystem.getActiveAlerts()).toHaveLength(0);

      // Check with negative value (shouldn't trigger alert)
      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: -5
      });

      expect(alertingSystem.getActiveAlerts()).toHaveLength(0);
    });

    test('handles exact threshold values', () => {
      alertingSystem.setThresholds([
        {
          type: AlertType.CPU_USAGE,
          severity: AlertSeverity.HIGH,
          threshold: 80,
          duration: 60,
          enabled: true,
        }
      ]);

      // Check with exact threshold value (should not trigger)
      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: 80
      });

      expect(alertingSystem.getActiveAlerts()).toHaveLength(0);

      // Check with value just above threshold (should trigger)
      alertingSystem.checkMetrics({
        [AlertType.CPU_USAGE]: 80.1
      });

      expect(alertingSystem.getActiveAlerts()).toHaveLength(1);
    });
  });
});