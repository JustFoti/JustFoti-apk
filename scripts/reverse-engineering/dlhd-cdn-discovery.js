/**
 * DLHD CDN Discovery Script
 * 
 * Analyzes the current DLHD player infrastructure to find active CDN endpoints
 * and understand the stream URL construction.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = __dirname;
const TEST_CHANNEL = '769'; // NBCNY USA - usually active

async function discoverCDN() {
    console.log('='.repeat(70));
    console.log('DLHD CDN Discovery');
    console.log('='.repeat(70));
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });
    
    const discoveredData = {
        timestamp: new Date().toISOString(),
        channel: TEST_CHANNEL,
        playerDomains: new Set(),
        cdnDomains: new Set(),
        m3u8Urls: [],
        keyUrls: [],
        iframeUrls: [],
        serverLookups: [],
        allRequests: []
    };
    
    try {
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Intercept all requests
        await page.setRequestInterception(true);
        
        page.on('request', request => {
            const url = request.url();
            discoveredData.allRequests.push({
                url,
                type: request.resourceType(),
                method: request.method()
            });
            
            // Track player domains
            if (url.includes('daddyhd') || url.includes('premiumtv') || url.includes('player')) {
                try {
                    const domain = new URL(url).hostname;
                    discoveredData.playerDomains.add(domain);
                } catch {}
            }
            
            // Track CDN domains
            if (url.includes('.m3u8') || url.includes('mono.css') || url.includes('.ts') || 
                url.includes('giokko') || url.includes('whalesignal')) {
                try {
                    const domain = new URL(url).hostname;
                    discoveredData.cdnDomains.add(domain);
                } catch {}
            }
            
            // Track M3U8 URLs
            if (url.includes('.m3u8') || url.includes('mono.css')) {
                discoveredData.m3u8Urls.push(url);
                console.log(`[M3U8] ${url}`);
            }
            
            // Track key URLs
            if (url.includes('wmsxx') || url.includes('/key') || url.includes('aes')) {
                discoveredData.keyUrls.push(url);
                console.log(`[KEY] ${url}`);
            }
            
            // Track server lookups
            if (url.includes('server_lookup') || url.includes('lookup')) {
                discoveredData.serverLookups.push(url);
                console.log(`[LOOKUP] ${url}`);
            }
            
            request.continue();
        });
        
        page.on('response', async response => {
            const url = response.url();
            
            // Capture server lookup responses
            if (url.includes('server_lookup')) {
                try {
                    const text = await response.text();
                    console.log(`[LOOKUP RESPONSE] ${text.substring(0, 200)}`);
                } catch {}
            }
        });
        
        // Step 1: Go to the watch page
        console.log(`\n1. Navigating to watch page for channel ${TEST_CHANNEL}...`);
        await page.goto(`https://dlhd.dad/watch.php?id=${TEST_CHANNEL}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await new Promise(r => setTimeout(r, 3000));
        
        // Step 2: Find and extract iframe sources
        console.log('\n2. Extracting iframe sources...');
        const iframes = await page.evaluate(() => {
            const frames = document.querySelectorAll('iframe');
            return Array.from(frames).map(f => ({
                src: f.src,
                id: f.id,
                name: f.name
            }));
        });
        
        console.log(`Found ${iframes.length} iframes:`);
        iframes.forEach(f => {
            console.log(`  - ${f.src}`);
            if (f.src) discoveredData.iframeUrls.push(f.src);
        });
        
        // Step 3: Navigate to the player iframe directly
        const playerIframe = iframes.find(f => 
            f.src && (f.src.includes('daddyhd') || f.src.includes('premiumtv') || f.src.includes('player'))
        );
        
        if (playerIframe) {
            console.log(`\n3. Navigating to player iframe: ${playerIframe.src}`);
            
            // Extract the player domain
            try {
                const playerUrl = new URL(playerIframe.src);
                discoveredData.playerDomains.add(playerUrl.hostname);
                console.log(`   Player domain: ${playerUrl.hostname}`);
            } catch {}
            
            await page.goto(playerIframe.src, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            
            await new Promise(r => setTimeout(r, 5000));
            
            // Get the page HTML to analyze
            const playerHtml = await page.content();
            fs.writeFileSync(path.join(OUTPUT_DIR, 'dlhd-player-page.html'), playerHtml);
            
            // Look for embedded scripts with CDN info
            const scripts = await page.evaluate(() => {
                const scriptContents = [];
                document.querySelectorAll('script').forEach(script => {
                    if (script.src) {
                        scriptContents.push({ type: 'external', src: script.src });
                    } else if (script.textContent && script.textContent.length > 50) {
                        scriptContents.push({ 
                            type: 'inline', 
                            content: script.textContent.substring(0, 1000)
                        });
                    }
                });
                return scriptContents;
            });
            
            // Look for server_lookup or CDN patterns in scripts
            scripts.forEach(script => {
                if (script.type === 'inline') {
                    if (script.content.includes('server_lookup') || 
                        script.content.includes('giokko') ||
                        script.content.includes('mono.css') ||
                        script.content.includes('m3u8')) {
                        console.log('\n[SCRIPT WITH CDN INFO]');
                        console.log(script.content.substring(0, 500));
                    }
                }
            });
            
            // Check for nested iframes
            const nestedIframes = await page.evaluate(() => {
                const frames = document.querySelectorAll('iframe');
                return Array.from(frames).map(f => f.src).filter(Boolean);
            });
            
            if (nestedIframes.length > 0) {
                console.log('\n4. Found nested iframes:');
                nestedIframes.forEach(src => {
                    console.log(`  - ${src}`);
                    discoveredData.iframeUrls.push(src);
                });
                
                // Navigate to nested iframe if it looks like a player
                const nestedPlayer = nestedIframes.find(src => 
                    src.includes('player') || src.includes('embed') || src.includes('stream')
                );
                
                if (nestedPlayer) {
                    console.log(`\n5. Navigating to nested player: ${nestedPlayer}`);
                    await page.goto(nestedPlayer, {
                        waitUntil: 'networkidle2',
                        timeout: 30000
                    });
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }
        
        // Step 4: Try direct server lookup URLs
        console.log('\n6. Testing known server lookup patterns...');
        
        const lookupPatterns = [
            `https://epicplayplay.cfd/server_lookup.js?channel_id=premium${TEST_CHANNEL}`,
            `https://daddyhd.com/server_lookup.js?channel_id=premium${TEST_CHANNEL}`,
            `https://dlhd.dad/server_lookup.js?channel_id=premium${TEST_CHANNEL}`,
        ];
        
        // Also try to find the lookup URL from discovered player domains
        for (const domain of discoveredData.playerDomains) {
            lookupPatterns.push(`https://${domain}/server_lookup.js?channel_id=premium${TEST_CHANNEL}`);
        }
        
        for (const lookupUrl of [...new Set(lookupPatterns)]) {
            try {
                console.log(`\nTrying: ${lookupUrl}`);
                const response = await page.evaluate(async (url) => {
                    try {
                        const res = await fetch(url);
                        if (res.ok) {
                            return { status: res.status, data: await res.text() };
                        }
                        return { status: res.status, error: 'Not OK' };
                    } catch (e) {
                        return { error: e.message };
                    }
                }, lookupUrl);
                
                if (response.data) {
                    console.log(`  SUCCESS: ${response.data.substring(0, 200)}`);
                    discoveredData.serverLookups.push({
                        url: lookupUrl,
                        response: response.data
                    });
                } else {
                    console.log(`  Failed: ${response.error || response.status}`);
                }
            } catch (e) {
                console.log(`  Error: ${e.message}`);
            }
        }
        
        // Convert Sets to Arrays for JSON
        discoveredData.playerDomains = [...discoveredData.playerDomains];
        discoveredData.cdnDomains = [...discoveredData.cdnDomains];
        
        // Save results
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'dlhd-cdn-discovery.json'),
            JSON.stringify(discoveredData, null, 2)
        );
        
        // Print summary
        console.log('\n' + '='.repeat(70));
        console.log('DISCOVERY SUMMARY');
        console.log('='.repeat(70));
        console.log(`\nPlayer Domains: ${discoveredData.playerDomains.join(', ') || 'None found'}`);
        console.log(`CDN Domains: ${discoveredData.cdnDomains.join(', ') || 'None found'}`);
        console.log(`M3U8 URLs found: ${discoveredData.m3u8Urls.length}`);
        console.log(`Key URLs found: ${discoveredData.keyUrls.length}`);
        console.log(`Server Lookups: ${discoveredData.serverLookups.length}`);
        console.log(`Total requests captured: ${discoveredData.allRequests.length}`);
        
        if (discoveredData.m3u8Urls.length > 0) {
            console.log('\nM3U8 URLs:');
            discoveredData.m3u8Urls.forEach(url => console.log(`  ${url}`));
        }
        
        if (discoveredData.keyUrls.length > 0) {
            console.log('\nKey URLs:');
            discoveredData.keyUrls.forEach(url => console.log(`  ${url}`));
        }
        
        return discoveredData;
        
    } finally {
        await browser.close();
    }
}

discoverCDN()
    .then(data => {
        console.log('\n' + '='.repeat(70));
        console.log('DISCOVERY COMPLETE');
        console.log('='.repeat(70));
        console.log('\nResults saved to dlhd-cdn-discovery.json');
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
