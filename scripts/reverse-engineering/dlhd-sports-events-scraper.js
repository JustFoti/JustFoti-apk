/**
 * DLHD.dad Sports Events Scraper
 * 
 * Analyzes the homepage to understand how sports events are displayed
 * when channels are live with specific events.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = __dirname;

async function scrapeDLHDHomepage() {
    console.log('='.repeat(60));
    console.log('DLHD.dad Sports Events Analysis');
    console.log('='.repeat(60));
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });
    
    try {
        const page = await browser.newPage();
        
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Capture all network requests
        const networkRequests = [];
        page.on('request', request => {
            networkRequests.push({
                url: request.url(),
                method: request.method(),
                resourceType: request.resourceType()
            });
        });
        
        // Capture API responses
        const apiResponses = [];
        page.on('response', async response => {
            const url = response.url();
            if (url.includes('api') || url.includes('json') || url.includes('schedule') || url.includes('event')) {
                try {
                    const contentType = response.headers()['content-type'] || '';
                    if (contentType.includes('json')) {
                        const data = await response.json();
                        apiResponses.push({ url, data });
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        });
        
        console.log('\nNavigating to dlhd.dad homepage...');
        await page.goto('https://dlhd.dad/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Save the HTML
        const html = await page.content();
        fs.writeFileSync(path.join(OUTPUT_DIR, 'dlhd-homepage.html'), html);
        console.log(`\nSaved homepage HTML: ${html.length} bytes`);
        
        // Take a screenshot
        await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'dlhd-homepage.png'),
            fullPage: true 
        });
        console.log('Saved homepage screenshot');
        
        // Extract page structure
        console.log('\n' + '='.repeat(60));
        console.log('PAGE STRUCTURE ANALYSIS');
        console.log('='.repeat(60));
        
        const pageData = await page.evaluate(() => {
            const data = {
                title: document.title,
                channels: [],
                events: [],
                schedules: [],
                categories: [],
                liveIndicators: []
            };
            
            // Look for channel listings
            const channelElements = document.querySelectorAll('[class*="channel"], [class*="stream"], [id*="channel"], [data-channel]');
            channelElements.forEach(el => {
                data.channels.push({
                    tag: el.tagName,
                    classes: el.className,
                    id: el.id,
                    text: el.textContent?.substring(0, 200),
                    href: el.href || el.querySelector('a')?.href
                });
            });
            
            // Look for event/schedule listings
            const eventElements = document.querySelectorAll('[class*="event"], [class*="match"], [class*="game"], [class*="schedule"], [class*="fixture"]');
            eventElements.forEach(el => {
                data.events.push({
                    tag: el.tagName,
                    classes: el.className,
                    text: el.textContent?.substring(0, 300),
                    html: el.innerHTML?.substring(0, 500)
                });
            });
            
            // Look for live indicators
            const liveElements = document.querySelectorAll('[class*="live"], [class*="Live"], .live, .LIVE, [data-live]');
            liveElements.forEach(el => {
                data.liveIndicators.push({
                    tag: el.tagName,
                    classes: el.className,
                    text: el.textContent?.substring(0, 100)
                });
            });
            
            // Look for category/sport type sections
            const categoryElements = document.querySelectorAll('[class*="category"], [class*="sport"], [class*="type"]');
            categoryElements.forEach(el => {
                data.categories.push({
                    tag: el.tagName,
                    classes: el.className,
                    text: el.textContent?.substring(0, 100)
                });
            });
            
            // Get all links that might be channel/stream links
            const allLinks = document.querySelectorAll('a[href*="stream"], a[href*="channel"], a[href*="live"], a[href*="/c/"]');
            data.streamLinks = Array.from(allLinks).map(a => ({
                href: a.href,
                text: a.textContent?.trim().substring(0, 100)
            }));
            
            // Look for any data attributes that might contain event info
            const elementsWithData = document.querySelectorAll('[data-event], [data-match], [data-schedule], [data-time], [data-sport]');
            data.dataAttributes = Array.from(elementsWithData).map(el => ({
                tag: el.tagName,
                dataset: { ...el.dataset },
                text: el.textContent?.substring(0, 100)
            }));
            
            // Get the main content structure
            const mainContent = document.querySelector('main, #main, .main, [role="main"], .content, #content');
            if (mainContent) {
                data.mainContentHTML = mainContent.innerHTML.substring(0, 5000);
            }
            
            // Look for tables that might contain schedules
            const tables = document.querySelectorAll('table');
            data.tables = Array.from(tables).map(table => ({
                classes: table.className,
                rows: table.rows.length,
                headerText: table.querySelector('thead, tr:first-child')?.textContent?.substring(0, 200)
            }));
            
            return data;
        });
        
        console.log(`\nPage Title: ${pageData.title}`);
        console.log(`Channels found: ${pageData.channels.length}`);
        console.log(`Events found: ${pageData.events.length}`);
        console.log(`Live indicators: ${pageData.liveIndicators.length}`);
        console.log(`Categories: ${pageData.categories.length}`);
        console.log(`Stream links: ${pageData.streamLinks?.length || 0}`);
        console.log(`Data attributes: ${pageData.dataAttributes?.length || 0}`);
        console.log(`Tables: ${pageData.tables?.length || 0}`);
        
        // Save extracted data
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'dlhd-homepage-data.json'),
            JSON.stringify(pageData, null, 2)
        );
        console.log('\nSaved page data to dlhd-homepage-data.json');
        
        // Save network requests
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'dlhd-homepage-requests.json'),
            JSON.stringify(networkRequests, null, 2)
        );
        console.log(`Saved ${networkRequests.length} network requests`);
        
        // Save API responses
        if (apiResponses.length > 0) {
            fs.writeFileSync(
                path.join(OUTPUT_DIR, 'dlhd-homepage-api-responses.json'),
                JSON.stringify(apiResponses, null, 2)
            );
            console.log(`Saved ${apiResponses.length} API responses`);
        }
        
        // Analyze the HTML for patterns
        console.log('\n' + '='.repeat(60));
        console.log('HTML PATTERN ANALYSIS');
        console.log('='.repeat(60));
        
        // Look for specific patterns in HTML
        const patterns = {
            'Schedule sections': /<[^>]*schedule[^>]*>/gi,
            'Event containers': /<[^>]*event[^>]*>/gi,
            'Match info': /<[^>]*match[^>]*>/gi,
            'Time elements': /<time[^>]*>|<[^>]*time[^>]*>/gi,
            'Sport categories': /football|soccer|basketball|tennis|cricket|hockey|baseball|nfl|nba|mlb|nhl|ufc|boxing|f1|formula/gi,
            'Team names pattern': /vs\.?|versus|v\./gi,
            'Live badges': /live|LIVE|🔴|●/gi
        };
        
        for (const [name, pattern] of Object.entries(patterns)) {
            const matches = html.match(pattern);
            console.log(`${name}: ${matches?.length || 0} matches`);
        }
        
        // Look for JavaScript that handles events/schedules
        console.log('\n' + '='.repeat(60));
        console.log('JAVASCRIPT ANALYSIS');
        console.log('='.repeat(60));
        
        const scripts = await page.evaluate(() => {
            const scriptContents = [];
            document.querySelectorAll('script').forEach(script => {
                if (script.src) {
                    scriptContents.push({ type: 'external', src: script.src });
                } else if (script.textContent) {
                    const content = script.textContent;
                    // Check if it contains event/schedule related code
                    if (content.includes('event') || content.includes('schedule') || 
                        content.includes('match') || content.includes('live') ||
                        content.includes('channel')) {
                        scriptContents.push({ 
                            type: 'inline', 
                            preview: content.substring(0, 500),
                            length: content.length
                        });
                    }
                }
            });
            return scriptContents;
        });
        
        console.log(`\nFound ${scripts.length} relevant scripts`);
        scripts.forEach((script, i) => {
            if (script.type === 'external') {
                console.log(`  [${i}] External: ${script.src}`);
            } else {
                console.log(`  [${i}] Inline: ${script.length} chars`);
            }
        });
        
        // Try to find any API endpoints
        console.log('\n' + '='.repeat(60));
        console.log('API ENDPOINT DISCOVERY');
        console.log('='.repeat(60));
        
        const apiEndpoints = networkRequests.filter(r => 
            r.url.includes('api') || 
            r.url.includes('json') ||
            r.url.includes('schedule') ||
            r.url.includes('event') ||
            r.url.includes('match')
        );
        
        console.log(`\nPotential API endpoints: ${apiEndpoints.length}`);
        apiEndpoints.forEach(ep => {
            console.log(`  ${ep.method} ${ep.url}`);
        });
        
        // Check for any XHR/fetch patterns in the page
        const xhrPatterns = await page.evaluate(() => {
            const patterns = [];
            // Look for fetch calls in inline scripts
            document.querySelectorAll('script:not([src])').forEach(script => {
                const content = script.textContent;
                const fetchMatches = content.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g);
                if (fetchMatches) {
                    patterns.push(...fetchMatches);
                }
                const xhrMatches = content.match(/\.open\s*\(\s*['"`]\w+['"`]\s*,\s*['"`]([^'"`]+)['"`]/g);
                if (xhrMatches) {
                    patterns.push(...xhrMatches);
                }
            });
            return patterns;
        });
        
        if (xhrPatterns.length > 0) {
            console.log('\nXHR/Fetch patterns found:');
            xhrPatterns.forEach(p => console.log(`  ${p}`));
        }
        
        return { pageData, networkRequests, apiResponses };
        
    } finally {
        await browser.close();
    }
}

// Run the scraper
scrapeDLHDHomepage()
    .then(result => {
        console.log('\n' + '='.repeat(60));
        console.log('SCRAPING COMPLETE');
        console.log('='.repeat(60));
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
