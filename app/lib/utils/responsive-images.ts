/**
 * Responsive Image Utilities
 * Viewport-based asset optimization for different screen sizes
 */

export interface ImageSizeConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  largeDesktop: number;
}

export interface ResponsiveImageOptions {
  width: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
}

/**
 * Get optimal image size based on viewport width
 */
export function getOptimalImageSize(
  viewportWidth: number,
  config: Partial<ImageSizeConfig> = {}
): number {
  const defaultConfig: ImageSizeConfig = {
    mobile: 640,
    tablet: 1024,
    desktop: 1920,
    largeDesktop: 2560,
    ...config,
  };

  if (viewportWidth <= 768) return defaultConfig.mobile;
  if (viewportWidth <= 1024) return defaultConfig.tablet;
  if (viewportWidth <= 1920) return defaultConfig.desktop;
  return defaultConfig.largeDesktop;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1920]
): string {
  return widths
    .map((width) => {
      const url = appendImageParams(baseUrl, { width });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(
  breakpoints: Array<{ maxWidth: string; size: string }> = [
    { maxWidth: '640px', size: '100vw' },
    { maxWidth: '768px', size: '50vw' },
    { maxWidth: '1024px', size: '33vw' },
  ],
  defaultSize: string = '25vw'
): string {
  const sizeStrings = breakpoints.map(
    ({ maxWidth, size }) => `(max-width: ${maxWidth}) ${size}`
  );
  sizeStrings.push(defaultSize);
  return sizeStrings.join(', ');
}

/**
 * Append image optimization parameters to URL
 */
export function appendImageParams(
  url: string,
  options: ResponsiveImageOptions
): string {
  if (!url) return url;

  const { width, quality = 80, format = 'webp' } = options;
  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}w=${width}&q=${quality}&fm=${format}`;
}

/**
 * Check if device supports WebP
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * Check if device supports AVIF
 */
export function supportsAVIF(): Promise<boolean> {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
}

/**
 * Get device pixel ratio
 */
export function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
}

/**
 * Calculate optimal image dimensions for device
 */
export function getOptimalDimensions(
  baseWidth: number,
  baseHeight: number,
  maxDPR: number = 2
): { width: number; height: number } {
  const dpr = Math.min(getDevicePixelRatio(), maxDPR);
  return {
    width: Math.round(baseWidth * dpr),
    height: Math.round(baseHeight * dpr),
  };
}

/**
 * Preload critical images
 */
export function preloadImage(src: string, priority: 'high' | 'low' = 'low'): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    link.fetchPriority = priority;

    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload image: ${src}`));

    document.head.appendChild(link);
  });
}

/**
 * Get connection speed and adjust quality accordingly
 */
export function getAdaptiveQuality(): number {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 80; // Default quality
  }

  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType;

  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return 50;
    case '3g':
      return 65;
    case '4g':
    default:
      return 80;
  }
}

/**
 * Check if user prefers reduced data
 */
export function prefersReducedData(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false;
  }

  const connection = (navigator as any).connection;
  return connection?.saveData === true;
}
