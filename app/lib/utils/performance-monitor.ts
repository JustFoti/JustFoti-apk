/**
 * Performance Monitoring Utilities
 * 
 * Track and report performance metrics
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  
  // Navigation Timing
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
  tti?: number; // Time to Interactive
  tbt?: number; // Total Blocking Time
  
  // Custom metrics
  componentRenderTime?: number;
  apiResponseTime?: number;
  imageLoadTime?: number;
}

export interface PerformanceEntry {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

/**
 * Performance thresholds based on Web Vitals
 */
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
  fcp: { good: 1800, poor: 3000 },
  tti: { good: 3800, poor: 7300 },
};

/**
 * Get rating for a metric value
 */
function getRating(
  metric: keyof typeof THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Performance Monitor class
 */
class PerformanceMonitor {
  private metrics: Map<string, PerformanceEntry> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    // Largest Contentful Paint
    this.observeMetric('largest-contentful-paint', (entry: any) => {
      this.recordMetric('lcp', entry.renderTime || entry.loadTime);
    });

    // First Input Delay
    this.observeMetric('first-input', (entry: any) => {
      this.recordMetric('fid', entry.processingStart - entry.startTime);
    });

    // Cumulative Layout Shift
    this.observeMetric('layout-shift', (entry: any) => {
      if (!entry.hadRecentInput) {
        const currentCLS = this.metrics.get('cls')?.value || 0;
        this.recordMetric('cls', currentCLS + entry.value);
      }
    });

    // Navigation Timing
    if (window.performance && window.performance.timing) {
      this.recordNavigationMetrics();
    }
  }

  /**
   * Observe a specific performance metric
   */
  private observeMetric(type: string, callback: (entry: any) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          callback(entry);
        }
      });

      observer.observe({ type, buffered: true });
      this.observers.set(type, observer);
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  /**
   * Record navigation timing metrics
   */
  private recordNavigationMetrics(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = window.performance.timing;

        // Time to First Byte
        const ttfb = timing.responseStart - timing.requestStart;
        this.recordMetric('ttfb', ttfb);

        // First Contentful Paint
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
        if (fcp) {
          this.recordMetric('fcp', fcp.startTime);
        }

        // Page Load Time
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        this.recordMetric('page-load', loadTime);
      }, 0);
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number): void {
    const rating = name in THRESHOLDS 
      ? getRating(name as keyof typeof THRESHOLDS, value)
      : 'good';

    const entry: PerformanceEntry = {
      name,
      value,
      rating,
      timestamp: Date.now(),
    };

    this.metrics.set(name, entry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms (${rating})`);
    }

    // Send to analytics
    this.reportToAnalytics(entry);
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}-error`, duration);
      throw error;
    }
  }

  /**
   * Mark a performance point
   */
  mark(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  }

  /**
   * Measure between two marks
   */
  measureBetween(name: string, startMark: string, endMark: string): void {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        if (measure) {
          this.recordMetric(name, measure.duration);
        }
      } catch (error) {
        console.warn(`Failed to measure ${name}:`, error);
      }
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceEntry[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): PerformanceEntry | undefined {
    return this.metrics.get(name);
  }

  /**
   * Report metrics to analytics
   */
  private reportToAnalytics(entry: PerformanceEntry): void {
    // Send to analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance_metric', {
        metric_name: entry.name,
        metric_value: entry.value,
        metric_rating: entry.rating,
      });
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    good: number;
    needsImprovement: number;
    poor: number;
    total: number;
  } {
    const metrics = this.getMetrics();
    const summary = {
      good: 0,
      needsImprovement: 0,
      poor: 0,
      total: metrics.length,
    };

    metrics.forEach((metric) => {
      if (metric.rating === 'good') summary.good++;
      else if (metric.rating === 'needs-improvement') summary.needsImprovement++;
      else summary.poor++;
    });

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Disconnect all observers
   */
  disconnect(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor() {
  return {
    measure: performanceMonitor.measure.bind(performanceMonitor),
    mark: performanceMonitor.mark.bind(performanceMonitor),
    measureBetween: performanceMonitor.measureBetween.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getSummary: performanceMonitor.getSummary.bind(performanceMonitor),
  };
}

/**
 * Measure component render time
 */
export function measureComponentRender(componentName: string) {
  const startMark = `${componentName}-render-start`;
  const endMark = `${componentName}-render-end`;
  
  return {
    start: () => performanceMonitor.mark(startMark),
    end: () => {
      performanceMonitor.mark(endMark);
      performanceMonitor.measureBetween(
        `${componentName}-render`,
        startMark,
        endMark
      );
    },
  };
}

/**
 * Report Web Vitals to analytics
 */
export function reportWebVitals(metric: any): void {
  performanceMonitor.recordMetric(metric.name, metric.value);
}
