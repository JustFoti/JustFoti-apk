/**
 * DLHD.dad Sports Events API Client
 * 
 * Fetches and parses sports events from dlhd.dad
 * Returns structured JSON data for events and channels
 */

const https = require('https');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = __dirname;

const SCHEDULE_SOURCES = [
    { name: 'main', endpoint: null }, // Main page HTML
    { name: 'extra', endpoint: '/schedule-api.php?source=extra' },
    { name: 'extra_ppv', endpoint: '/schedule-api.php?source=extra_ppv' },
    { name: 'extra_topembed', endpoint: '/schedule-api.php?source=extra_topembed' },
    { name: 'extra_backup', endpoint: '/schedule-api.php?source=extra_backup' },
];

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/html',
                'Referer': 'https://dlhd.dad/'
            }
        };
        
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parseEventsFromHTML(html) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const events = [];
    
    // Find all event elements
    const eventElements = doc.querySelectorAll('.schedule__event');
    
    eventElements.forEach(eventEl => {
        const event = {
            time: '',
            dataTime: '',
            title: '',
            channels: [],
            isLive: false
        };
        
        // Get event header
        const header = eventEl.querySelector('.schedule__eventHeader');
        if (header) {
            const timeEl = header.querySelector('.schedule__time');
            const titleEl = header.querySelector('.schedule__eventTitle');
            
            if (timeEl) {
                event.time = timeEl.textContent.trim();
                event.dataTime = timeEl.getAttribute('data-time') || '';
            }
            if (titleEl) {
                event.title = titleEl.textContent.trim();
            }
            
            // Check for live indicator
            if (header.classList.contains('is-live') || 
                header.querySelector('.live') ||
                header.textContent.toLowerCase().includes('live')) {
                event.isLive = true;
            }
        }
        
        // Get channels
        const channelsEl = eventEl.querySelector('.schedule__channels');
        if (channelsEl) {
            const links = channelsEl.querySelectorAll('a');
            links.forEach(link => {
                const channel = {
                    name: link.textContent.trim(),
                    href: link.getAttribute('href') || '',
                    channelId: null,
                    dataCh: link.getAttribute('data-ch') || ''
                };
                
                // Extract channel ID from href
                const idMatch = channel.href.match(/id=([^&|]+)/);
                if (idMatch) {
                    channel.channelId = idMatch[1];
                }
                
                // For s2watch links, extract the full ID
                if (channel.href.includes('watchs2watch')) {
                    const fullMatch = channel.href.match(/id=([^&]+)/);
                    if (fullMatch) {
                        channel.s2watchId = decodeURIComponent(fullMatch[1]);
                    }
                }
                
                event.channels.push(channel);
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
            icon: '',
            events: []
        };
        
        const header = catEl.querySelector('.schedule__catHeader');
        if (header) {
            // Get icon class
            const icon = header.querySelector('i');
            if (icon) {
                category.icon = icon.className;
            }
            // Get category name (text without icon)
            category.name = header.textContent.trim();
        }
        
        // Get events in this category
        const eventElements = catEl.querySelectorAll('.schedule__event');
        eventElements.forEach(eventEl => {
            const events = parseEventsFromHTML(eventEl.outerHTML);
            category.events.push(...events);
        });
        
        if (category.name && category.events.length > 0) {
            categories.push(category);
        }
    });
    
    return categories;
}

async function fetchAllEvents() {
    console.log('='.repeat(60));
    console.log('DLHD.dad Sports Events API Client');
    console.log('='.repeat(60));
    
    const allData = {
        fetchedAt: new Date().toISOString(),
        sources: {}
    };
    
    // Fetch main page
    console.log('\nFetching main page...');
    try {
        const mainHtml = await fetchUrl('https://dlhd.dad/');
        const mainCategories = parseCategoriesFromHTML(mainHtml);
        const mainEvents = parseEventsFromHTML(mainHtml);
        
        allData.sources.main = {
            categories: mainCategories,
            totalEvents: mainEvents.length,
            events: mainEvents
        };
        console.log(`  Main page: ${mainEvents.length} events in ${mainCategories.length} categories`);
    } catch (err) {
        console.log(`  Error fetching main page: ${err.message}`);
    }
    
    // Fetch API sources
    for (const source of SCHEDULE_SOURCES) {
        if (!source.endpoint) continue;
        
        console.log(`\nFetching ${source.name}...`);
        try {
            const response = await fetchUrl(`https://dlhd.dad${source.endpoint}`);
            const json = JSON.parse(response);
            
            if (json.success && json.html) {
                const events = parseEventsFromHTML(json.html);
                allData.sources[source.name] = {
                    totalEvents: events.length,
                    events: events
                };
                console.log(`  ${source.name}: ${events.length} events`);
            }
        } catch (err) {
            console.log(`  Error fetching ${source.name}: ${err.message}`);
        }
    }
    
    // Calculate totals
    let totalEvents = 0;
    let totalChannels = 0;
    for (const [name, data] of Object.entries(allData.sources)) {
        totalEvents += data.totalEvents || 0;
        if (data.events) {
            data.events.forEach(e => {
                totalChannels += e.channels.length;
            });
        }
    }
    
    allData.summary = {
        totalSources: Object.keys(allData.sources).length,
        totalEvents,
        totalChannelLinks: totalChannels
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Sources: ${allData.summary.totalSources}`);
    console.log(`Total Events: ${allData.summary.totalEvents}`);
    console.log(`Total Channel Links: ${allData.summary.totalChannelLinks}`);
    
    // Save to file
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'dlhd-all-events.json'),
        JSON.stringify(allData, null, 2)
    );
    console.log('\nSaved to dlhd-all-events.json');
    
    return allData;
}

// Run if called directly
if (require.main === module) {
    fetchAllEvents()
        .then(() => console.log('\nDone!'))
        .catch(err => console.error('Error:', err));
}

module.exports = { fetchAllEvents, parseEventsFromHTML, parseCategoriesFromHTML };
