/**
 * User Preferences Hook
 * Manages user preferences with anonymized tracking
 */

import { useCallback, useEffect, useState } from 'react';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { type UserPreferences } from '@/lib/services/user-tracking';

export function useUserPreferences() {
  const { getUserSession, updateUserPreferences } = useAnalytics();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const session = getUserSession();
    if (session?.preferences) {
      setPreferences(session.preferences);
    }
    setIsLoading(false);
  }, [getUserSession]);

  // Update a specific preference
  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!preferences) return;

    const updatedPreferences = {
      ...preferences,
      [key]: value,
    };

    setPreferences(updatedPreferences);
    updateUserPreferences({ [key]: value });
  }, [preferences, updateUserPreferences]);

  // Update multiple preferences at once
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    if (!preferences) return;

    const updatedPreferences = {
      ...preferences,
      ...updates,
    };

    setPreferences(updatedPreferences);
    updateUserPreferences(updates);
  }, [preferences, updateUserPreferences]);

  // Get a specific preference with fallback
  const getPreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    fallback: UserPreferences[K]
  ): UserPreferences[K] => {
    return preferences?.[key] ?? fallback;
  }, [preferences]);

  // Preference-specific helpers
  const setAutoplay = useCallback((autoplay: boolean) => {
    updatePreference('autoplay', autoplay);
  }, [updatePreference]);

  const setQuality = useCallback((quality: 'auto' | '720p' | '1080p' | '4k') => {
    updatePreference('quality', quality);
  }, [updatePreference]);

  const setVolume = useCallback((volume: number) => {
    updatePreference('volume', Math.max(0, Math.min(1, volume)));
  }, [updatePreference]);

  const setSubtitles = useCallback((subtitles: boolean) => {
    updatePreference('subtitles', subtitles);
  }, [updatePreference]);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'auto') => {
    updatePreference('theme', theme);
  }, [updatePreference]);

  const setPreferredLanguage = useCallback((language: string) => {
    updatePreference('preferredLanguage', language);
  }, [updatePreference]);

  const addFavoriteGenre = useCallback((genre: string) => {
    if (!preferences) return;
    
    const currentGenres = preferences.favoriteGenres || [];
    if (!currentGenres.includes(genre)) {
      updatePreference('favoriteGenres', [...currentGenres, genre]);
    }
  }, [preferences, updatePreference]);

  const removeFavoriteGenre = useCallback((genre: string) => {
    if (!preferences) return;
    
    const currentGenres = preferences.favoriteGenres || [];
    updatePreference('favoriteGenres', currentGenres.filter(g => g !== genre));
  }, [preferences, updatePreference]);

  return {
    preferences,
    isLoading,
    updatePreference,
    updatePreferences,
    getPreference,
    
    // Specific preference setters
    setAutoplay,
    setQuality,
    setVolume,
    setSubtitles,
    setTheme,
    setPreferredLanguage,
    addFavoriteGenre,
    removeFavoriteGenre,
    
    // Convenience getters
    autoplay: getPreference('autoplay', true),
    quality: getPreference('quality', 'auto'),
    volume: getPreference('volume', 0.8),
    subtitles: getPreference('subtitles', false),
    theme: getPreference('theme', 'auto'),
    preferredLanguage: getPreference('preferredLanguage', 'en'),
    favoriteGenres: getPreference('favoriteGenres', []),
  };
}