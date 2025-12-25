/**
 * Property-Based Test: Audit Logging
 * Feature: admin-panel-unified-refactor, Property 40: Audit logging
 * Validates: Requirements 9.3
 * 
 * Property: For any administrative action performed,
 * the system should create a corresponding audit log entry with timestamp, user, and action details
 */

import * as fc from 'fast-check';

// Administrative action types
type AdminActionType = 
  | 'user_view' | 'user_edit' | 'user_delete' | 'user_export'
  | 'analytics_view' | 'analytics_export' 
  | 'content_moderate' | 'content_delete'
  | 'system_settings_change' | 'system_health_check'
  | 'bot_detection_review' | 'audit_log_view'
  | 'login' | 'logout' | 'password_change';

// Administrative action context
interface AdminAction {
  type: AdminActionType;
  userId: string;
  username: string;
  targetResource?: string;
  targetId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  sessionId: string;
}

// Audit log entry
interface AuditLogEntry {
  id: string;
  actionType: AdminActionType;
  userId: string;
  username: string;
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  targetResource?: string;
  targetId?: string;
  actionDetails: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  duration?: number;
}

// Audit logging system
class AuditLogger {
  private static logs: AuditLogEntry[] = [];
  private static logIdCounter = 1;

  static logAction(action: AdminAction, success: boolean = true, errorMessage?: string, duration?: number): AuditLogEntry {
    const logEntry: AuditLogEntry = {
      id: `audit_${this.logIdCounter++}`,
      actionType: action.type,
      userId: action.userId,
      username: action.username,
      timestamp: action.timestamp,
      ipAddress: action.ipAddress,
      userAgent: action.userAgent,
      sessionId: action.sessionId,
      targetResource: action.targetResource,
      targetId: action.targetId,
      actionDetails: { ...action.details },
      success,
      errorMessage,
      duration
    };

    this.logs.push(logEntry);
    return logEntry;
  }

  static getLogsByUser(userId: string): AuditLogEntry[] {
    return this.logs.filter(log => log.userId === userId);
  }

  static getLogsByAction(actionType: AdminActionType): AuditLogEntry[] {
    return this.logs.filter(log => log.actionType === actionType);
  }

  static getLogsByTimeRange(startTime: number, endTime: number): AuditLogEntry[] {
    return this.logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
  }

  static getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  static clearLogs(): void {
    this.logs = [];
    this.logIdCounter = 1;
  }

  static validateLogEntry(entry: AuditLogEntry): {
    valid: boolean;
    missingFields: string[];
    invalidFields: string[];
  } {
    const requiredFields = ['id', 'actionType', 'userId', 'username', 'timestamp', 'ipAddress', 'sessionId'];
    const missingFields: string[] = [];
    const invalidFields: string[] = [];

    // Check required fields
    for (const field of requiredFields) {
      if (!(field in entry) || entry[field as keyof AuditLogEntry] === undefined || entry[field as keyof AuditLogEntry] === null) {
        missingFields.push(field);
      }
    }

    // Validate field types and formats
    if (entry.id && typeof entry.id !== 'string') invalidFields.push('id');
    if (entry.userId && typeof entry.userId !== 'string') invalidFields.push('userId');
    if (entry.username && typeof entry.username !== 'string') invalidFields.push('username');
    if (entry.timestamp && (typeof entry.timestamp !== 'number' || entry.timestamp <= 0)) invalidFields.push('timestamp');
    if (entry.ipAddress && typeof entry.ipAddress !== 'string') invalidFields.push('ipAddress');
    if (entry.sessionId && typeof entry.sessionId !== 'string') invalidFields.push('sessionId');
    if (entry.success !== undefined && typeof entry.success !== 'boolean') invalidFields.push('success');

    return {
      valid: missingFields.length === 0 && invalidFields.length === 0,
      missingFields,
      invalidFields
    };
  }
}

// Generators for property-based testing
const generateAdminActionType = (): fc.Arbitrary<AdminActionType> => 
  fc.constantFrom(
    'user_view', 'user_edit', 'user_delete', 'user_export',
    'analytics_view', 'analytics_export',
    'content_moderate', 'content_delete',
    'system_settings_change', 'system_health_check',
    'bot_detection_review', 'audit_log_view',
    'login', 'logout', 'password_change'
  );

