'use client';

/**
 * Service Worker Registration Component
 * Registers the service worker on mount
 */

import { useEffect, useState } from 'react';
import { registerServiceWorker } from '@/app/lib/utils/service-worker';

export default function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Register service worker
    registerServiceWorker({
      onUpdate: () => {
        setUpdateAvailable(true);
      },
      onSuccess: (registration) => {
        console.log('Service worker registered successfully');
        
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      },
      onError: (error) => {
        console.error('Service worker registration failed:', error);
      },
    });
  }, []);

  // Show update notification
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm">
        <div className="bg-purple-600 text-white p-4 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">Update Available</p>
          <p className="text-sm mb-3">
            A new version of Flyx is available. Refresh to update.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-purple-600 px-4 py-2 rounded font-semibold text-sm hover:bg-gray-100 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>
    );
  }

  return null;
}
