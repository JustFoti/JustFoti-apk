/**
 * Mobile Hooks Tests
 * Tests for gesture and touch optimization hooks
 */

import { renderHook, act } from '@testing-library/react';
import { useGestures } from '../useGestures';
import { useTouchOptimization } from '../useTouchOptimization';
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '../useMediaQuery';

describe('useGestures', () => {
  it('should detect swipe gestures', () => {
    const onSwipeRight = jest.fn();
    const onSwipeLeft = jest.fn();

    const { result } = renderHook(() =>
      useGestures({
        onSwipeRight,
        onSwipeLeft,
      })
    );

    // Simulate swipe right
    const touchStart = {
      touches: [{ clientX: 100, clientY: 100 }],
    } as any;

    const touchEnd = {
      changedTouches: [{ clientX: 200, clientY: 100 }],
    } as any;

    act(() => {
      result.current.onTouchStart(touchStart);
    });

    act(() => {
      result.current.onTouchEnd(touchEnd);
    });

    expect(onSwipeRight).toHaveBeenCalled();
  });

  it('should detect double tap', () => {
    const onDoubleTap = jest.fn();

    const { result } = renderHook(() =>
      useGestures({
        onDoubleTap,
      })
    );

    const touch = {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    } as any;

    // First tap
    act(() => {
      result.current.onTouchStart(touch);
      result.current.onTouchEnd(touch);
    });

    // Second tap within delay
    act(() => {
      result.current.onTouchStart(touch);
      result.current.onTouchEnd(touch);
    });

    expect(onDoubleTap).toHaveBeenCalled();
  });

  it('should detect pinch gestures', () => {
    const onPinchOut = jest.fn();

    const { result } = renderHook(() =>
      useGestures({
        onPinchOut,
      })
    );

    const touchStart = {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ],
    } as any;

    const touchMove = {
      touches: [
        { clientX: 50, clientY: 100 },
        { clientX: 250, clientY: 100 },
      ],
    } as any;

    act(() => {
      result.current.onTouchStart(touchStart);
    });

    act(() => {
      result.current.onTouchMove(touchMove);
    });

    expect(onPinchOut).toHaveBeenCalled();
  });
});

describe('useTouchOptimization', () => {
  it('should provide haptic feedback trigger', () => {
    const { result } = renderHook(() =>
      useTouchOptimization({
        hapticFeedback: true,
      })
    );

    expect(result.current.triggerHaptic).toBeDefined();
    expect(typeof result.current.triggerHaptic).toBe('function');
  });

  it('should trigger haptic feedback', () => {
    const vibrateMock = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
    });

    const { result } = renderHook(() =>
      useTouchOptimization({
        hapticFeedback: true,
      })
    );

    act(() => {
      result.current.triggerHaptic('light');
    });

    expect(vibrateMock).toHaveBeenCalledWith(10);
  });
});

describe('useMediaQuery', () => {
  beforeEach(() => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('should detect mobile viewport', () => {
    (window.matchMedia as jest.Mock).mockImplementation((query) => ({
      matches: query === '(max-width: 768px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('should detect tablet viewport', () => {
    (window.matchMedia as jest.Mock).mockImplementation((query) => ({
      matches: query === '(min-width: 769px) and (max-width: 1024px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });

  it('should detect desktop viewport', () => {
    (window.matchMedia as jest.Mock).mockImplementation((query) => ({
      matches: query === '(min-width: 1025px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });
});
