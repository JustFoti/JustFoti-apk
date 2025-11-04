'use client';

/**
 * Fallback Image Component
 * Handles image loading errors with graceful fallbacks
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './FallbackImage.module.css';

interface FallbackImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  fallbackSrc?: string;
  fallbackType?: 'image' | 'placeholder' | 'icon';
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function FallbackImage({
  src,
  alt,
  width,
  height,
  fill = false,
  fallbackSrc,
  fallbackType = 'placeholder',
  className = '',
  priority = false,
  sizes,
  quality = 75,
  onLoad,
  onError,
}: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when src changes
  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);

    // Try fallback image first
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(false);
    }

    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  // Show fallback UI if all images failed
  if (hasError) {
    if (fallbackType === 'icon') {
      return (
        <div className={`${styles.fallbackIcon} ${className}`}>
          <svg
            width={width || 24}
            height={height || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <polyline points="21 15 16 10 5 21" strokeWidth="2" />
          </svg>
          <span className={styles.fallbackText}>{alt || 'Image'}</span>
        </div>
      );
    }

    if (fallbackType === 'placeholder') {
      return (
        <div className={`${styles.fallbackPlaceholder} ${className}`}>
          <div className={styles.placeholderContent}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <polyline points="21 15 16 10 5 21" strokeWidth="2" />
            </svg>
            <p className={styles.placeholderText}>{alt || 'Image unavailable'}</p>
          </div>
        </div>
      );
    }
  }

  // Render image
  const imageProps = {
    src: imgSrc,
    alt,
    onError: handleError,
    onLoad: handleLoad,
    className: `${className} ${isLoading ? styles.loading : ''}`,
    priority,
    quality,
    ...(sizes && { sizes }),
  };

  if (fill) {
    return (
      <div className={styles.imageContainer}>
        <Image {...imageProps} fill style={{ objectFit: 'cover' }} />
        {isLoading && <div className={styles.loadingSkeleton} />}
      </div>
    );
  }

  return (
    <div className={styles.imageContainer}>
      <Image {...imageProps} width={width!} height={height!} />
      {isLoading && <div className={styles.loadingSkeleton} />}
    </div>
  );
}

/**
 * Optimized poster image with fallback
 */
export function PosterImage({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <FallbackImage
      src={src}
      alt={alt}
      fill
      fallbackType="placeholder"
      className={className}
      priority={priority}
      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
      quality={80}
    />
  );
}

/**
 * Optimized backdrop image with fallback
 */
export function BackdropImage({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <FallbackImage
      src={src}
      alt={alt}
      fill
      fallbackType="placeholder"
      className={className}
      priority={priority}
      sizes="100vw"
      quality={85}
    />
  );
}
