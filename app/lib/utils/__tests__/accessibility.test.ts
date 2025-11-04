/**
 * Accessibility Utilities Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  getContrastRatio,
  meetsContrastRequirement,
  isActivationKey,
  isArrowKey,
  KeyboardKeys,
  generateAriaId,
} from '../accessibility';

describe('Accessibility Utilities', () => {
  describe('getContrastRatio', () => {
    test('calculates contrast ratio between black and white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBe(21); // Maximum contrast
    });

    test('calculates contrast ratio for similar colors', () => {
      const ratio = getContrastRatio('#000000', '#111111');
      expect(ratio).toBeLessThan(2);
    });

    test('calculates contrast ratio for brand colors', () => {
      const ratio = getContrastRatio('#0a0a0f', '#ffffff');
      expect(ratio).toBeGreaterThan(15); // Should be high contrast
    });
  });

  describe('meetsContrastRequirement', () => {
    test('validates WCAG AA normal text requirement (4.5:1)', () => {
      expect(meetsContrastRequirement(4.5, 'normal')).toBe(true);
      expect(meetsContrastRequirement(4.4, 'normal')).toBe(false);
      expect(meetsContrastRequirement(7, 'normal')).toBe(true);
    });

    test('validates WCAG AA large text requirement (3:1)', () => {
      expect(meetsContrastRequirement(3, 'large')).toBe(true);
      expect(meetsContrastRequirement(2.9, 'large')).toBe(false);
      expect(meetsContrastRequirement(4.5, 'large')).toBe(true);
    });
  });

  describe('Keyboard navigation helpers', () => {
    test('identifies activation keys', () => {
      expect(isActivationKey(KeyboardKeys.ENTER)).toBe(true);
      expect(isActivationKey(KeyboardKeys.SPACE)).toBe(true);
      expect(isActivationKey(KeyboardKeys.ESCAPE)).toBe(false);
      expect(isActivationKey('a')).toBe(false);
    });

    test('identifies arrow keys', () => {
      expect(isArrowKey(KeyboardKeys.ARROW_UP)).toBe(true);
      expect(isArrowKey(KeyboardKeys.ARROW_DOWN)).toBe(true);
      expect(isArrowKey(KeyboardKeys.ARROW_LEFT)).toBe(true);
      expect(isArrowKey(KeyboardKeys.ARROW_RIGHT)).toBe(true);
      expect(isArrowKey(KeyboardKeys.ENTER)).toBe(false);
      expect(isArrowKey('a')).toBe(false);
    });
  });

  describe('generateAriaId', () => {
    test('generates unique IDs', () => {
      const id1 = generateAriaId('test');
      const id2 = generateAriaId('test');
      expect(id1).not.toBe(id2);
      expect(id1).toContain('test-');
      expect(id2).toContain('test-');
    });

    test('uses default prefix when not provided', () => {
      const id = generateAriaId();
      expect(id).toContain('aria-');
    });
  });
});
