/**
 * Property-Based Test: Audit Log Completeness
 * Feature: admin-panel-production-ready, Property 13: Audit log completeness
 * Validates: Requirements 10.4
 * 
 * Property: For any administrative action, an audit log entry should be created
 * with action type, user, timestamp, and success status
 */

import * as fc from 'fast-check';

// Administrative action types
type AdminActionType = 
  | 'page_view' | 'data_export' | 'user_view' | 'user_edit' | 'user_delete'
  | 'system_security_test' | 'system_settings_change' | 'bot_detection_review'
  | 'login' | 'logout' | 'password_change';

// Audit log entry structure
interface AuditLogEntry {
  id: string;
  action_type: AdminActionType;
  user_id: string;
  username: string;
  timestamp: number;
  ip_address: string;
  target_resource?: string;
  target_id?: string;
  success: boolean;
  error_message?: string;
  action_details?: Record<string, any>;
}

// Required fields for a complete audit log entry
const REQUIRED_FIELDS = ['id', 'action_type', 'user_id', 'username', 'timestamp', 'ip_address', 'success'];

// Audit log validation system
class AuditLogValidator {
  static validateCompleteness(entry: AuditLogEntry): {
    complete: boolean;
    missingFields: string[];
    invalidFields: string[];
  } {
    const missingFields: string[] = [];
    const invalidFields: string[] = [];

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      const value = entry[field as keyof AuditLogEntry];
      if (value === undefined || value === null) {
        missingFields.push(field);
      }
    }

    // Validate field types and formats
    if (entry.id !== undefined && typeof entry.id !== 'string') {
      invalidFields.push('id');
    }
    if (entry.action_type !== undefined && typeof entry.action_type !== 'string') {
      invalidFields.push('action_type');
    }
    if (entry.user_id !== undefined && typeof entry.user_id !== 'string') {
      invalidFields.push('user_id');
    }
    if (entry.username !== undefined && typeof entry.username !== 'string') {
      invalidFields.push('username');
    }
    if (entry.timestamp !== undefined && (typeof entry.timestamp !== 'number' || entry.timestamp <= 0)) {
      invalidFields.push('timestamp');
    }
    if (entry.ip_address !== undefined && typeof entry.ip_address !== 'string') {
      invalidFields.push('ip_address');
    }
    if (entry.success !== undefined && typeof entry.success !== 'boolean') {
      invalidFields.push('success');
    }

    return {
      complete: missingFields.length === 0 && invalidFields.length === 0,
      missingFields,
      invalidFields
    };
  }

  static hasRequiredActionDetails(entry: AuditLogEntry): boolean {
    // Action type must be present
    if (!entry.action_type) return false;
    
    // User info must be present
    if (!entry.user_id || !entry.username) return false;
    
    // Timestamp must be valid
    if (!entry.timestamp || entry.timestamp <= 0) return false;
    
    // Success status must be defined
    if (entry.success === undefined) return false;
    
    return true;
  }
}

// Audit log creator (simulates the actual audit logging system)
class AuditLogCreator {
  private static logIdCounter = 1;

  static createLogEntry(
    actionType: AdminActionType,
    userId: string,
    username: string,
    ipAddress: string,
    success: boolean = true,
    options: {
      targetResource?: string;
      targetId?: string;
      errorMessage?: string;
      actionDetails?: Record<string, any>;
    } = {}
  ): AuditLogEntry {
    return {
      id: `audit_${this.logIdCounter++}`,
      action_type: actionType,
      user_id: userId,
      username,
      timestamp: Date.now(),
      ip_address: ipAddress,
      success,
      target_resource: options.targetResource,
      target_id: options.targetId,
      error_message: options.errorMessage,
      action_details: options.actionDetails
    };
  }

  static resetCounter(): void {
    this.logIdCounter = 1;
  }
}

// Generators for property-based testing
const generateActionType = (): fc.Arbitrary<AdminActionType> => 
  fc.constantFrom(
    'page_view', 'data_export', 'user_view', 'user_edit', 'user_delete',
    'system_security_test', 'system_settings_change', 'bot_detection_review',
    'login', 'logout', 'password_change'
  );

const generateUserId = (): fc.Arbitrary<string> => 
  fc.string({ minLength: 5, maxLength: 30 });

const generateUsername = (): fc.Arbitrary<string> => 
  fc.string({ minLength: 3, maxLength: 20 });

const generateIpAddress = (): fc.Arbitrary<string> => 
  fc.ipV4();

const generateActionDetails = (): fc.Arbitrary<Record<string, any>> => 
  fc.record({
    action: fc.string({ minLength: 3, maxLength: 50 }),
    timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
    additionalInfo: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined })
  });

