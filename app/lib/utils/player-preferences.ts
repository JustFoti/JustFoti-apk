/**
 * Player Preferences - LocalStorage management for video player settings
 */

export type AnimeAudioPreference = 'sub' | 'dub';

export interface PlayerPreferences {
  autoPlayNextEpisode: boolean;
  autoPlayCountdown: number; // seconds for countdown timer before auto-playing (5-30)
  showNextEpisodeBeforeEnd: number; // seconds before video ends to show "Up Next" button (30-180)
  // Volume settings
  volume: number; // 0-1 range
  isMuted: boolean;
  // Anime-specific preferences
  animeAudioPreference: AnimeAudioPreference; // 'sub' for Japanese with subtitles, 'dub' for English dub
  preferredAnimeKaiServer: string | null; // Remember last used AnimeKai server (e.g., "Yuki", "Kaido")
}

const STORAGE_KEY = 'flyx_player_preferences';
const DEFAULT_PREFERENCES: PlayerPreferences = {
  autoPlayNextEpisode: true,
  autoPlayCountdown: 10,
  showNextEpisodeBeforeEnd: 90, // Show 90 seconds before end by default
  volume: 1, // Full volume by default
  isMuted: false,
  animeAudioPreference: 'sub', // Default to subbed anime
  preferredAnimeKaiServer: null, // No preference by default
};

/**
 * Get player preferences from localStorage
 */
export function getPlayerPreferences(): PlayerPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new properties
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error('[PlayerPreferences] Error reading from localStorage:', error);
  }

  return DEFAULT_PREFERENCES;
}

/**
 * Save player preferences to localStorage
 */
export function savePlayerPreferences(preferences: PlayerPreferences): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    console.log('[PlayerPreferences] Saved:', preferences);
  } catch (error) {
    console.error('[PlayerPreferences] Error writing to localStorage:', error);
  }
}

/**
 * Update auto-play next episode setting
 */
export function setAutoPlayNextEpisode(enabled: boolean): void {
  const preferences = getPlayerPreferences();
  preferences.autoPlayNextEpisode = enabled;
  savePlayerPreferences(preferences);
}

/**
 * Update auto-play countdown duration
 */
export function setAutoPlayCountdown(seconds: number): void {
  const preferences = getPlayerPreferences();
  // Clamp between 5 and 30 seconds
  preferences.autoPlayCountdown = Math.max(5, Math.min(30, seconds));
  savePlayerPreferences(preferences);
}

/**
 * Update show next episode before end time
 */
export function setShowNextEpisodeBeforeEnd(seconds: number): void {
  const preferences = getPlayerPreferences();
  // Clamp between 30 and 180 seconds (30s to 3 minutes)
  preferences.showNextEpisodeBeforeEnd = Math.max(30, Math.min(180, seconds));
  savePlayerPreferences(preferences);
}

/**
 * Get auto-play next episode setting
 */
export function getAutoPlayNextEpisode(): boolean {
  return getPlayerPreferences().autoPlayNextEpisode;
}

/**
 * Get auto-play countdown duration
 */
export function getAutoPlayCountdown(): number {
  return getPlayerPreferences().autoPlayCountdown;
}

/**
 * Clear player preferences (reset to defaults)
 */
export function clearPlayerPreferences(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[PlayerPreferences] Cleared');
  } catch (error) {
    console.error('[PlayerPreferences] Error clearing localStorage:', error);
  }
}

// ============================================================================
// Volume preferences
// ============================================================================

/**
 * Get saved volume level (0-1)
 */
export function getSavedVolume(): number {
  return getPlayerPreferences().volume;
}

/**
 * Get saved mute state
 */
export function getSavedMuteState(): boolean {
  return getPlayerPreferences().isMuted;
}

/**
 * Save volume level (0-1)
 */
export function saveVolume(volume: number): void {
  const preferences = getPlayerPreferences();
  // Clamp between 0 and 1
  preferences.volume = Math.max(0, Math.min(1, volume));
  savePlayerPreferences(preferences);
}

/**
 * Save mute state
 */
export function saveMuteState(isMuted: boolean): void {
  const preferences = getPlayerPreferences();
  preferences.isMuted = isMuted;
  savePlayerPreferences(preferences);
}

/**
 * Save both volume and mute state at once (more efficient)
 */
export function saveVolumeSettings(volume: number, isMuted: boolean): void {
  const preferences = getPlayerPreferences();
  preferences.volume = Math.max(0, Math.min(1, volume));
  preferences.isMuted = isMuted;
  savePlayerPreferences(preferences);
}

// ============================================================================
// Anime-specific preferences
// ============================================================================

/**
 * Get anime audio preference (sub or dub)
 */
export function getAnimeAudioPreference(): AnimeAudioPreference {
  return getPlayerPreferences().animeAudioPreference;
}

/**
 * Set anime audio preference
 */
export function setAnimeAudioPreference(preference: AnimeAudioPreference): void {
  const preferences = getPlayerPreferences();
  preferences.animeAudioPreference = preference;
  savePlayerPreferences(preferences);
  console.log('[PlayerPreferences] Anime audio preference set to:', preference);
}

/**
 * Get preferred AnimeKai server
 */
export function getPreferredAnimeKaiServer(): string | null {
  return getPlayerPreferences().preferredAnimeKaiServer;
}

/**
 * Set preferred AnimeKai server
 */
export function setPreferredAnimeKaiServer(serverName: string | null): void {
  const preferences = getPlayerPreferences();
  preferences.preferredAnimeKaiServer = serverName;
  savePlayerPreferences(preferences);
  console.log('[PlayerPreferences] Preferred AnimeKai server set to:', serverName);
}

/**
 * Check if a source matches the user's dub/sub preference
 * Returns true if the source matches the preference
 */
export function sourceMatchesAudioPreference(
  sourceTitle: string,
  preference: AnimeAudioPreference
): boolean {
  const titleLower = sourceTitle.toLowerCase();
  
  if (preference === 'dub') {
    // Look for dub indicators
    return titleLower.includes('dub') || 
           titleLower.includes('english') || 
           titleLower.includes('(en)') ||
           titleLower.includes('[dub]');
  } else {
    // Sub preference - anything that's not explicitly dub
    return !titleLower.includes('dub') && 
           !titleLower.includes('[dub]');
  }
}
