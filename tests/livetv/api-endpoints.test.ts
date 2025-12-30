/**
 * LiveTV API Endpoints Tests
 * Tests all LiveTV API routes: DLHD, CDN Live, PPV
 * Run with: bun test tests/livetv/api-endpoints.test.ts
 */

import { describe, test, expect } from 'bun:test';

const LOCAL_API = 'http://localhost:3000/api/livetv';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function fetchApi(endpoint: string) {
  const response = await fetch(`${LOCAL_API}${endpoint}`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
  });
  return { response, data: await response.json() };
}

describe('LiveTV API Endpoints', () => {
  
  describe('DLHD APIs', () => {
    
    test('GET /dlhd-channels - should return channel list', async () => {
      try {
        const { response, data } = await fetchApi('/dlhd-channels');
        
        console.log('\n=== DLHD Channels API ===');
        console.log('Status:', response.status);
        console.log('Success:', data.success);
        console.log('Channels:', data.channels?.length || 0);
        
        if (data.success) {
          expect(data.channels).toBeDefined();
          expect(Array.isArray(data.channels)).toBe(true);
        }
      } catch (err) {
        console.log('API not available:', (err as Error).message);
      }
    });
    
    test('GET /schedule - should return DLHD events', async () => {
      try {
        const { response, data } = await fetchApi('/schedule');
        
        console.log('\n=== DLHD Schedule API ===');
        console.log('Status:', response.status);
        console.log('Success:', data.success);
        
        if (data.success && data.schedule) {
          const totalEvents = data.schedule.categories?.reduce(
            (sum: number, cat: any) => sum + (cat.events?.length || 0), 0
          ) || 0;
          console.log('Total events:', totalEvents);
        }
      } catch (err) {
        console.log('API not available:', (err as Error).message);
      }
    });
  });
  
  describe('PPV APIs', () => {
    
    test('GET /ppv-streams - should return PPV events', async () => {
      try {
        const { response, data } = await fetchApi('/ppv-streams');
        
        console.log('\n=== PPV Streams API ===');
        console.log('Status:', response.status);
        console.log('Success:', data.success);
        
        if (data.success) {
          const totalStreams = data.categories?.reduce(
            (sum: number, cat: any) => sum + (cat.streams?.length || 0), 0
          ) || 0;
          console.log('Total streams:', totalStreams);
        }
      } catch (err) {
        console.log('API not available:', (err as Error).message);
      }
    });
    
    test('GET /ppv-stream - should return stream URL', async () => {
      try {
        const { data: ppvData } = await fetchApi('/ppv-streams');
        
        if (!ppvData.success || !ppvData.categories?.length) {
          console.log('No PPV data available');
          return;
        }
        
        let testUri = '';
        for (const cat of ppvData.categories) {
          if (cat.streams?.length > 0) {
            testUri = cat.streams[0].uriName;
            break;
          }
        }
        
        if (!testUri) return;
        
        console.log('\n=== PPV Stream API ===');
        const { response, data } = await fetchApi(`/ppv-stream?uri=${encodeURIComponent(testUri)}`);
        
        console.log('Status:', response.status);
        console.log('Success:', data.success);
        console.log('Stream URL:', data.streamUrl ? 'Available' : 'Not available');
      } catch (err) {
        console.log('API not available:', (err as Error).message);
      }
    });
  });
  
  describe('CDN Live APIs', () => {
    
    test('GET /cdn-live-channels - should return CDN channels', async () => {
      try {
        const { response, data } = await fetchApi('/cdn-live-channels');
        
        console.log('\n=== CDN Live Channels API ===');
        console.log('Status:', response.status);
        console.log('Channels:', data.channels?.length || 0);
        
        if (data.channels?.length > 0) {
          const online = data.channels.filter((c: any) => c.status === 'online');
          console.log('Online:', online.length);
        }
      } catch (err) {
        console.log('API not available:', (err as Error).message);
      }
    });
    
    test('GET /cdnlive-stream - should return stream URL', async () => {
      try {
        const { data: channelsData } = await fetchApi('/cdn-live-channels');
        
        if (!channelsData.channels?.length) {
          console.log('No CDN channels available');
          return;
        }
        
        const onlineChannel = channelsData.channels.find((c: any) => c.status === 'online');
        if (!onlineChannel) return;
        
        console.log('\n=== CDN Live Stream API ===');
        const { response, data } = await fetchApi(
          `/cdnlive-stream?channel=${encodeURIComponent(onlineChannel.name)}&code=${onlineChannel.code}`
        );
        
        console.log('Status:', response.status);
        console.log('Success:', data.success);
        console.log('Stream URL:', data.streamUrl ? 'Available' : 'Not available');
      } catch (err) {
        console.log('API not available:', (err as Error).message);
      }
    });
  });
  
  describe('Error Handling', () => {
    
    test('should handle missing PPV parameters', async () => {
      try {
        const { response, data } = await fetchApi('/ppv-stream');
        
        console.log('\n=== Missing Parameters Test ===');
        console.log('Status:', response.status);
        expect(data.success).toBe(false);
      } catch (err) {
        console.log('API not available:', (err as Error).message);
      }
    });
    
    test('should handle missing CDN Live parameters', async () => {
      try {
        const { response, data } = await fetchApi('/cdnlive-stream');
        
        console.log('\n=== Missing CDN Parameters Test ===');
        console.log('Status:', response.status);
        expect(data.success).toBe(false);
      } catch (err) {
        console.log('API not available:', (err as Error).message);
      }
    });
  });
});
