/**
 * DLHD.dad Network Analysis
 * 
 * Uses Puppeteer to capture actual network requests when loading a stream
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function analyzeStream(streamId = 769) {
    console.log(`DLHD Network Analysis - Stream ${streamId}\n`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
        ]
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Capture all network requests
    const requests = [];
    const responses = [];

    page.on('request', request => {
        const url = request.url();
        const type = request.resourceType();
        
        requests.push({
            url,
            type,
            method: request.method(),
            headers: request.headers(),
        });

        // Log interesting requests
        if (url.includes('m3u8') || url.includes('stream') || url.includes('hls') || 
            url.includes('cdn') || url.includes('veloce') || url.includes('live')) {
            console.log(`[REQUEST] ${type}: ${url}`);
        }
    });

    page.on('response', async response => {
        const url = response.url();
        const status = response.status();
        
        responses.push({
            url,
            status,
            headers: response.headers(),
        });

        // Log interesting responses
        if (url.includes('m3u8') || url.includes('stream') || url.includes('hls') ||
            url.includes('cdn') || url.includes('veloce') || url.includes('live')) {
            console.log(`[RESPONSE] ${status}: ${url}`);
            
            // Try to get response body for m3u8 files
            if (url.includes('m3u8')) {
                try {
                    const body = await response.text();
                    console.log(`  Content: ${body.substring(0, 500)}`);
                } catch (e) {}
            }
        }
    });

    // Navigate to the stream page
    const url = `https://dlhd.dad/casting/stream-${streamId}.php`;
    console.log(`Navigating to: ${url}\n`);

    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000,
        });

        // Wait for potential player to load
        await page.waitForTimeout(5000);

        // Try to find video elements
        const videoInfo = await page.evaluate(() => {
            const videos = document.querySelectorAll('video');
            const iframes = document.querySelectorAll('iframe');
            const sources = document.querySelectorAll('source');
            
            return {
                videoCount: videos.length,
                iframeCount: iframes.length,
                sourceCount: sources.length,
                videoSrcs: Array.from(videos).map(v => v.src || v.currentSrc),
                iframeSrcs: Array.from(iframes).map(i => i.src),
                sourceSrcs: Array.from(sources).map(s => s.src),
            };
        });

        console.log('\n' + '='.repeat(60));
        console.log('PAGE ELEMENTS');
        console.log('='.repeat(60));
        console.log(JSON.stringify(videoInfo, null, 2));

        // Check for player objects
        const playerInfo = await page.evaluate(() => {
            const info = {};
            
            // Check for common players
            if (typeof jwplayer !== 'undefined') {
                info.jwplayer = true;
                try {
                    const player = jwplayer();
                    info.jwplayerConfig = player.getConfig();
                } catch (e) {}
            }
            
            if (typeof Clappr !== 'undefined') {
                info.clappr = true;
            }
            
            if (typeof Hls !== 'undefined') {
                info.hls = true;
            }
            
            // Check window variables
            const windowVars = Object.keys(window).filter(k => 
                k.includes('player') || k.includes('stream') || k.includes('video')
            );
            info.windowVars = windowVars;
            
            return info;
        });

        console.log('\n' + '='.repeat(60));
        console.log('PLAYER INFO');
        console.log('='.repeat(60));
        console.log(JSON.stringify(playerInfo, null, 2));

    } catch (e) {
        console.error('Navigation error:', e.message);
    }

    // Analyze captured requests
    console.log('\n' + '='.repeat(60));
    console.log('CAPTURED REQUESTS SUMMARY');
    console.log('='.repeat(60));

    const streamRequests = requests.filter(r => 
        r.url.includes('m3u8') || 
        r.url.includes('stream') || 
        r.url.includes('hls') ||
        r.url.includes('cdn') ||
        r.url.includes('veloce') ||
        r.url.includes('live') ||
        r.url.includes('.ts')
    );

    console.log(`\nTotal requests: ${requests.length}`);
    console.log(`Stream-related requests: ${streamRequests.length}`);

    if (streamRequests.length > 0) {
        console.log('\nStream requests:');
        streamRequests.forEach(r => {
            console.log(`  [${r.method}] ${r.url}`);
        });
    }

    // Save all requests for analysis
    const outputPath = path.join(__dirname, `dlhd-network-${streamId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({
        streamId,
        timestamp: new Date().toISOString(),
        requests: requests.slice(0, 100),  // Limit to first 100
        streamRequests,
    }, null, 2));
    console.log(`\nSaved to: ${outputPath}`);

    await browser.close();
}

// Run analysis
const streamId = process.argv[2] || 769;
analyzeStream(parseInt(streamId)).catch(console.error);
