/**
 * Offline Detection and Request Queuing
 * Handles offline scenarios and queues requests for retry when online
 */

type QueuedRequest = {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  retryCount: number;
};

type OfflineListener = (isOffline: boolean) => void;

class OfflineManager {
  private isOffline: boolean = false;
  private queue: QueuedRequest[] = [];
  private listeners: Set<OfflineListener> = new Set();
  private maxQueueSize: number = 50;
  private maxRetries: number = 3;
  private storageKey: string = 'flyx_offline_queue';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    // Set initial offline state
    this.isOffline = !navigator.onLine;

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Load queued requests from storage
    this.loadQueue();

    // Process queue if online
    if (!this.isOffline) {
      this.processQueue();
    }
  }

  private handleOnline = () => {
    console.log('Connection restored');
    this.isOffline = false;
    this.notifyListeners(false);
    this.processQueue();
  };

  private handleOffline = () => {
    console.log('Connection lost');
    this.isOffline = true;
    this.notifyListeners(true);
  };

  /**
   * Check if currently offline
   */
  public getIsOffline(): boolean {
    return this.isOffline;
  }

  /**
   * Subscribe to offline state changes
   */
  public subscribe(listener: OfflineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(isOffline: boolean) {
    this.listeners.forEach(listener => listener(isOffline));
  }

  /**
   * Queue a request for later execution
   */
  public queueRequest(url: string, options: RequestInit = {}): string {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: QueuedRequest = {
      id,
      url,
      options,
      timestamp: Date.now(),
      retryCount: 0,
    };

    // Add to queue
    this.queue.push(request);

    // Limit queue size
    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift(); // Remove oldest
    }

    // Persist to storage
    this.saveQueue();

    console.log(`Request queued: ${url}`);
    return id;
  }

  /**
   * Process all queued requests
   */
  private async processQueue() {
    if (this.queue.length === 0) {
      return;
    }

    console.log(`Processing ${this.queue.length} queued requests`);

    const requests = [...this.queue];
    this.queue = [];

    for (const request of requests) {
      try {
        await fetch(request.url, request.options);
        console.log(`Successfully processed queued request: ${request.url}`);
      } catch (error) {
        console.error(`Failed to process queued request: ${request.url}`, error);
        
        // Re-queue if under retry limit
        if (request.retryCount < this.maxRetries) {
          this.queue.push({
            ...request,
            retryCount: request.retryCount + 1,
          });
        }
      }
    }

    this.saveQueue();
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        
        // Remove old requests (older than 24 hours)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.queue = this.queue.filter(req => req.timestamp > oneDayAgo);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Clear the queue
   */
  public clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Get queue size
   */
  public getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Cleanup
   */
  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();

/**
 * React hook for offline detection
 */
export function useOfflineDetection() {
  const [isOffline, setIsOffline] = React.useState(offlineManager.getIsOffline());

  React.useEffect(() => {
    const unsubscribe = offlineManager.subscribe(setIsOffline);
    return unsubscribe;
  }, []);

  return isOffline;
}

// Import React for the hook
import React from 'react';
