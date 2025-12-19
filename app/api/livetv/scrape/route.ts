/**
 * Live TV Channel Scraper API
 * 
 * Scrapes channel information from daddyhd.com to get real channel names and IDs.
 * This is used to populate the channel list dynamically.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DLHD_BASE_URL = 'https://daddyhd.com';

interface ScrapedChannel {
  id: string;
  name: string;
  streamId: string;
  category: string;
  url: string;
}

/**
 * Scrape the DLHD homepage to get channel listings
 */
async function scrapeChannels(): Promise<ScrapedChannel[]> {
  try {
    const response = await fetch(DLHD_BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch DLHD: ${response.status}`);
    }

    const html = await response.text();
    const channels: ScrapedChannel[] = [];

    // Parse channel links from the HTML
    // Pattern: /casting/stream-{ID}.php with channel name
    const streamPattern = /href=["']\/casting\/stream-(\d+)\.php["'][^>]*>([^<]+)</gi;
    let match;

    while ((match = streamPattern.exec(html)) !== null) {
      const streamId = match[1];
      const name = match[2].trim();

      if (name && streamId) {
        // Determine category based on name
        let category = 'entertainment';
        const nameLower = name.toLowerCase();

        if (nameLower.includes('sport') || nameLower.includes('espn') || 
            nameLower.includes('sky sport') || nameLower.includes('bt sport') ||
            nameLower.includes('football') || nameLower.includes('soccer') ||
            nameLower.includes('nba') || nameLower.includes('nfl') ||
            nameLower.includes('cricket') || nameLower.includes('tennis') ||
            nameLower.includes('f1') || nameLower.includes('racing') ||
            nameLower.includes('golf') || nameLower.includes('boxing') ||
            nameLower.includes('ufc') || nameLower.includes('wwe')) {
          category = 'sports';
        } else if (nameLower.includes('news') || nameLower.includes('cnn') ||
                   nameLower.includes('bbc') || nameLower.includes('fox news') ||
                   nameLower.includes('msnbc') || nameLower.includes('cnbc')) {
          category = 'news';
        } else if (nameLower.includes('movie') || nameLower.includes('cinema') ||
                   nameLower.includes('hbo') || nameLower.includes('showtime') ||
                   nameLower.includes('starz') || nameLower.includes('cinemax')) {
          category = 'movies';
        } else if (nameLower.includes('discovery') || nameLower.includes('nat geo') ||
                   nameLower.includes('history') || nameLower.includes('animal')) {
          category = 'documentary';
        } else if (nameLower.includes('cartoon') || nameLower.includes('nick') ||
                   nameLower.includes('disney') || nameLower.includes('kids')) {
          category = 'kids';
        } else if (nameLower.includes('mtv') || nameLower.includes('vh1') ||
                   nameLower.includes('music')) {
          category = 'music';
        }

        channels.push({
          id: `channel-${streamId}`,
          name,
          streamId,
          category,
          url: `/casting/stream-${streamId}.php`,
        });
      }
    }

    return channels;
  } catch (error) {
    console.error('[Scraper] Error:', error);
    return [];
  }
}

export async function GET(_request: NextRequest) {
  try {
    // For now, return scraped channels
    const channels = await scrapeChannels();

    if (channels.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No channels found',
        message: 'Could not scrape channel list from source',
      }, { status: 500 });
    }

    // Group by category
    const categories = [
      { id: 'sports', name: 'Sports', icon: '⚽' },
      { id: 'news', name: 'News', icon: '📰' },
      { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
      { id: 'movies', name: 'Movies', icon: '🎥' },
      { id: 'documentary', name: 'Documentary', icon: '🌍' },
      { id: 'kids', name: 'Kids', icon: '🧸' },
      { id: 'music', name: 'Music', icon: '🎵' },
    ];

    const groupedChannels = categories.map(cat => ({
      ...cat,
      channels: channels.filter(ch => ch.category === cat.id),
    })).filter(cat => cat.channels.length > 0);

    return NextResponse.json({
      success: true,
      categories: groupedChannels,
      totalChannels: channels.length,
      scrapedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });

  } catch (error) {
    console.error('[Scraper API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scrape channels' },
      { status: 500 }
    );
  }
}
