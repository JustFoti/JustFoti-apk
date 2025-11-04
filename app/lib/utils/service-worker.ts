/**
 * Service Worker Registration and Management
 */

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(
  config: ServiceWorkerConfig = {}
): Promise<ServiceWorkerRegistration | null> {
  // Only register in production and if supported
  if (
    typeof window === 'undefined' ||
    process.env.NODE_ENV !== 'production' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          config.onUpdate?.(registration);
        }
      });
    });

    // Success callback
    if (registration.active) {
      config.onSuccess?.(registration);
    }

    return registration;
  } catch (error) {
    config.onError?.(error as Error);
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.unregister();
  } catch (error) {
    console.error('Service worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if service worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Get the current service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Failed to get service worker registration:', error);
    return null;
  }
}

/**
 * Update the service worker
 */
export async function updateServiceWorker(): Promise<void> {
  const registration = await getServiceWorkerRegistration();
  if (registration) {
    await registration.update();
  }
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaiting(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

/**
 * Check if the app is running in standalone mode (PWA)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Prompt user to install PWA
 */
export function setupInstallPrompt(
  onInstallPrompt: (event: Event) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    event.preventDefault();
    onInstallPrompt(event);
  };

  window.addEventListener('beforeinstallprompt', handler);

  return () => {
    window.removeEventListener('beforeinstallprompt', handler);
  };
}
