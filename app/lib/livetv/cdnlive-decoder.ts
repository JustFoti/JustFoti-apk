/**
 * CDN Live Stream Helper (via Cinephage bypass)
 * 
 * The Cinephage API returns stream URLs directly - no decoding needed!
 * This module provides helper functions for working with the API.
 */

const API_BASE = 'https://api.cinephage.net/livetv';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface DecodedStream {
  success: boolean;
  streamUrl?: string;
  channelId?: string;
  channelName?: string;
  country?: string;
  resolution?: string;
  token?: string;
  expiresAt?: number;
  error?: string;
}

interface CinephageStreamResponse {
  channel: {
    id: string;
    name: string;
    country: string;
  };
  stream: {
    url: string;
    type: string;
    resolution: string;
    expires_at: number;
  };
  playback: {
    headers: {
      Referer: string;
      'User-Agent': string;
    };
  };
}

/**
 * Get stream URL from Cinephage API
 * No decoding needed - the API returns the stream URL directly!
 */
export async function getCDNLiveStreamUrl(
  channelName: string,
  countryCode: string = 'us'
): Promise<DecodedStream> {
  try {
    const url = `${API_BASE}/stream/${countryCode}/${encodeURIComponent(channelName)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `Channel not found or offline: ${response.status}`,
      };
    }
    
    const data: CinephageStreamResponse = await response.json();
    
    // Extract token from URL for TTL calculation
    const urlObj = new URL(data.stream.url);
    const token = urlObj.searchParams.get('token') || '';
    
    return {
      success: true,
      streamUrl: data.stream.url,
      channelId: data.channel.id,
      channelName: data.channel.name,
      country: data.channel.country,
      resolution: data.stream.resolution,
      token,
      expiresAt: data.stream.expires_at,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stream',
    };
  }
}

/**
 * Legacy function - redirects to getCDNLiveStreamUrl
 * Kept for backwards compatibility
 */
export async function decodeStreamFromPlayer(playerUrl: string): Promise<DecodedStream> {
  // Extract channel name and country from player URL if possible
  // Format: /stream/{country}/{channel}
  try {
    const url = new URL(playerUrl, 'https://api.cinephage.net');
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    if (pathParts.length >= 3 && pathParts[0] === 'stream') {
      const country = pathParts[1];
      const channel = decodeURIComponent(pathParts[2]);
      return getCDNLiveStreamUrl(channel, country);
    }
    
    // Try to extract from old cdn-live.tv format
    const nameMatch = playerUrl.match(/name=([^&]+)/);
    const codeMatch = playerUrl.match(/code=([^&]+)/);
    
    if (nameMatch) {
      const channel = decodeURIComponent(nameMatch[1]);
      const country = codeMatch ? decodeURIComponent(codeMatch[1]) : 'us';
      return getCDNLiveStreamUrl(channel, country);
    }
    
    return {
      success: false,
      error: 'Could not parse player URL',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse URL',
    };
  }
}

/**
 * Check if a token is still valid
 */
export function isTokenValid(expiresAt?: number): boolean {
  if (!expiresAt) return true;
  const now = Math.floor(Date.now() / 1000);
  return expiresAt > now;
}

/**
 * Get time until token expires (in seconds)
 */
export function getTokenTTL(expiresAt?: number): number {
  if (!expiresAt) return Infinity;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, expiresAt - now);
}
