/**
 * DLHD.dad Live Stream Capture
 * 
 * Uses Puppeteer to capture actual stream URLs from a live page
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureStream(streamId = 769) {
    console.log('DLHD Live Stream Capture\n');
    console.log('='.repeat(70));
    console.log(`Target: Stream ${streamId}`);
    console.log('='.repeat(70));

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--autoplay-policy=no-user-gesture-required',
        ]
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Track all requests
    const allRequests = [];
    const streamUrls = [];
    const vastResponses = [];

    // Intercept requests
    await page.setRequestInterception(true);
    
    page.on('request', request => {
        const url = request.url();
        const type = request.resourceType();
        
        allRequests.push({
            url,
            type,
            method: request.method(),
        });

        // Log interesting requests
        if (url.includes('m3u8') || url.includes('.ts') || url.includes('hls') || 
            url.includes('stream') || url.includes('live') || url.includes('video/select') ||
            url.includes('video/slider') || url.includes('vast') || url.includes('cdn')) {
            console.log(`\n[REQUEST] ${type}: ${url.substring(0, 150)}`);
            
            if (url.includes('m3u8') || url.includes('.ts')) {
                streamUrls.push({ url, type: 'request', timestamp: Date.now() });
            }
        }

        request.continue();
    });

    page.on('response', async response => {
        const url = response.url();
        const status = response.status();
        const contentType = response.headers()['content-type'] || '';

        // Capture VAST responses
        if (url.includes('video/select') || url.includes('vast') || contentType.includes('xml')) {
            console.log(`\n[VAST RESPONSE] ${status}: ${url.substring(0, 100)}`);
            try {
                const body = await response.text();
                vastResponses.push({ url, status, body, timestamp: Date.now() });
                
                // Try to extract media URLs from VAST
                const mediaFileMatches = body.match(/<MediaFile[^>]*>([^<]+)<\/MediaFile>/gi) || [];
                mediaFileMatches.forEach(match => {
                    const urlMatch = match.match(/>([^<]+)</);
                    if (urlMatch && urlMatch[1]) {
                        const mediaUrl = urlMatch[1].trim();
                        console.log(`  [MEDIA FILE] ${mediaUrl}`);
                        streamUrls.push({ url: mediaUrl, type: 'vast-media', timestamp: Date.now() });
                    }
                });
            } catch (e) {
                console.log(`  Could not read VAST body: ${e.message}`);
            }
        }

        // Capture m3u8 responses
        if (url.includes('m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL')) {
            console.log(`\n[M3U8 RESPONSE] ${status}: ${url}`);
            streamUrls.push({ url, type: 'response', timestamp: Date.now() });
            
            try {
                const body = await response.text();
                console.log(`  Content preview: ${body.substring(0, 200)}`);
                
                // Extract nested m3u8 URLs
                const nestedUrls = body.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/gi) || [];
                nestedUrls.forEach(nested => {
                    console.log(`  [NESTED M3U8] ${nested}`);
                    streamUrls.push({ url: nested, type: 'nested-m3u8', timestamp: Date.now() });
                });
            } catch (e) {}
        }

        // Capture any video/media responses
        if (contentType.includes('video') || url.includes('.ts')) {
            console.log(`\n[VIDEO SEGMENT] ${status}: ${url.substring(0, 100)}`);
            streamUrls.push({ url, type: 'segment', timestamp: Date.now() });
        }
    });

    // Navigate to the stream page
    const targetUrl = `https://dlhd.dad/casting/stream-${streamId}.php`;
    console.log(`\nNavigating to: ${targetUrl}\n`);

    try {
        await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        console.log('\nWaiting for player to initialize...');
        
        // Wait for video element or player
        await page.waitForSelector('video, iframe, .player, #player', { timeout: 10000 }).catch(() => {});
        
        // Wait additional time for stream to load
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Try to extract video source from page
        const videoInfo = await page.evaluate(() => {
            const result = {
                videos: [],
                iframes: [],
                sources: [],
                scripts: [],
            };

            // Get video elements
            document.querySelectorAll('video').forEach(v => {
                result.videos.push({
                    src: v.src || v.currentSrc,
                    sources: Array.from(v.querySelectorAll('source')).map(s => s.src),
                });
            });

            // Get iframes
            document.querySelectorAll('iframe').forEach(i => {
                result.iframes.push(i.src);
            });

            // Look for player config in window
            const playerVars = Object.keys(window).filter(k => 
                k.toLowerCase().includes('player') || 
                k.toLowerCase().includes('stream') ||
                k.toLowerCase().includes('hls') ||
                k.toLowerCase().includes('video')
            );
            result.playerVars = playerVars;

            // Look for HLS.js instance
            if (typeof Hls !== 'undefined') {
                result.hlsAvailable = true;
            }

            return result;
        });

        console.log('\n' + '='.repeat(70));
        console.log('PAGE VIDEO INFO');
        console.log('='.repeat(70));
        console.log(JSON.stringify(videoInfo, null, 2));

        // If there are iframes, try to get content from them
        if (videoInfo.iframes.length > 0) {
            console.log('\n' + '='.repeat(70));
            console.log('CHECKING IFRAMES');
            console.log('='.repeat(70));
            
            for (const iframeSrc of videoInfo.iframes) {
                if (iframeSrc && !iframeSrc.startsWith('about:')) {
                    console.log(`\nIframe: ${iframeSrc}`);
                }
            }
        }

    } catch (e) {
        console.error('\nNavigation error:', e.message);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('CAPTURED STREAM URLS');
    console.log('='.repeat(70));

    const uniqueStreamUrls = [...new Map(streamUrls.map(s => [s.url, s])).values()];
    
    if (uniqueStreamUrls.length > 0) {
        console.log(`\nFound ${uniqueStreamUrls.length} stream URLs:\n`);
        uniqueStreamUrls.forEach((s, i) => {
            console.log(`${i + 1}. [${s.type}] ${s.url}`);
        });
    } else {
        console.log('\nNo stream URLs captured directly.');
    }

    // Save VAST responses for analysis
    if (vastResponses.length > 0) {
        console.log('\n' + '='.repeat(70));
        console.log('VAST RESPONSES');
        console.log('='.repeat(70));
        
        vastResponses.forEach((v, i) => {
            console.log(`\n--- VAST ${i + 1} ---`);
            console.log(`URL: ${v.url}`);
            console.log(`Status: ${v.status}`);
            console.log(`Body preview: ${v.body.substring(0, 500)}`);
            
            // Save full response
            const vastPath = path.join(__dirname, `dlhd-vast-response-${streamId}-${i}.xml`);
            fs.writeFileSync(vastPath, v.body);
            console.log(`Saved to: ${vastPath}`);
        });
    }

    // Save all data
    const outputPath = path.join(__dirname, `dlhd-capture-${streamId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({
        streamId,
        timestamp: new Date().toISOString(),
        streamUrls: uniqueStreamUrls,
        vastResponses: vastResponses.map(v => ({ url: v.url, status: v.status })),
        totalRequests: allRequests.length,
    }, null, 2));
    console.log(`\nSaved capture data to: ${outputPath}`);

    await browser.close();
    
    return uniqueStreamUrls;
}

// Run capture
const streamId = process.argv[2] || 769;
captureStream(parseInt(streamId))
    .then(urls => {
        console.log('\n' + '='.repeat(70));
        console.log('FINAL RESULT');
        console.log('='.repeat(70));
        
        const m3u8Urls = urls.filter(u => u.url.includes('m3u8'));
        if (m3u8Urls.length > 0) {
            console.log('\n✓ Found M3U8 stream URLs:');
            m3u8Urls.forEach(u => console.log(`  ${u.url}`));
        } else {
            console.log('\n✗ No M3U8 URLs found. The stream may require additional steps.');
        }
    })
    .catch(console.error);
