'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVNavigation } from './TVNavigationProvider';

/**
 * TVNavigationHint - Shows keyboard/remote control hints when TV navigation is active
 * Auto-hides after a few seconds of inactivity
 */
export function TVNavigationHint() {
  const tvNav = useTVNavigation();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!tvNav?.isEnabled || dismissed) {
      setVisible(false);
      return;
    }

    // Show hint when TV navigation is first enabled
    setVisible(true);

    // Auto-hide after 8 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, [tvNav?.isEnabled, dismissed]);

  // Hide when user starts navigating
  useEffect(() => {
    if (tvNav?.isNavigating) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [tvNav?.isNavigating]);

  if (!tvNav?.isEnabled) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-6 text-sm text-white">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">↑</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">↓</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">←</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">→</kbd>
                </div>
                <span className="text-gray-400">Navigate</span>
              </div>
              
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1 bg-purple-600/50 rounded text-xs">Enter</kbd>
                <span className="text-gray-400">Select</span>
              </div>
              
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Esc</kbd>
                <span className="text-gray-400">Back</span>
              </div>

              <button
                onClick={() => setDismissed(true)}
                className="ml-4 text-gray-500 hover:text-white transition-colors"
                aria-label="Dismiss hint"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TVNavigationHint;
