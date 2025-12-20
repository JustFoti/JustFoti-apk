/**
 * Performance utilities for optimizing the app on older/low-end devices
 */

'use client';

// Cache the result to avoid repeated checks
let cachedIsLowEndDevice: boolean | null = null;
let cachedPrefersReducedMotion: boolean | null = null;
let cachedIsMobile: boolean | null = null;

/**
 * Detect if the device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  if (cachedIsMobile !== null) {
    return cachedIsMobile;
  }
  
  cachedIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768;
  return cachedIsMobile;
}

/**
 * Detect if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  if (cachedPrefersReducedMotion !== null) {
    return cachedPrefersReducedMotion;
  }
  
  cachedPrefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return cachedPrefersReducedMotion;
}

/**
 * Detect if the device is likely low-end based on various signals
 */
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  if (cachedIsLowEndDevice !== null) {
    return cachedIsLowEndDevice;
  }
  
  const signals: boolean[] = [];
  
  // Check hardware concurrency (CPU cores)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
    signals.push(true);
  }
  
  // Check device memory (if available)
  if ('deviceMemory' in navigator) {
    const memory = (navigator as any).deviceMemory;
    if (memory && memory <= 4) {
      signals.push(true);
    }
  }
  
  // Check connection type (if available)
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      // Slow connection types
      if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') {
        signals.push(true);
      }
      // Save data mode enabled
      if (conn.saveData) {
        signals.push(true);
      }
    }
  }
  
  // Mobile devices should use reduced animations for better performance
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    signals.push(true);
  }
  
  // Check screen size (smaller screens often = mobile = potentially lower power)
  if (window.screen.width <= 768 || window.innerWidth <= 768) {
    signals.push(true);
  }
  
  // Check if user prefers reduced motion
  if (prefersReducedMotion()) {
    signals.push(true);
  }
  
  // Consider low-end if 1+ signals are true (more aggressive)
  cachedIsLowEndDevice = signals.length >= 1;
  return cachedIsLowEndDevice;
}

/**
 * Check if we should use reduced animations
 * Returns true if user prefers reduced motion OR device is low-end
 */
export function shouldReduceAnimations(): boolean {
  return prefersReducedMotion() || isLowEndDevice();
}

/**
 * Get animation settings based on device capability
 */
export function getAnimationSettings() {
  const reduced = shouldReduceAnimations();
  
  return {
    // Disable 3D transforms on low-end devices
    enable3D: !reduced,
    // Use simpler hover effects
    enableComplexHover: !reduced,
    // Disable parallax effects
    enableParallax: !reduced,
    // Reduce stagger delay for list animations
    staggerDelay: reduced ? 0 : 0.05,
    // Disable spring animations (use linear instead)
    useSpringAnimations: !reduced,
    // Reduce motion blur/glow effects
    enableGlowEffects: !reduced,
  };
}

/**
 * Hook to get animation settings (can be used in components)
 */
export function useAnimationSettings() {
  // This is a simple function call, not a real hook
  // For SSR safety, we return full animations by default
  if (typeof window === 'undefined') {
    return {
      enable3D: true,
      enableComplexHover: true,
      enableParallax: true,
      staggerDelay: 0.05,
      useSpringAnimations: true,
      enableGlowEffects: true,
    };
  }
  
  return getAnimationSettings();
}

/**
 * Clear cached values (useful for testing)
 */
export function clearPerformanceCache(): void {
  cachedIsLowEndDevice = null;
  cachedPrefersReducedMotion = null;
  cachedIsMobile = null;
}
