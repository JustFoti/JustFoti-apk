/**
 * Live TV Types - Channel and stream models
 */

export interface LiveChannel {
  id: string;
  name: string;
  category: string;
  logo?: string;
  country?: string;
  language?: string;
  isHD?: boolean;
  currentProgram?: string;
  streamId: string;
}

export interface LiveCategory {
  id: string;
  name: string;
  icon: string;
  channels: LiveChannel[];
}

export interface LiveStreamInfo {
  channelId: string;
  m3u8Url: string;
  keyUrl?: string;
  iv?: string;
  status: 'active' | 'offline' | 'error';
  quality?: string;
}

// Sports event types
export interface SportEvent {
  id: string;
  title: string;
  sport?: string;
  league?: string;
  teams?: {
    home: string;
    away: string;
  };
  time: string;
  dataTime: string; // UK GMT time
  isLive: boolean;
  channels: {
    name: string;
    channelId: string;
    href: string;
  }[];
}

// Schedule category
export interface ScheduleCategory {
  name: string;
  icon: string;
  events: SportEvent[];
}

// Schedule response
export interface ScheduleResponse {
  success: boolean;
  schedule: {
    date: string;
    timezone: string;
    categories: ScheduleCategory[];
  };
  stats: {
    totalCategories: number;
    totalEvents: number;
    totalChannels: number;
    liveEvents: number;
  };
  filters: {
    sports: {
      name: string;
      icon: string;
      count: number;
    }[];
  };
}

// Channel categories
export const CHANNEL_CATEGORIES = {
  sports: { id: 'sports', name: 'Sports', icon: '⚽' },
  news: { id: 'news', name: 'News', icon: '📰' },
  entertainment: { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  movies: { id: 'movies', name: 'Movies', icon: '🎥' },
  kids: { id: 'kids', name: 'Kids', icon: '🧸' },
  music: { id: 'music', name: 'Music', icon: '🎵' },
  documentary: { id: 'documentary', name: 'Documentary', icon: '🌍' },
  lifestyle: { id: 'lifestyle', name: 'Lifestyle', icon: '🏠' },
} as const;
