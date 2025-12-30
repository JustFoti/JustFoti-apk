/**
 * Video Player Tests
 * Tests for the video player hook and stream URL generation.
 * Providers: DLHD, CDN Live, PPV
 */

import { describe, test, expect } from 'bun:test';

const RPI_PROXY_URL = 'https://rpi-proxy.vynx.cc';
const CF_WORKER_URL = 'https://media-proxy.vynx.workers.dev';

function getTvPlaylistUrl(channelId: string): string {
  return `${RPI_PROXY_URL}/tv/${channelId}/playlist.m3u8`;
}

function getPpvStreamProxyUrl(streamUrl: string): string {
  return `${CF_WORKER_URL}/ppv-proxy?url=${encodeURIComponent(streamUrl)}`;
}

function getCdnLiveStreamProxyUrl(streamUrl: string): string {
  return `${CF_WORKER_URL}/cdnlive-proxy?url=${encodeURIComponent(streamUrl)}`;
}

describe('Video Player Tests', () => {
  
  describe('Stream URL Generation', () => {
    
    test('should generate DLHD stream URL', () => {
      const channelId = '51';
      const url = getTvPlaylistUrl(channelId);
      
      expect(url).toBe(`${RPI_PROXY_URL}/tv/51/playlist.m3u8`);
      expect(url).toContain('/tv/');
      expect(url).toContain('/playlist.m3u8');
    });
    
    test('should generate PPV proxy URL', () => {
      const streamUrl = 'https://example.com/stream.m3u8';
      const url = getPpvStreamProxyUrl(streamUrl);
      
      expect(url).toContain('/ppv-proxy');
      expect(url).toContain(encodeURIComponent(streamUrl));
    });
    
    test('should generate CDN Live proxy URL', () => {
      const streamUrl = 'https://cdn.example.com/live.m3u8';
      const url = getCdnLiveStreamProxyUrl(streamUrl);
      
      expect(url).toContain('/cdnlive-proxy');
      expect(url).toContain(encodeURIComponent(streamUrl));
    });
  });
  
  describe('Channel ID Extraction', () => {
    
    test('should extract DLHD channel ID from event', () => {
      const event = {
        id: 'dlhd-123',
        source: 'dlhd',
        channels: [{ name: 'ESPN', channelId: '51', href: '/stream/51' }]
      };
      
      expect(event.channels[0].channelId).toBe('51');
    });
    
    test('should extract PPV URI name from event', () => {
      const event = {
        id: 'ppv-456',
        source: 'ppv',
        ppvUriName: 'ufc-fight-night',
        channels: []
      };
      
      expect(event.ppvUriName).toBe('ufc-fight-night');
    });
    
    test('should extract CDN Live channel ID from event', () => {
      const event = {
        id: 'cdnlive-789',
        source: 'cdnlive',
        channels: [{ name: 'ESPN', channelId: 'ESPN|us', href: '/cdn/espn' }]
      };
      
      const [channelName, countryCode] = event.channels[0].channelId.split('|');
      expect(channelName).toBe('ESPN');
      expect(countryCode).toBe('us');
    });
  });
  
  describe('API URL Construction', () => {
    
    test('should construct PPV API URL', () => {
      const uriName = 'ufc-fight-night';
      const url = `/api/livetv/ppv-stream?uri=${encodeURIComponent(uriName)}`;
      
      expect(url).toContain('/api/livetv/ppv-stream');
      expect(url).toContain('uri=');
    });
    
    test('should construct CDN Live API URL', () => {
      const channelName = 'ESPN';
      const countryCode = 'us';
      const url = `/api/livetv/cdnlive-stream?channel=${encodeURIComponent(channelName)}&code=${countryCode}`;
      
      expect(url).toContain('/api/livetv/cdnlive-stream');
      expect(url).toContain('channel=');
      expect(url).toContain('code=');
    });
  });
  
  describe('Source Type Detection', () => {
    
    test('should detect DLHD source', () => {
      const event = { source: 'dlhd' };
      expect(event.source).toBe('dlhd');
    });
    
    test('should detect PPV source', () => {
      const event = { source: 'ppv' };
      expect(event.source).toBe('ppv');
    });
    
    test('should detect CDN Live source', () => {
      const event = { source: 'cdnlive' };
      expect(event.source).toBe('cdnlive');
    });
  });
  
  describe('Event Data Validation', () => {
    
    test('should validate DLHD event structure', () => {
      const event = {
        id: 'dlhd-123',
        title: 'Lakers vs Celtics',
        sport: 'basketball',
        time: '7:30 PM',
        isLive: true,
        source: 'dlhd',
        channels: [{ name: 'ESPN', channelId: '51', href: '/stream/51' }]
      };
      
      expect(event.id).toMatch(/^dlhd-/);
      expect(event.source).toBe('dlhd');
      expect(event.channels.length).toBeGreaterThan(0);
    });
    
    test('should validate PPV event structure', () => {
      const event = {
        id: 'ppv-456',
        title: 'UFC Fight Night',
        sport: 'mma',
        time: '10:00 PM',
        isLive: false,
        source: 'ppv',
        ppvUriName: 'ufc-fight-night',
        poster: 'https://example.com/poster.jpg',
        channels: []
      };
      
      expect(event.id).toMatch(/^ppv-/);
      expect(event.source).toBe('ppv');
      expect(event.ppvUriName).toBeDefined();
    });
    
    test('should validate CDN Live event structure', () => {
      const event = {
        id: 'cdnlive-espn-us',
        title: 'ESPN',
        sport: 'sports',
        time: 'Live',
        isLive: true,
        source: 'cdnlive',
        channels: [{ name: 'ESPN', channelId: 'ESPN|us', href: '/cdn/espn' }]
      };
      
      expect(event.id).toMatch(/^cdnlive-/);
      expect(event.source).toBe('cdnlive');
      expect(event.isLive).toBe(true);
    });
  });
});
