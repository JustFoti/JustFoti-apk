/**
 * Tests for Pattern Registry System
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { PatternRegistry } from '../../app/lib/decoders/pattern-registry';
import { OLD_FORMAT_PATTERN, NEW_FORMAT_PATTERN, ALL_PATTERNS } from '../../app/lib/decoders/pattern-definitions';
import { PatternType } from '../../app/lib/decoders/types';

describe('Pattern Registry', () => {
  let registry: PatternRegistry;

  beforeEach(() => {
    registry = new PatternRegistry();
  });

  describe('register', () => {
    test('should register a pattern definition', () => {
      registry.register(OLD_FORMAT_PATTERN);
      expect(registry.has(PatternType.OLD_FORMAT)).toBe(true);
    });

    test('should throw error when registering duplicate pattern type', () => {
      registry.register(OLD_FORMAT_PATTERN);
      expect(() => registry.register(OLD_FORMAT_PATTERN)).toThrow(
        'Pattern type old_format is already registered'
      );
    });

    test('should register multiple different patterns', () => {
      registry.register(OLD_FORMAT_PATTERN);
      registry.register(NEW_FORMAT_PATTERN);
      expect(registry.size()).toBe(2);
    });
  });

  describe('get', () => {
    test('should retrieve registered pattern', () => {
      registry.register(OLD_FORMAT_PATTERN);
      const pattern = registry.get(PatternType.OLD_FORMAT);
      expect(pattern).toBeDefined();
      expect(pattern?.type).toBe(PatternType.OLD_FORMAT);
      expect(pattern?.name).toBe('OLD Format (Reverse-Hex-Shift)');
    });

    test('should return undefined for unregistered pattern', () => {
      const pattern = registry.get(PatternType.OLD_FORMAT);
      expect(pattern).toBeUndefined();
    });
  });

  describe('has', () => {
    test('should return true for registered pattern', () => {
      registry.register(OLD_FORMAT_PATTERN);
      expect(registry.has(PatternType.OLD_FORMAT)).toBe(true);
    });

    test('should return false for unregistered pattern', () => {
      expect(registry.has(PatternType.OLD_FORMAT)).toBe(false);
    });
  });

  describe('getAllTypes', () => {
    test('should return empty array when no patterns registered', () => {
      expect(registry.getAllTypes()).toEqual([]);
    });

    test('should return all registered pattern types', () => {
      registry.register(OLD_FORMAT_PATTERN);
      registry.register(NEW_FORMAT_PATTERN);
      const types = registry.getAllTypes();
      expect(types).toContain(PatternType.OLD_FORMAT);
      expect(types).toContain(PatternType.NEW_FORMAT);
      expect(types.length).toBe(2);
    });
  });

  describe('getAll', () => {
    test('should return empty array when no patterns registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    test('should return all registered pattern definitions', () => {
      registry.register(OLD_FORMAT_PATTERN);
      registry.register(NEW_FORMAT_PATTERN);
      const patterns = registry.getAll();
      expect(patterns.length).toBe(2);
      expect(patterns).toContainEqual(OLD_FORMAT_PATTERN);
      expect(patterns).toContainEqual(NEW_FORMAT_PATTERN);
    });
  });

  describe('unregister', () => {
    test('should unregister a pattern', () => {
      registry.register(OLD_FORMAT_PATTERN);
      expect(registry.has(PatternType.OLD_FORMAT)).toBe(true);
      
      const result = registry.unregister(PatternType.OLD_FORMAT);
      expect(result).toBe(true);
      expect(registry.has(PatternType.OLD_FORMAT)).toBe(false);
    });

    test('should return false when unregistering non-existent pattern', () => {
      const result = registry.unregister(PatternType.OLD_FORMAT);
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    test('should clear all registered patterns', () => {
      registry.register(OLD_FORMAT_PATTERN);
      registry.register(NEW_FORMAT_PATTERN);
      expect(registry.size()).toBe(2);
      
      registry.clear();
      expect(registry.size()).toBe(0);
      expect(registry.has(PatternType.OLD_FORMAT)).toBe(false);
      expect(registry.has(PatternType.NEW_FORMAT)).toBe(false);
    });
  });

  describe('size', () => {
    test('should return 0 for empty registry', () => {
      expect(registry.size()).toBe(0);
    });

    test('should return correct count of registered patterns', () => {
      expect(registry.size()).toBe(0);
      registry.register(OLD_FORMAT_PATTERN);
      expect(registry.size()).toBe(1);
      registry.register(NEW_FORMAT_PATTERN);
      expect(registry.size()).toBe(2);
    });
  });
});

describe('Pattern Definitions', () => {
  describe('OLD_FORMAT_PATTERN', () => {
    test('should have correct type', () => {
      expect(OLD_FORMAT_PATTERN.type).toBe(PatternType.OLD_FORMAT);
    });

    test('should have name and description', () => {
      expect(OLD_FORMAT_PATTERN.name).toBe('OLD Format (Reverse-Hex-Shift)');
      expect(OLD_FORMAT_PATTERN.description).toContain('reversal');
    });

    test('should have characteristics array', () => {
      expect(Array.isArray(OLD_FORMAT_PATTERN.characteristics)).toBe(true);
      expect(OLD_FORMAT_PATTERN.characteristics.length).toBeGreaterThan(0);
    });

    test('should have decoder function', () => {
      expect(typeof OLD_FORMAT_PATTERN.decoder).toBe('function');
    });

    test('should have detector function', () => {
      expect(typeof OLD_FORMAT_PATTERN.detector).toBe('function');
    });

    test('should have examples array', () => {
      expect(Array.isArray(OLD_FORMAT_PATTERN.examples)).toBe(true);
      expect(OLD_FORMAT_PATTERN.examples.length).toBeGreaterThan(0);
    });
  });

  describe('NEW_FORMAT_PATTERN', () => {
    test('should have correct type', () => {
      expect(NEW_FORMAT_PATTERN.type).toBe(PatternType.NEW_FORMAT);
    });

    test('should have name and description', () => {
      expect(NEW_FORMAT_PATTERN.name).toBe('NEW Format (XOR + Base64/Hex)');
      expect(NEW_FORMAT_PATTERN.description).toContain('XOR');
    });

    test('should have characteristics array', () => {
      expect(Array.isArray(NEW_FORMAT_PATTERN.characteristics)).toBe(true);
      expect(NEW_FORMAT_PATTERN.characteristics.length).toBeGreaterThan(0);
    });

    test('should have decoder function', () => {
      expect(typeof NEW_FORMAT_PATTERN.decoder).toBe('function');
    });

    test('should have detector function', () => {
      expect(typeof NEW_FORMAT_PATTERN.detector).toBe('function');
    });

    test('should have examples array', () => {
      expect(Array.isArray(NEW_FORMAT_PATTERN.examples)).toBe(true);
      expect(NEW_FORMAT_PATTERN.examples.length).toBeGreaterThan(0);
    });
  });

  describe('ALL_PATTERNS', () => {
    test('should contain all pattern definitions', () => {
      expect(ALL_PATTERNS.length).toBe(2);
      expect(ALL_PATTERNS).toContain(OLD_FORMAT_PATTERN);
      expect(ALL_PATTERNS).toContain(NEW_FORMAT_PATTERN);
    });
  });
});
