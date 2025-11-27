/**
 * Live TV Schedule API
 * 
 * Fetches and returns sports events schedule from DLHD.
 * Shows what's currently playing or upcoming on each channel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

export const runtime = 'nodejs';
export const revalidate = 60; // Revalidate every minute for live data

interface SportEvent {
  id: string;
  time: string;
  dataTime: string; // UK GMT time
  title: string;
  sport?: string;
  league?: string;
  teams?: {
    home: string;
    away: string;
  };
  isLive: boolean;
  channels: {
    name: string;
    channelId: string;
    href: string;
  }[];
}

interface ScheduleCategory {
  name: string;
  icon: string;
  events: SportEvent[];
}

const SPORT_ICONS: Record<string, string> = {
  'soccer': '⚽',
  'football': '⚽',
  'basketball': '🏀',
  'tennis': '🎾',
  'cricket': '🏏',
  'hockey': '🏒',
  'ice hockey': '🏒',
  'field hockey': '🏑',
  'baseball': '⚾',
  'golf': '⛳',
  'rugby': '🏉',
  'rugby league': '🏉',
  'rugby union': '🏉',
  'motorsport': '🏎️',
  'f1': '🏎️',
  'formula': '🏎️',
  'boxing': '🥊',
  'mma': '🥊',
  'ufc': '🥊',
  'wwe': '🤼',
  'wrestling': '🤼',
  'volleyball': '🏐',
  'handball': '🤾',
  'am. football': '🏈',
  'nfl': '🏈',
  'ncaa': '🏈',
  'horse racing': '🏇',
  'equestrian': '🐎',
  'alpine ski': '⛷️',
  'winter sports': '❄️',
  'curling': '🥌',
  'squash': '🎾',
  'futsal': '⚽',
  'combat sports': '🥋',
  'tv shows': '📺',
};

function parseEventsFromHTML(html: string): SportEvent[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const events: SportEvent[] = [];
  
  const eventElements = doc.querySelectorAll('.schedule__event');
  
  eventElements.forEach((eventEl, index) => {
    const event: SportEvent = {
      id: `event-${Date.now()}-${index}`,
      time: '',
      dataTime: '',
      title: '',
      isLive: false,
      channels: []
    };
    
    const header = eventEl.querySelector('.schedule__eventHeader');
    if (header) {
      const timeEl = header.querySelector('.schedule__time');
      const titleEl = header.querySelector('.schedule__eventTitle');
      
      if (timeEl) {
        event.time = timeEl.textContent?.trim() || '';
        event.dataTime = timeEl.getAttribute('data-time') || '';
      }
      if (titleEl) {
        event.title = titleEl.textContent?.trim() || '';
      }
      
      // Parse title for teams (look for "vs" pattern)
      const vsMatch = event.title.match(/(.+?)\s+vs\.?\s+(.+?)(?:\s*-\s*(.+))?$/i);
      if (vsMatch) {
        event.teams = {
          home: vsMatch[1].trim(),
          away: vsMatch[2].trim()
        };
        if (vsMatch[3]) {
          event.league = vsMatch[3].trim();
        }
      }
      
      // Check for live indicator
      const headerText = header.textContent?.toLowerCase() || '';
      if (header.classList.contains('is-live') || 
          headerText.includes('live') ||
          eventEl.classList.contains('is-live')) {
        event.isLive = true;
      }
    }
    
    // Get channels
    const channelsEl = eventEl.querySelector('.schedule__channels');
    if (channelsEl) {
      const links = channelsEl.querySelectorAll('a');
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        let channelId = '';
        
        // Extract channel ID from different URL formats
        const idMatch = href.match(/id=([^&|]+)/);
        if (idMatch) {
          channelId = idMatch[1];
        }
        
        event.channels.push({
          name: link.textContent?.trim() || '',
          channelId,
          href
        });
      });
    }
    
    if (event.title || event.time) {
      events.push(event);
    }
  });
  
  return events;
}

function parseCategoriesFromHTML(html: string): ScheduleCategory[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const categories: ScheduleCategory[] = [];
  
  const categoryElements = doc.querySelectorAll('.schedule__category');
  
  categoryElements.forEach(catEl => {
    const category: ScheduleCategory = {
      name: '',
      icon: '📺',
      events: []
    };
    
    const header = catEl.querySelector('.schedule__catHeader');
    if (header) {
      category.name = header.textContent?.trim() || '';
      
      // Find matching icon
      const nameLower = category.name.toLowerCase();
      for (const [key, icon] of Object.entries(SPORT_ICONS)) {
        if (nameLower.includes(key)) {
          category.icon = icon;
          break;
        }
      }
    }
    
    // Parse events within this category
    const eventElements = catEl.querySelectorAll('.schedule__event');
    eventElements.forEach((eventEl) => {
      const events = parseEventsFromHTML(eventEl.outerHTML);
      events.forEach(e => {
        e.sport = category.name;
      });
      category.events.push(...events);
    });
    
    if (category.name && category.events.length > 0) {
      categories.push(category);
    }
  });
  
  return categories;
}

async function fetchScheduleHTML(source?: string): Promise<string> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/html',
    'Referer': 'https://dlhd.dad/'
  };
  
  if (source) {
    // Fetch from API endpoint
    const response = await fetch(`https://dlhd.dad/schedule-api.php?source=${source}`, { headers });
    const json = await response.json();
    if (json.success && json.html) {
      return json.html;
    }
    return '';
  } else {
    // Fetch main page
    const response = await fetch('https://dlhd.dad/', { headers });
    return await response.text();
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source'); // 'main', 'extra', 'extra_ppv', etc.
    const sport = searchParams.get('sport');
    const search = searchParams.get('search');
    const liveOnly = searchParams.get('live') === 'true';
    
    // Determine which source to fetch
    let html: string;
    if (source === 'extra') {
      html = await fetchScheduleHTML('extra');
    } else if (source === 'extra_ppv') {
      html = await fetchScheduleHTML('extra_ppv');
    } else if (source === 'extra_topembed') {
      html = await fetchScheduleHTML('extra_topembed');
    } else {
      // Default: fetch main page
      html = await fetchScheduleHTML();
    }
    
    // Parse categories and events
    let categories = parseCategoriesFromHTML(html);
    
    // If no categories found, try parsing events directly
    if (categories.length === 0) {
      const events = parseEventsFromHTML(html);
      if (events.length > 0) {
        categories = [{
          name: 'All Events',
          icon: '📺',
          events
        }];
      }
    }
    
    // Filter by sport
    if (sport && sport !== 'all') {
      categories = categories.filter(cat => 
        cat.name.toLowerCase().includes(sport.toLowerCase())
      );
    }
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      categories = categories.map(cat => ({
        ...cat,
        events: cat.events.filter(e => 
          e.title.toLowerCase().includes(searchLower) ||
          e.channels.some(ch => ch.name.toLowerCase().includes(searchLower))
        )
      })).filter(cat => cat.events.length > 0);
    }
    
    // Filter live only
    if (liveOnly) {
      categories = categories.map(cat => ({
        ...cat,
        events: cat.events.filter(e => e.isLive)
      })).filter(cat => cat.events.length > 0);
    }
    
    // Calculate stats
    const totalEvents = categories.reduce((sum, cat) => sum + cat.events.length, 0);
    const totalChannels = categories.reduce((sum, cat) => 
      sum + cat.events.reduce((s, e) => s + e.channels.length, 0), 0
    );
    const liveEvents = categories.reduce((sum, cat) => 
      sum + cat.events.filter(e => e.isLive).length, 0
    );
    
    // Get unique sports for filter
    const sports = categories.map(cat => ({
      name: cat.name,
      icon: cat.icon,
      count: cat.events.length
    }));
    
    return NextResponse.json({
      success: true,
      schedule: {
        date: new Date().toISOString().split('T')[0],
        timezone: 'UK GMT',
        categories
      },
      stats: {
        totalCategories: categories.length,
        totalEvents,
        totalChannels,
        liveEvents
      },
      filters: {
        sports
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
    
  } catch (error) {
    console.error('[Schedule API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}
