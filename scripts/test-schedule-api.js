/**
 * Test the schedule API parsing logic
 */

const { JSDOM } = require('jsdom');

const SPORT_ICONS = {
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
  'motorsport': '🏎️',
  'boxing': '🥊',
  'mma': '🥊',
  'wwe': '🤼',
  'wrestling': '🤼',
  'volleyball': '🏐',
  'handball': '🤾',
  'am. football': '🏈',
  'nfl': '🏈',
  'ncaa': '🏈',
  'horse racing': '🏇',
  'alpine ski': '⛷️',
  'winter sports': '❄️',
  'tv shows': '📺',
};

function parseEventsFromHTML(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const events = [];
  
  const eventElements = doc.querySelectorAll('.schedule__event');
  
  eventElements.forEach((eventEl, index) => {
    const event = {
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
      
      // Parse title for teams
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
    }
    
    // Get channels
    const channelsEl = eventEl.querySelector('.schedule__channels');
    if (channelsEl) {
      const links = channelsEl.querySelectorAll('a');
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        let channelId = '';
        
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

function parseCategoriesFromHTML(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const categories = [];
  
  const categoryElements = doc.querySelectorAll('.schedule__category');
  
  categoryElements.forEach(catEl => {
    const category = {
      name: '',
      icon: '📺',
      events: []
    };
    
    const header = catEl.querySelector('.schedule__catHeader');
    if (header) {
      category.name = header.textContent?.trim() || '';
      
      const nameLower = category.name.toLowerCase();
      for (const [key, icon] of Object.entries(SPORT_ICONS)) {
        if (nameLower.includes(key)) {
          category.icon = icon;
          break;
        }
      }
    }
    
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

async function testScheduleAPI() {
  console.log('Testing Schedule API parsing...\n');
  
  // Fetch main page
  const response = await fetch('https://dlhd.dad/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html'
    }
  });
  
  const html = await response.text();
  console.log(`Fetched ${html.length} bytes\n`);
  
  // Parse categories
  const categories = parseCategoriesFromHTML(html);
  
  console.log(`Found ${categories.length} categories:\n`);
  
  categories.forEach(cat => {
    console.log(`${cat.icon} ${cat.name}: ${cat.events.length} events`);
    
    // Show first 2 events
    cat.events.slice(0, 2).forEach(event => {
      console.log(`   ${event.time} - ${event.title}`);
      if (event.teams) {
        console.log(`      Teams: ${event.teams.home} vs ${event.teams.away}`);
      }
      console.log(`      Channels: ${event.channels.map(c => c.name).slice(0, 3).join(', ')}...`);
    });
    console.log('');
  });
  
  // Stats
  const totalEvents = categories.reduce((sum, cat) => sum + cat.events.length, 0);
  const totalChannels = categories.reduce((sum, cat) => 
    sum + cat.events.reduce((s, e) => s + e.channels.length, 0), 0
  );
  
  console.log('='.repeat(50));
  console.log(`Total Categories: ${categories.length}`);
  console.log(`Total Events: ${totalEvents}`);
  console.log(`Total Channel Links: ${totalChannels}`);
}

testScheduleAPI().catch(console.error);
