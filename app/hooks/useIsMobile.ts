'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface MobileInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isTablet: boolean;
  supportsHLS: boolean;
  supportsTouchEvents: boolean;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  pixelRatio: number;
}

const defaultMobileInfo: MobileInfo = {
  isMobile: false,
  isIOS: false,
  isAndroid: false,
  isSafari: false,
  isChrome: false,
  isTablet: false,
  supportsHLS: false,
  supportsTouchEvents: false,
  screenWidth: 0,
  screenHeight: 0,
  isLandscape: false,
  pixelRatio: 1,
};

// Cache HLS support detection - only needs to be checked once per session
let cachedHLSSupport: boolean | null = null;

function checkHLSSupport(): boolean {
  if (cachedHLSSupport !== null) return cachedHLSSupport;
  if (typeof document === 'undefined') return false;
  
  // Create video element once and cache result
  const video = document.createElement('video');
  cachedHLSSupport = video.canPlayType('application/vnd.apple.mpegurl') !== '' ||
    video.canPlayType('application/x-mpegURL') !== '';
  return cachedHLSSupport;
}

// Cache static device info that never changes
let cachedStaticInfo: {
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isTablet: boolean;
  isMobile: boolean;
  supportsTouchEvents: boolean;
  pixelRatio: number;
} | null = null;

function getStaticDeviceInfo() {
  if (cachedStaticInfo !== null) return cachedStaticInfo;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }

  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  
  // iOS detection (iPhone, iPad, iPod)
  const isIOS = /iphone|ipad|ipod/.test(ua) || 
    (platform === 'macintel' && navigator.maxTouchPoints > 1);
  
  // Android detection
  const isAndroid = /android/.test(ua);
  
  // Safari detection (including iOS Safari)
  const isSafari = /safari/.test(ua) && !/chrome|chromium|crios/.test(ua);
  
  // Chrome detection (including Chrome on iOS/Android)
  const isChrome = /chrome|chromium|crios/.test(ua);
  
  // Tablet detection
  const isTablet = /ipad/.test(ua) || 
    (/android/.test(ua) && !/mobile/.test(ua)) ||
    (platform === 'macintel' && navigator.maxTouchPoints > 1);
  
  // Mobile detection (phone or tablet)
  const isMobile = isIOS || isAndroid || /mobile|tablet/.test(ua);
  
  // Touch events support
  const supportsTouchEvents = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  cachedStaticInfo = {
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isTablet,
    isMobile,
    supportsTouchEvents,
    pixelRatio: window.devicePixelRatio || 1,
  };
  
  return cachedStaticInfo;
}

export function useIsMobile(): MobileInfo {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>(defaultMobileInfo);
  const initializedRef = useRef(false);

  const detectMobile = useCallback(() => {
    if (typeof window === 'undefined') {
      return defaultMobileInfo;
    }

    // Get cached static info (device type, browser, etc.)
    const staticInfo = getStaticDeviceInfo();
    if (!staticInfo) return defaultMobileInfo;
    
    // Only dynamic values that can change
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isLandscape = screenWidth > screenHeight;

    return {
      ...staticInfo,
      supportsHLS: checkHLSSupport(),
      screenWidth,
      screenHeight,
      isLandscape,
    };
  }, []);

  useEffect(() => {
    // Only run once on mount
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // Initial detection - deferred to avoid blocking render
    requestAnimationFrame(() => {
      const initialInfo = detectMobile();
      setMobileInfo(initialInfo);
    });

    // Throttled resize handler - only updates dimensions, not device type
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimeout) return;
      resizeTimeout = setTimeout(() => {
        resizeTimeout = null;
        setMobileInfo(prev => {
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          const isLandscape = screenWidth > screenHeight;
          
          // Only update if dimensions actually changed
          if (prev.screenWidth === screenWidth && 
              prev.screenHeight === screenHeight && 
              prev.isLandscape === isLandscape) {
            return prev;
          }
          
          return {
            ...prev,
            screenWidth,
            screenHeight,
            isLandscape,
          };
        });
      }, 150); // Throttle to 150ms
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [detectMobile]);

  return mobileInfo;
}

// Simple hook for just checking if mobile
export function useIsMobileSimple(): boolean {
  const { isMobile } = useIsMobile();
  return isMobile;
}