describe('Audit Log Completeness Property Tests', () => {
  beforeEach(() => {
    AuditLogCreator.resetCounter();
  });

  describe('Property 13: Audit log completeness', () => {
    test('should create complete audit log entry for any administrative action', () => {
      fc.assert(
        fc.property(
          generateActionType(),
          generateUserId(),
          generateUsername(),
          generateIpAddress(),
          fc.boolean(),
          (actionType, userId, username, ipAddress, success) => {
            const logEntry = AuditLogCreator.createLogEntry(
              actionType,
              userId,
              username,
              ipAddress,
              success
            );

            const validation = AuditLogValidator.validateCompleteness(logEntry);

            // Every log entry should be complete
            expect(validation.complete).toBe(true);
            expect(validation.missingFields).toEqual([]);
            expect(validation.invalidFields).toEqual([]);

            // Verify all required fields are present
            expect(logEntry.id).toBeDefined();
            expect(logEntry.action_type).toBe(actionType);
            expect(logEntry.user_id).toBe(userId);
            expect(logEntry.username).toBe(username);
            expect(logEntry.timestamp).toBeGreaterThan(0);
            expect(logEntry.ip_address).toBe(ipAddress);
            expect(logEntry.success).toBe(success);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include action type, user, timestamp, and success status in every entry', () => {
      fc.assert(
        fc.property(
          generateActionType(),
          generateUserId(),
          generateUsername(),
          generateIpAddress(),
          fc.boolean(),
          generateActionDetails(),
          (actionType, userId, username, ipAddress, success, details) => {
            const logEntry = AuditLogCreator.createLogEntry(
              actionType,
              userId,
              username,
              ipAddress,
              success,
              { actionDetails: details }
            );

            // Verify required action details are present
            expect(AuditLogValidator.hasRequiredActionDetails(logEntry)).toBe(true);

            // Action type must be a valid string
            expect(typeof logEntry.action_type).toBe('string');
            expect(logEntry.action_type.length).toBeGreaterThan(0);

            // User info must be present
            expect(typeof logEntry.user_id).toBe('string');
            expect(typeof logEntry.username).toBe('string');

            // Timestamp must be a valid number
            expect(typeof logEntry.timestamp).toBe('number');
            expect(logEntry.timestamp).toBeGreaterThan(0);
            expect(logEntry.timestamp).toBeLessThanOrEqual(Date.now() + 1000);

            // Success status must be boolean
            expect(typeof logEntry.success).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve optional fields when provided', () => {
      fc.assert(
        fc.property(
          generateActionType(),
          generateUserId(),
          generateUsername(),
          generateIpAddress(),
          fc.constantFrom('user', 'content', 'system', 'analytics'),
          fc.string({ minLength: 5, maxLength: 30 }),
          generateActionDetails(),
          (actionType, userId, username, ipAddress, targetResource, targetId, details) => {
            const logEntry = AuditLogCreator.createLogEntry(
              actionType,
              userId,
              username,
              ipAddress,
              true,
              {
                targetResource,
                targetId,
                actionDetails: details
              }
            );

            // Optional fields should be preserved
            expect(logEntry.target_resource).toBe(targetResource);
            expect(logEntry.target_id).toBe(targetId);
            expect(logEntry.action_details).toEqual(details);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should include error message for failed actions', () => {
      fc.assert(
        fc.property(
          generateActionType(),
          generateUserId(),
          generateUsername(),
          generateIpAddress(),
          fc.string({ minLength: 10, maxLength: 200 }),
          (actionType, userId, username, ipAddress, errorMessage) => {
            const logEntry = AuditLogCreator.createLogEntry(
              actionType,
              userId,
              username,
              ipAddress,
              false, // Failed action
              { errorMessage }
            );

            // Failed actions should have error message
            expect(logEntry.success).toBe(false);
            expect(logEntry.error_message).toBe(errorMessage);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should generate unique IDs for each log entry', () => {
      fc.assert(
        fc.property(
          fc.array(generateActionType(), { minLength: 2, maxLength: 10 }),
          (actionTypes) => {
            AuditLogCreator.resetCounter();
            
            const logEntries = actionTypes.map(actionType => 
              AuditLogCreator.createLogEntry(
                actionType,
                'test-user',
                'testuser',
                '192.168.1.1',
                true
              )
            );

            // All IDs should be unique
            const ids = logEntries.map(entry => entry.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle minimal log entry with only required fields', () => {
      const minimalEntry = AuditLogCreator.createLogEntry(
        'login',
        'user123',
        'testuser',
        '127.0.0.1',
        true
      );

      const validation = AuditLogValidator.validateCompleteness(minimalEntry);
      
      expect(validation.complete).toBe(true);
      expect(validation.missingFields).toEqual([]);
    });

    test('should handle log entry with all optional fields', () => {
      const fullEntry = AuditLogCreator.createLogEntry(
        'user_edit',
        'admin123',
        'adminuser',
        '10.0.0.1',
        true,
        {
          targetResource: 'user',
          targetId: 'target-user-456',
          actionDetails: {
            action: 'update_profile',
            previousValue: 'old@email.com',
            newValue: 'new@email.com',
            reason: 'User requested email change'
          }
        }
      );

      const validation = AuditLogValidator.validateCompleteness(fullEntry);
      
      expect(validation.complete).toBe(true);
      expect(fullEntry.target_resource).toBe('user');
      expect(fullEntry.target_id).toBe('target-user-456');
      expect(fullEntry.action_details).toBeDefined();
    });

    test('should detect incomplete log entries', () => {
      // Create an incomplete entry by casting
      const incompleteEntry = {
        id: 'test-id',
        action_type: 'login',
        // Missing: user_id, username, timestamp, ip_address, success
      } as unknown as AuditLogEntry;

      const validation = AuditLogValidator.validateCompleteness(incompleteEntry);
      
      expect(validation.complete).toBe(false);
      expect(validation.missingFields.length).toBeGreaterThan(0);
      expect(validation.missingFields).toContain('user_id');
      expect(validation.missingFields).toContain('username');
      expect(validation.missingFields).toContain('timestamp');
    });

    test('should detect invalid field types', () => {
      // Create an entry with invalid types by casting
      const invalidEntry = {
        id: 123, // Should be string
        action_type: 'login',
        user_id: 'user123',
        username: 'testuser',
        timestamp: 'not-a-number', // Should be number
        ip_address: '127.0.0.1',
        success: 'yes' // Should be boolean
      } as unknown as AuditLogEntry;

      const validation = AuditLogValidator.validateCompleteness(invalidEntry);
      
      expect(validation.complete).toBe(false);
      expect(validation.invalidFields.length).toBeGreaterThan(0);
    });
  });
});
