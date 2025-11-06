/**
 * Viewing History Hook
 * Manages user's viewing history with anonymized tracking
 */

import { useCallback, useEffect, useState } from 'react';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { type ViewingHistory } from '@/lib/services/user-tracking';

export function useViewingHistory() {
  const { getViewingHistory, trackContentEngagement } = useAnalytics();
  const [history, setHistory] = useState<ViewingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load viewing history on mount
  useEffect(() => {
    try {
      const viewingHistory = getViewingHistory();
      setHistory(viewingHistory);
    } catch (error) {
      console.error('Failed to load viewing history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getViewingHistory]);

  // Add item to viewing history
  const addToHistory = useCallback((item: Omit<ViewingHistory, 'watchedAt'>) => {
    const historyItem: ViewingHistory = {
      ...item,
      watchedAt: Date.now(),
    };

    // Update local state
    setHistory(prev => {
      const filtered = prev.filter(h => h.contentId !== item.contentId);
      return [historyItem, ...filtered].slice(0, 100); // Keep max 100 items
    });

    // Track engagement
    trackContentEngagement(item.contentId, item.contentType, 'added_to_history', {
      title: item.title,
      watchTime: item.watchTime,
      completed: item.completed,
    });
  }, [trackContentEngagement]);

  // Remove item from viewing history
  const removeFromHistory = useCallback((contentId: string) => {
    setHistory(prev => prev.filter(h => h.contentId !== contentId));
    
    trackContentEngagement(contentId, 'movie', 'removed_from_history');
  }, [trackContentEngagement]);

  // Clear all viewing history
  const clearHistory = useCallback(() => {
    setHistory([]);
    
    // Clear from localStorage
    try {
      localStorage.removeItem('flyx_viewing_history');
    } catch (error) {
      console.error('Failed to clear viewing history:', error);
    }

    trackContentEngagement('all', 'movie', 'cleared_history');
  }, [trackContentEngagement]);

  // Get recently watched items
  const getRecentlyWatched = useCallback((limit: number = 10) => {
    return history
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, limit);
  }, [history]);

  // Get completed items
  const getCompletedItems = useCallback(() => {
    return history.filter(item => item.completed);
  }, [history]);

  // Get in-progress items
  const getInProgressItems = useCallback(() => {
    return history.filter(item => !item.completed && item.watchTime > 0);
  }, [history]);

  // Check if item is in history
  const isInHistory = useCallback((contentId: string) => {
    return history.some(item => item.contentId === contentId);
  }, [history]);

  // Get watch time for specific content
  const getWatchTime = useCallback((contentId: string) => {
    const item = history.find(h => h.contentId === contentId);
    return item?.watchTime || 0;
  }, [history]);

  // Get viewing statistics
  const getViewingStats = useCallback(() => {
    const totalItems = history.length;
    const completedItems = getCompletedItems().length;
    const inProgressItems = getInProgressItems().length;
    const totalWatchTime = history.reduce((sum, item) => sum + item.watchTime, 0);
    
    const movieCount = history.filter(item => item.contentType === 'movie').length;
    const tvCount = history.filter(item => item.contentType === 'tv').length;

    return {
      totalItems,
      completedItems,
      inProgressItems,
      totalWatchTime,
      movieCount,
      tvCount,
      completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
    };
  }, [history, getCompletedItems, getInProgressItems]);

  // Get favorite genres based on viewing history
  const getFavoriteGenres = useCallback(() => {
    // This would require genre information in the viewing history
    // For now, return empty array - can be enhanced later
    return [];
  }, []);

  return {
    history,
    isLoading,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentlyWatched,
    getCompletedItems,
    getInProgressItems,
    isInHistory,
    getWatchTime,
    getViewingStats,
    getFavoriteGenres,
  };
}