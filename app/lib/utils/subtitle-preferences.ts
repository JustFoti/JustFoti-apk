/**
 * Subtitle Preferences - LocalStorage management for user subtitle settings
 */

export interface SubtitleStyle {
  fontSize: number; // 50-200 (percentage)
  backgroundColor: string; // rgba color
  textColor: string; // color
  backgroundOpacity: number; // 0-100
  verticalPosition: number; // 0-100 (0 = top, 100 = bottom)
}

export interface SubtitlePreferences {
  enabled: boolean;
  languageCode: string;
  languageName: string;
  style: SubtitleStyle;
}

const STORAGE_KEY = 'vynx_subtitle_preferences';
const DEFAULT_PREFERENCES: SubtitlePreferences = {
  enabled: true,
  languageCode: 'eng',
  languageName: 'English',
  style: {
    fontSize: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    textColor: '#ffffff',
    backgroundOpacity: 80,
    verticalPosition: 90, // Default near bottom
  },
};

/**
 * Get subtitle preferences from localStorage
 */
export function getSubtitlePreferences(): SubtitlePreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[SubtitlePreferences] Error reading from localStorage:', error);
  }

  return DEFAULT_PREFERENCES;
}

/**
 * Save subtitle preferences to localStorage
 */
export function saveSubtitlePreferences(preferences: SubtitlePreferences): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    console.log('[SubtitlePreferences] Saved:', preferences);
  } catch (error) {
    console.error('[SubtitlePreferences] Error writing to localStorage:', error);
  }
}

/**
 * Update subtitle enabled state
 */
export function setSubtitlesEnabled(enabled: boolean): void {
  const preferences = getSubtitlePreferences();
  preferences.enabled = enabled;
  saveSubtitlePreferences(preferences);
}

/**
 * Update subtitle language preference
 */
export function setSubtitleLanguage(languageCode: string, languageName: string): void {
  const preferences = getSubtitlePreferences();
  preferences.languageCode = languageCode;
  preferences.languageName = languageName;
  saveSubtitlePreferences(preferences);
}

/**
 * Update subtitle style preferences
 */
export function setSubtitleStyle(style: Partial<SubtitleStyle>): void {
  const preferences = getSubtitlePreferences();
  preferences.style = { ...preferences.style, ...style };
  saveSubtitlePreferences(preferences);
}

/**
 * Get subtitle style preferences
 */
export function getSubtitleStyle(): SubtitleStyle {
  return getSubtitlePreferences().style;
}

/**
 * Clear subtitle preferences (reset to defaults)
 */
export function clearSubtitlePreferences(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[SubtitlePreferences] Cleared');
  } catch (error) {
    console.error('[SubtitlePreferences] Error clearing localStorage:', error);
  }
}
