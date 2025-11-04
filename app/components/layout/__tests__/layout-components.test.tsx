/**
 * Layout Components Tests
 * 
 * Basic tests for Navigation, Footer, and PageTransition components
 */

import { describe, test, expect } from 'bun:test';

describe('Layout Components', () => {
  describe('Navigation Component', () => {
    test('should export Navigation component', () => {
      const { Navigation } = require('../Navigation');
      expect(Navigation).toBeDefined();
      expect(typeof Navigation).toBe('function');
    });
  });

  describe('Footer Component', () => {
    test('should export Footer component', () => {
      const { Footer } = require('../Footer');
      expect(Footer).toBeDefined();
      expect(typeof Footer).toBe('function');
    });
  });

  describe('PageTransition Component', () => {
    test('should export PageTransition component', () => {
      const { PageTransition } = require('../PageTransition');
      expect(PageTransition).toBeDefined();
      expect(typeof PageTransition).toBe('function');
    });

    test('should export useViewTransition hook', () => {
      const { useViewTransition } = require('../PageTransition');
      expect(useViewTransition).toBeDefined();
      expect(typeof useViewTransition).toBe('function');
    });
  });

  describe('Layout Index', () => {
    test('should export all components from index', () => {
      const layoutExports = require('../index');
      expect(layoutExports.Navigation).toBeDefined();
      expect(layoutExports.Footer).toBeDefined();
      expect(layoutExports.PageTransition).toBeDefined();
      expect(layoutExports.useViewTransition).toBeDefined();
    });
  });
});

describe('Hooks', () => {
  describe('useMediaQuery', () => {
    test('should export useMediaQuery hook', () => {
      const { useMediaQuery } = require('../../../lib/hooks/useMediaQuery');
      expect(useMediaQuery).toBeDefined();
      expect(typeof useMediaQuery).toBe('function');
    });

    test('should export predefined breakpoint hooks', () => {
      const hooks = require('../../../lib/hooks/useMediaQuery');
      expect(hooks.useIsMobile).toBeDefined();
      expect(hooks.useIsTablet).toBeDefined();
      expect(hooks.useIsDesktop).toBeDefined();
      expect(hooks.useIsLargeScreen).toBeDefined();
    });
  });

  describe('useScrollPosition', () => {
    test('should export useScrollPosition hook', () => {
      const { useScrollPosition } = require('../../../lib/hooks/useScrollPosition');
      expect(useScrollPosition).toBeDefined();
      expect(typeof useScrollPosition).toBe('function');
    });

    test('should export useIsScrolled hook', () => {
      const { useIsScrolled } = require('../../../lib/hooks/useScrollPosition');
      expect(useIsScrolled).toBeDefined();
      expect(typeof useIsScrolled).toBe('function');
    });
  });
});