const generateAdminAction = (): fc.Arbitrary<AdminAction> => fc.record({
  type: generateAdminActionType(),
  userId: fc.string({ minLength: 5, maxLength: 20 }),
  username: fc.string({ minLength: 3, maxLength: 20 }),
  targetResource: fc.option(fc.constantFrom('user', 'content', 'system', 'analytics'), { nil: undefined }),
  targetId: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: undefined }),
  details: fc.record({
    action: fc.string({ minLength: 5, maxLength: 50 }),
    previousValue: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    newValue: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    reason: fc.option(fc.string({ minLength: 5, maxLength: 200 }), { nil: undefined })
  }),
  ipAddress: fc.ipV4(),
  userAgent: fc.string({ minLength: 20, maxLength: 200 }),
  timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }), // Last 24 hours
  sessionId: fc.string({ minLength: 10, maxLength: 50 })
});

describe('Audit Logging Property Tests', () => {
  beforeEach(() => {
    AuditLogger.clearLogs();
  });

  describe('Property 40: Audit logging', () => {
    test('should create audit log entry for every administrative action', () => {
      fc.assert(
        fc.property(generateAdminAction(), (action) => {
          // Clear logs before each property test iteration
          AuditLogger.clearLogs();
          
          const logEntry = AuditLogger.logAction(action);
          
          // Verify log entry was created
          expect(logEntry).toBeDefined();
          expect(logEntry.id).toBeDefined();
          expect(typeof logEntry.id).toBe('string');
          
          // Verify all required fields are present
          expect(logEntry.actionType).toBe(action.type);
          expect(logEntry.userId).toBe(action.userId);
          expect(logEntry.username).toBe(action.username);
          expect(logEntry.timestamp).toBe(action.timestamp);
          expect(logEntry.ipAddress).toBe(action.ipAddress);
          expect(logEntry.userAgent).toBe(action.userAgent);
          expect(logEntry.sessionId).toBe(action.sessionId);
          
          // Verify optional fields are preserved
          expect(logEntry.targetResource).toBe(action.targetResource);
          expect(logEntry.targetId).toBe(action.targetId);
          expect(logEntry.actionDetails).toEqual(action.details);
          
          // Verify log entry is stored
          const allLogs = AuditLogger.getAllLogs();
          expect(allLogs).toContain(logEntry);
          expect(allLogs.length).toBe(1); // Should only have this one log
        }),
        { numRuns: 100 }
      );
    });

    test('should include timestamp, user, and action details in every log entry', () => {
      fc.assert(
        fc.property(generateAdminAction(), (action) => {
          // Clear logs before each property test iteration
          AuditLogger.clearLogs();
          
          const logEntry = AuditLogger.logAction(action);
          
          // Verify timestamp is present and valid
          expect(logEntry.timestamp).toBeDefined();
          expect(typeof logEntry.timestamp).toBe('number');
          expect(logEntry.timestamp).toBeGreaterThan(0);
          expect(logEntry.timestamp).toBeLessThanOrEqual(Date.now());
          
          // Verify user information is present
          expect(logEntry.userId).toBeDefined();
          expect(typeof logEntry.userId).toBe('string');
          expect(logEntry.userId.length).toBeGreaterThan(0);
          expect(logEntry.username).toBeDefined();
          expect(typeof logEntry.username).toBe('string');
          expect(logEntry.username.length).toBeGreaterThan(0);
          
          // Verify action details are present
          expect(logEntry.actionType).toBeDefined();
          expect(typeof logEntry.actionType).toBe('string');
          expect(logEntry.actionDetails).toBeDefined();
          expect(typeof logEntry.actionDetails).toBe('object');
        }),
        { numRuns: 100 }
      );
    });

    test('should handle both successful and failed actions', () => {
      fc.assert(
        fc.property(
          generateAdminAction(),
          fc.boolean(),
          fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
          (action, success, errorMessage) => {
            // Clear logs before each property test iteration
            AuditLogger.clearLogs();
            
            const logEntry = AuditLogger.logAction(action, success, errorMessage);
            
            expect(logEntry.success).toBe(success);
            
            if (!success && errorMessage) {
              expect(logEntry.errorMessage).toBe(errorMessage);
            } else if (success) {
              // Only check for undefined if success is true and no error message provided
              if (!errorMessage) {
                expect(logEntry.errorMessage).toBeUndefined();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow querying logs by user', () => {
      fc.assert(
        fc.property(
          fc.array(generateAdminAction(), { minLength: 2, maxLength: 10 }),
          (actions) => {
            // Clear logs before each property test iteration
            AuditLogger.clearLogs();
            
            // Log all actions
            const logEntries = actions.map(action => AuditLogger.logAction(action));
            
            // Test querying by each unique user
            const uniqueUserIds = [...new Set(actions.map(a => a.userId))];
            
            for (const userId of uniqueUserIds) {
              const userLogs = AuditLogger.getLogsByUser(userId);
              const expectedCount = actions.filter(a => a.userId === userId).length;
              
              expect(userLogs.length).toBe(expectedCount);
              expect(userLogs.every(log => log.userId === userId)).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should allow querying logs by action type', () => {
      fc.assert(
        fc.property(
          fc.array(generateAdminAction(), { minLength: 2, maxLength: 10 }),
          (actions) => {
            // Clear logs before each property test iteration
            AuditLogger.clearLogs();
            
            // Log all actions
            actions.forEach(action => AuditLogger.logAction(action));
            
            // Test querying by each unique action type
            const uniqueActionTypes = [...new Set(actions.map(a => a.type))];
            
            for (const actionType of uniqueActionTypes) {
              const actionLogs = AuditLogger.getLogsByAction(actionType);
              const expectedCount = actions.filter(a => a.type === actionType).length;
              
              expect(actionLogs.length).toBe(expectedCount);
              expect(actionLogs.every(log => log.actionType === actionType)).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should allow querying logs by time range', () => {
      fc.assert(
        fc.property(
          fc.array(generateAdminAction(), { minLength: 3, maxLength: 8 }),
          (actions) => {
            // Clear logs before each property test iteration
            AuditLogger.clearLogs();
            
            // Log all actions
            actions.forEach(action => AuditLogger.logAction(action));
            
            // Get timestamp range
            const timestamps = actions.map(a => a.timestamp);
            const minTime = Math.min(...timestamps);
            const maxTime = Math.max(...timestamps);
            const midTime = Math.floor((minTime + maxTime) / 2);
            
            // Query logs in different time ranges
            const allLogs = AuditLogger.getLogsByTimeRange(minTime, maxTime);
            const firstHalfLogs = AuditLogger.getLogsByTimeRange(minTime, midTime);
            const secondHalfLogs = AuditLogger.getLogsByTimeRange(midTime, maxTime);
            
            expect(allLogs.length).toBe(actions.length);
            expect(allLogs.every(log => log.timestamp >= minTime && log.timestamp <= maxTime)).toBe(true);
            expect(firstHalfLogs.every(log => log.timestamp >= minTime && log.timestamp <= midTime)).toBe(true);
            expect(secondHalfLogs.every(log => log.timestamp >= midTime && log.timestamp <= maxTime)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should validate log entry completeness and format', () => {
      fc.assert(
        fc.property(generateAdminAction(), (action) => {
          // Clear logs before each property test iteration
          AuditLogger.clearLogs();
          
          const logEntry = AuditLogger.logAction(action);
          const validation = AuditLogger.validateLogEntry(logEntry);
          
          expect(validation.valid).toBe(true);
          expect(validation.missingFields).toEqual([]);
          expect(validation.invalidFields).toEqual([]);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle actions with minimal details', () => {
      const minimalAction: AdminAction = {
        type: 'login',
        userId: 'user1',
        username: 'testuser',
        details: {},
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        timestamp: Date.now(),
        sessionId: 'session123'
      };

      const logEntry = AuditLogger.logAction(minimalAction);
      const validation = AuditLogger.validateLogEntry(logEntry);
      
      expect(validation.valid).toBe(true);
      expect(logEntry.actionDetails).toEqual({});
    });

    test('should handle actions with complex details', () => {
      const complexAction: AdminAction = {
        type: 'user_edit',
        userId: 'admin1',
        username: 'adminuser',
        targetResource: 'user',
        targetId: 'target123',
        details: {
          action: 'update_profile',
          previousValue: JSON.stringify({ name: 'Old Name', email: 'old@example.com' }),
          newValue: JSON.stringify({ name: 'New Name', email: 'new@example.com' }),
          reason: 'User requested profile update',
          additionalData: {
            nested: { field: 'value' },
            array: [1, 2, 3],
            boolean: true
          }
        },
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: Date.now(),
        sessionId: 'complex_session_456'
      };

      const logEntry = AuditLogger.logAction(complexAction);
      const validation = AuditLogger.validateLogEntry(logEntry);
      
      expect(validation.valid).toBe(true);
      expect(logEntry.actionDetails).toEqual(complexAction.details);
      expect(logEntry.targetResource).toBe('user');
      expect(logEntry.targetId).toBe('target123');
    });

    test('should detect invalid log entries', () => {
      const invalidEntry: Partial<AuditLogEntry> = {
        id: 'test',
        actionType: 'user_view',
        // Missing required fields: userId, username, timestamp, ipAddress, sessionId
        success: true
      };

      const validation = AuditLogger.validateLogEntry(invalidEntry as AuditLogEntry);
      
      expect(validation.valid).toBe(false);
      expect(validation.missingFields.length).toBeGreaterThan(0);
      expect(validation.missingFields).toContain('userId');
      expect(validation.missingFields).toContain('username');
      expect(validation.missingFields).toContain('timestamp');
    });
  });
});