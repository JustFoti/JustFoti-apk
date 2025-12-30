/**
 * LiveTV Data Hook
 * Manages data for DLHD, CDN Live, and PPV providers
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type Provider = 'dlhd' | 'cdnlive' | 'ppv';

export interface LiveEvent {
  id: string;
  title: string;
  sport?: string;
  league?: string;
  teams?: { home: string; away: string };
  time: string;
  isoTime?: string;
  isLive: boolean;
  source: Provider;
  poster?: string;
  viewers?: string;
  channels: Array<{
    name: string;
    channelId: string;
    href: string;
  }>;
  ppvUriName?: string;
  startsAt?: number;
  endsAt?: number;
  cdnliveEmbedId?: string;
}

export interface DLHDChannel {
  id: string;
  name: string;
  category: string;
  country: string;
  firstLetter: string;
  categoryInfo?: { name: string; icon: string };
  countryInfo?: { name: string; flag: string };
}

export interface LiveCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface ProviderStats {
  dlhd: { events: number; channels: number; live: number };
  cdnlive: { channels: number };
  ppv: { events: number; live: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SPORT_ICONS: Record<string, string> = {
  'soccer': '⚽', 'football': '⚽', 'basketball': '🏀', 'tennis': '🎾',
  'cricket': '🏏', 'hockey': '🏒', 'baseball': '⚾', 'golf': '⛳',
  'rugby': '🏉', 'motorsport': '🏎️', 'f1': '🏎️', 'boxing': '🥊',
  'mma': '🥊', 'ufc': '🥊', 'wwe': '🤼', 'volleyball': '🏐',
  'am. football': '🏈', 'american-football': '🏈', 'nfl': '🏈', 
  'darts': '🎯', '24/7': '📺', 'fight': '🥊', 'other': '📺',
};

const CHANNEL_CATEGORY_ICONS: Record<string, { name: string; icon: string }> = {
  sports: { name: 'Sports', icon: '⚽' },
  entertainment: { name: 'Entertainment', icon: '🎬' },
  movies: { name: 'Movies', icon: '🎥' },
  news: { name: 'News', icon: '📰' },
  kids: { name: 'Kids', icon: '🧸' },
  documentary: { name: 'Documentary', icon: '🌍' },
  music: { name: 'Music', icon: '🎵' },
};

// ============================================================================
// HELPERS
// ============================================================================

function getSportIcon(sport: string): string {
  const lower = sport.toLowerCase();
  for (const [key, icon] of Object.entries(SPORT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '📺';
}


function formatLocalTime(isoTime?: string, fallbackTime?: string): string {
  if (isoTime) {
    try {
      const date = new Date(isoTime);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch {}
  }
  return fallbackTime || '';
}

function generateCategories(events: LiveEvent[], channels: DLHDChannel[], isChannelView: boolean): LiveCategory[] {
  if (isChannelView) {
    const categoryMap = new Map<string, number>();
    channels.forEach(channel => {
      categoryMap.set(channel.category, (categoryMap.get(channel.category) || 0) + 1);
    });

    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({
        id: category,
        name: CHANNEL_CATEGORY_ICONS[category]?.name || category.charAt(0).toUpperCase() + category.slice(1),
        icon: CHANNEL_CATEGORY_ICONS[category]?.icon || '📺',
        count,
      }))
      .sort((a, b) => b.count - a.count);
  } else {
    const sportMap = new Map<string, number>();
    events.forEach(event => {
      if (event.sport) {
        const sport = event.sport.toLowerCase();
        sportMap.set(sport, (sportMap.get(sport) || 0) + 1);
      }
    });

    return Array.from(sportMap.entries())
      .map(([sport, count]) => ({
        id: sport,
        name: sport.charAt(0).toUpperCase() + sport.slice(1).replace(/-/g, ' '),
        icon: getSportIcon(sport),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }
}

function categorizeChannel(channelName: string): string {
  const nameLower = channelName.toLowerCase();
  const sportKeywords = [
    'sport', 'espn', 'fox sport', 'bein', 'dazn', 'arena', 'sky sport', 
    'canal sport', 'eleven', 'polsat sport', 'cosmote', 'nova sport', 
    'match', 'premier', 'football', 'soccer', 'nba', 'nfl', 'nhl', 
    'mlb', 'tennis', 'golf', 'f1', 'motorsport'
  ];
  
  for (const keyword of sportKeywords) {
    if (nameLower.includes(keyword)) return 'sports';
  }
  if (nameLower.includes('news') || nameLower.includes('cnn') || nameLower.includes('bbc')) {
    return 'news';
  }
  return 'entertainment';
}

// ============================================================================
// HOOK
// ============================================================================

export function useLiveTVData() {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('dlhd');
  const [searchQuery, setSearchQuery] = useState('');
  
  // DLHD State
  const [dlhdEvents, setDlhdEvents] = useState<LiveEvent[]>([]);
  const [dlhdChannels, setDlhdChannels] = useState<DLHDChannel[]>([]);
  const [dlhdLoading, setDlhdLoading] = useState(true);
  const [dlhdError, setDlhdError] = useState<string | null>(null);

  // CDN Live State
  const [cdnliveEvents, setCdnliveEvents] = useState<LiveEvent[]>([]);
  const [cdnliveLoading, setCdnliveLoading] = useState(true);
  const [cdnliveError, setCdnliveError] = useState<string | null>(null);

  // PPV State
  const [ppvEvents, setPpvEvents] = useState<LiveEvent[]>([]);
  const [ppvLoading, setPpvLoading] = useState(true);
  const [ppvError, setPpvError] = useState<string | null>(null);

  // DLHD Fetcher
  const fetchDLHD = useCallback(async () => {
    setDlhdLoading(true);
    setDlhdError(null);
    
    try {
      const [eventsRes, channelsRes] = await Promise.all([
        fetch('/api/livetv/schedule'),
        fetch('/api/livetv/dlhd-channels'),
      ]);

      const eventsJson = await eventsRes.json();
      const channelsJson = await channelsRes.json();

      const events: LiveEvent[] = [];
      if (eventsJson.success && eventsJson.schedule?.categories) {
        for (const category of eventsJson.schedule.categories) {
          for (const event of category.events || []) {
            events.push({
              id: `dlhd-${event.id}`,
              title: event.title,
              sport: event.sport,
              league: event.league,
              teams: event.teams,
              time: formatLocalTime(event.isoTime, event.time),
              isoTime: event.isoTime,
              isLive: event.isLive,
              source: 'dlhd',
              channels: event.channels || [],
            });
          }
        }
      }

      const channels: DLHDChannel[] = channelsJson.success ? (channelsJson.channels || []) : [];
      
      setDlhdEvents(events);
      setDlhdChannels(channels);
    } catch (error) {
      setDlhdError(error instanceof Error ? error.message : 'Failed to load DLHD');
    } finally {
      setDlhdLoading(false);
    }
  }, []);

  // CDN Live Fetcher
  const fetchCDNLive = useCallback(async () => {
    setCdnliveLoading(true);
    setCdnliveError(null);
    
    try {
      const response = await fetch('/api/livetv/cdn-live-channels');
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      const channels = data.channels || [];
      const onlineChannels = channels.filter((c: any) => c.status === 'online');

      const events: LiveEvent[] = onlineChannels.map((channel: any) => ({
        id: `cdnlive-${channel.name.toLowerCase().replace(/\s+/g, '-')}-${channel.code}`,
        title: channel.name,
        sport: categorizeChannel(channel.name),
        time: 'Live',
        isLive: true,
        source: 'cdnlive' as const,
        poster: channel.image,
        viewers: channel.viewers?.toString(),
        cdnliveEmbedId: `${channel.name}|${channel.code}`,
        channels: [{
          name: channel.name,
          channelId: `${channel.name}|${channel.code}`,
          href: channel.url,
        }],
      }));

      setCdnliveEvents(events);
    } catch (error) {
      setCdnliveError(error instanceof Error ? error.message : 'Failed to load CDN Live');
    } finally {
      setCdnliveLoading(false);
    }
  }, []);


  // PPV Fetcher
  const fetchPPV = useCallback(async () => {
    setPpvLoading(true);
    setPpvError(null);
    
    try {
      const response = await fetch('/api/livetv/ppv-streams');
      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'PPV API error');

      const events: LiveEvent[] = [];
      for (const category of data.categories || []) {
        for (const stream of category.streams || []) {
          const startTime = new Date(stream.startsAt * 1000);
          events.push({
            id: `ppv-${stream.id}`,
            title: stream.name,
            sport: category.name,
            time: startTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            isLive: stream.isLive || stream.isAlwaysLive,
            source: 'ppv',
            poster: stream.poster,
            viewers: stream.viewers,
            ppvUriName: stream.uriName,
            startsAt: stream.startsAt,
            endsAt: stream.endsAt,
            channels: [{
              name: stream.name,
              channelId: stream.uriName,
              href: `/livetv/ppv/${stream.uriName}`,
            }],
          });
        }
      }

      setPpvEvents(events);
    } catch (error) {
      setPpvError(error instanceof Error ? error.message : 'Failed to load PPV');
    } finally {
      setPpvLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchDLHD();
    fetchCDNLive();
    fetchPPV();
  }, [fetchDLHD, fetchCDNLive, fetchPPV]);

  // Current Provider Data
  const currentData = useMemo(() => {
    switch (selectedProvider) {
      case 'dlhd':
        return {
          events: dlhdEvents,
          channels: dlhdChannels,
          categories: generateCategories(dlhdEvents, dlhdChannels, false),
          loading: dlhdLoading,
          error: dlhdError,
        };
      case 'cdnlive':
        return {
          events: cdnliveEvents,
          channels: [] as DLHDChannel[],
          categories: generateCategories(cdnliveEvents, [], false),
          loading: cdnliveLoading,
          error: cdnliveError,
        };
      case 'ppv':
        return {
          events: ppvEvents,
          channels: [] as DLHDChannel[],
          categories: generateCategories(ppvEvents, [], false),
          loading: ppvLoading,
          error: ppvError,
        };
      default:
        return { events: [], channels: [], categories: [], loading: false, error: null };
    }
  }, [
    selectedProvider,
    dlhdEvents, dlhdChannels, dlhdLoading, dlhdError,
    cdnliveEvents, cdnliveLoading, cdnliveError,
    ppvEvents, ppvLoading, ppvError,
  ]);

  // Search Filter
  const filteredData = useMemo(() => {
    if (!searchQuery) return currentData;

    const query = searchQuery.toLowerCase();
    
    return {
      ...currentData,
      events: currentData.events.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.sport?.toLowerCase().includes(query) ||
        event.league?.toLowerCase().includes(query) ||
        event.teams?.home.toLowerCase().includes(query) ||
        event.teams?.away.toLowerCase().includes(query)
      ),
      channels: currentData.channels.filter(channel =>
        channel.name.toLowerCase().includes(query) ||
        channel.category.toLowerCase().includes(query) ||
        channel.country.toLowerCase().includes(query)
      ),
    };
  }, [currentData, searchQuery]);

  // Stats
  const stats: ProviderStats = useMemo(() => ({
    dlhd: {
      events: dlhdEvents.length,
      channels: dlhdChannels.length,
      live: dlhdEvents.filter(e => e.isLive).length,
    },
    cdnlive: {
      channels: cdnliveEvents.length,
    },
    ppv: {
      events: ppvEvents.length,
      live: ppvEvents.filter(e => e.isLive).length,
    },
  }), [dlhdEvents, dlhdChannels, cdnliveEvents, ppvEvents]);

  // Refresh
  const refresh = useCallback(() => {
    switch (selectedProvider) {
      case 'dlhd': fetchDLHD(); break;
      case 'cdnlive': fetchCDNLive(); break;
      case 'ppv': fetchPPV(); break;
    }
  }, [selectedProvider, fetchDLHD, fetchCDNLive, fetchPPV]);

  return {
    selectedProvider,
    setSelectedProvider,
    events: filteredData.events,
    channels: filteredData.channels,
    categories: filteredData.categories,
    loading: filteredData.loading,
    error: filteredData.error,
    searchQuery,
    setSearchQuery,
    stats,
    refresh,
  };
}
