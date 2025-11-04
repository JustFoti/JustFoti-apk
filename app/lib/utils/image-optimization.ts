/**
 * Image Optimization Utilities
 * 
 * Provides utilities for optimized image loading with blur placeholders
 */

/**
 * Generate a blur data URL for image placeholders
 * This creates a tiny base64-encoded image for blur-up effect
 */
export function generateBlurDataURL(width: number = 8, height: number = 8): string {
  // Create a simple gradient blur placeholder
  const canvas = typeof document !== 'undefined' 
    ? document.createElement('canvas')
    : null;
  
  if (!canvas) {
    // Server-side fallback - return a simple gray blur
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMxYTFhMWEiLz48L3N2Zz4=';
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMxYTFhMWEiLz48L3N2Zz4=';
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1a1a');
  gradient.addColorStop(1, '#2a2a2a');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/png');
}

/**
 * Generate a shimmer effect SVG for loading states
 */
export function generateShimmerSVG(width: number = 400, height: number = 600): string {
  const shimmer = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#2a2a2a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
          <animate attributeName="x1" from="-100%" to="100%" dur="2s" repeatCount="indefinite" />
          <animate attributeName="x2" from="0%" to="200%" dur="2s" repeatCount="indefinite" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#shimmer)" />
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(shimmer).toString('base64')}`;
}

/**
 * Get optimized image props for Next.js Image component
 */
export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
}

export function getOptimizedImageProps(
  props: OptimizedImageProps
): OptimizedImageProps & {
  placeholder: 'blur' | 'empty';
  blurDataURL?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
} {
  const { priority = false, quality = 85, width, height } = props;

  return {
    ...props,
    quality,
    placeholder: priority ? 'empty' : 'blur',
    blurDataURL: priority ? undefined : generateShimmerSVG(width, height),
    loading: priority ? 'eager' : 'lazy',
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  };
}

/**
 * Preload critical images
 */
export function preloadImage(src: string, priority: 'high' | 'low' = 'low'): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  link.fetchPriority = priority;
  
  document.head.appendChild(link);
}

/**
 * Get responsive image sizes based on viewport
 */
export function getResponsiveSizes(
  breakpoints: { maxWidth: number; size: string }[]
): string {
  return breakpoints
    .map(({ maxWidth, size }) => `(max-width: ${maxWidth}px) ${size}`)
    .join(', ');
}

/**
 * Calculate aspect ratio for images
 */
export function calculateAspectRatio(width: number, height: number): number {
  return (height / width) * 100;
}

/**
 * TMDB image URL builder with optimization
 */
export function getTMDBImageURL(
  path: string | null,
  size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): string {
  if (!path) {
    return '/placeholder-poster.png';
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Get srcset for responsive images
 */
export function getTMDBImageSrcSet(path: string | null): string {
  if (!path) return '';
  
  const sizes = ['w342', 'w500', 'w780'] as const;
  return sizes
    .map((size, index) => {
      const width = [342, 500, 780][index];
      return `${getTMDBImageURL(path, size)} ${width}w`;
    })
    .join(', ');
}
