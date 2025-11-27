/**
 * DLHD.dad Sports Events Extractor
 * 
 * Extracts the schedule/events structure from the homepage
 * to understand how sports events are displayed with channels.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = __dirname;

async function extractDLHDEvents() {
    console.log('='.repeat(60));
    console.log('DLHD.dad Sports Events Extraction');
    console.log('='.repeat(60));
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('\nNavigating to dlhd.dad homepage...');
        await page.goto('https://dlhd.dad/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Extract the schedule structure
        const scheduleData = await page.evaluate(() => {
            const data = {
                dayTitle: '',
                categories: [],
                totalEvents: 0,
                totalChannels: 0
            };
            
            // Get the day title
            const dayTitle = document.querySelector('.schedule__dayTitle');
            if (dayTitle) {
                data.dayTitle = dayTitle.textContent.trim();
            }
            
            // Get all categories
            const categories = document.querySelectorAll('.schedule__category');
            categories.forEach(cat => {
                const categoryData = {
                    name: '',
                    icon: '',
                    events: []
                };
                
                // Get category header
                const header = cat.querySelector('.schedule__catHeader');
                if (header) {
                    const icon = header.querySelector('i');
                    const text = header.textContent.trim();
                    categoryData.name = text;
                    if (icon) {
                        categoryData.icon = icon.className;
                    }
                }
                
                // Get all events in this category
                const events = cat.querySelectorAll('.schedule__event');
                events.forEach(event => {
                    const eventData = {
                        time: '',
                        title: '',
                        channels: [],
                        isLive: false
                    };
                    
                    // Get event header info
                    const eventHeader = event.querySelector('.schedule__eventHeader');
                    if (eventHeader) {
                        const timeEl = eventHeader.querySelector('.schedule__time');
                        const titleEl = eventHeader.querySelector('.schedule__eventTitle');
                        const liveEl = eventHeader.querySelector('.schedule__live, .live-indicator, [class*="live"]');
                        
                        if (timeEl) {
                            eventData.time = timeEl.textContent.trim();
                            eventData.dataTime = timeEl.getAttribute('data-time');
                        }
                        if (titleEl) {
                            eventData.title = titleEl.textContent.trim();
                        }
                        if (liveEl) {
                            eventData.isLive = true;
                        }
                    }
                    
                    // Get channels for this event
                    const channelsContainer = event.querySelector('.schedule__channels');
                    if (channelsContainer) {
                        const channelLinks = channelsContainer.querySelectorAll('a');
                        channelLinks.forEach(link => {
                            const channelData = {
                                name: link.textContent.trim(),
                                href: link.href,
                                channelId: null
                            };
                            
                            // Extract channel ID from URL
                            const match = link.href.match(/id=(\d+)/);
                            if (match) {
                                channelData.channelId = parseInt(match[1]);
                            }
                            
                            eventData.channels.push(channelData);
                        });
                    }
                    
                    if (eventData.title || eventData.time) {
                        categoryData.events.push(eventData);
                        data.totalEvents++;
                        data.totalChannels += eventData.channels.length;
                    }
                });
                
                if (categoryData.events.length > 0) {
                    data.categories.push(categoryData);
                }
            });
            
            return data;
        });
        
        console.log(`\nDay: ${scheduleData.dayTitle}`);
        console.log(`Categories: ${scheduleData.categories.length}`);
        console.log(`Total Events: ${scheduleData.totalEvents}`);
        console.log(`Total Channel Links: ${scheduleData.totalChannels}`);
        
        // Print category breakdown
        console.log('\n' + '='.repeat(60));
        console.log('CATEGORIES BREAKDOWN');
        console.log('='.repeat(60));
        
        scheduleData.categories.forEach((cat, i) => {
            console.log(`\n[${i + 1}] ${cat.name}`);
            console.log(`    Events: ${cat.events.length}`);
            
            // Show first 3 events as examples
            cat.events.slice(0, 3).forEach(event => {
                console.log(`    - ${event.time} | ${event.title}`);
                console.log(`      Channels: ${event.channels.map(c => c.name).join(', ').substring(0, 80)}...`);
            });
        });
        
        // Save the full data
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'dlhd-events-data.json'),
            JSON.stringify(scheduleData, null, 2)
        );
        console.log('\n\nSaved full events data to dlhd-events-data.json');
        
        // Also extract the raw HTML structure for reference
        const htmlStructure = await page.evaluate(() => {
            const schedule = document.querySelector('#schedule');
            if (schedule) {
                // Get a sample event HTML
                const sampleEvent = schedule.querySelector('.schedule__event');
                return {
                    scheduleClasses: schedule.className,
                    sampleEventHTML: sampleEvent ? sampleEvent.outerHTML.substring(0, 2000) : null
                };
            }
            return null;
        });
        
        if (htmlStructure) {
            fs.writeFileSync(
                path.join(OUTPUT_DIR, 'dlhd-schedule-structure.json'),
                JSON.stringify(htmlStructure, null, 2)
            );
            console.log('Saved HTML structure to dlhd-schedule-structure.json');
        }
        
        return scheduleData;
        
    } finally {
        await browser.close();
    }
}

extractDLHDEvents()
    .then(data => {
        console.log('\n' + '='.repeat(60));
        console.log('EXTRACTION COMPLETE');
        console.log('='.repeat(60));
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
