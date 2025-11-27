/**
 * DLHD.dad Final Stream Extractor
 * 
 * Extracts the actual working stream URL by following the iframe chain
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function extractStream(streamId = 769) {
    console.log('DLHD Final Stream Extractor\n');
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
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Track M3U8 URLs
    const m3u8Urls = [];
    const keyUrls = [];

    // Intercept requests
    await page.setRequestInterception(true);
    
    page.on('request', request => {
        const url = request.url();
        
        // Capture M3U8 requests (even if disguised)
        if (url.includes('m3u8') || url.includes('mono.css') || url.includes('playlist') || 
            url.includes('/zeko/') || url.includes('giokko.ru')) {
            console.log(`[M3U8/KEY] ${url}`);
            if (url.includes('mono.css') || url.includes('m3u8')) {
                m3u8Urls.push(url);
            }
            if (url.includes('wmsxx.php') || url.includes('key')) {
                keyUrls.push(url);
            }
        }
        
        request.continue();
    });

    page.on('response', async response => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        
        // Capture M3U8 content (even if served as CSS)
        if (url.includes('mono.css') || url.includes('m3u8') || 
            contentType.includes('mpegurl') || contentType.includes('x-mpegURL')) {
            try {
                const body = await response.text();
                if (body.includes('#EXTM3U') || body.includes('#EXT-X-')) {
                    console.log(`\n[M3U8 CONTENT] ${url}`);
                    console.log(body);
                    
                    // Extract key URL
                    const keyMatch = body.match(/URI="([^"]+)"/);
                    if (keyMatch) {
                        keyUrls.push(keyMatch[1]);
                        console.log(`\n[KEY URL] ${keyMatch[1]}`);
                    }
                    
                    // Extract segment URLs
                    const segments = body.match(/https?:\/\/[^\s"']+\.ts[^\s"']*/gi) || [];
                    if (segments.length > 0) {
                        console.log(`\n[SEGMENTS] Found ${segments.length} segments`);
                    }
                }
            } catch (e) {}
        }
    });

    // First, go to the main page to get the iframe URL
    const mainUrl = `https://dlhd.dad/casting/stream-${streamId}.php`;
    console.log(`\nStep 1: Loading main page: ${mainUrl}\n`);

    try {
        await page.goto(mainUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        // Find the player iframe
        const iframeSrc = await page.evaluate(() => {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                if (iframe.src && iframe.src.includes('epicplayplay') || 
                    iframe.src && iframe.src.includes('daddyhd') ||
                    iframe.src && iframe.src.includes('premiumtv')) {
                    return iframe.src;
                }
            }
            // Return any non-tracking iframe
            for (const iframe of iframes) {
                if (iframe.src && !iframe.src.includes('javascript:') && 
                    !iframe.src.includes('sharethis') && 
                    !iframe.src.includes('dtscout') &&
                    !iframe.src.includes('lijit') &&
                    iframe.src.length > 10) {
                    return iframe.src;
                }
            }
            return null;
        });

        if (iframeSrc) {
            console.log(`\nStep 2: Found player iframe: ${iframeSrc}\n`);
            
            // Navigate to the iframe URL directly
            await page.goto(iframeSrc, {
                waitUntil: 'networkidle2',
                timeout: 30000,
            });

            // Wait for player to initialize
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Check for video element
            const videoInfo = await page.evaluate(() => {
                const videos = document.querySelectorAll('video');
                const sources = [];
                videos.forEach(v => {
                    if (v.src) sources.push(v.src);
                    if (v.currentSrc) sources.push(v.currentSrc);
                    v.querySelectorAll('source').forEach(s => {
                        if (s.src) sources.push(s.src);
                    });
                });
                
                // Check for HLS.js
                let hlsSource = null;
                if (typeof Hls !== 'undefined') {
                    // Try to find HLS instance
                    const hlsInstances = Object.values(window).filter(v => v && v.constructor && v.constructor.name === 'Hls');
                    if (hlsInstances.length > 0) {
                        hlsSource = hlsInstances[0].url;
                    }
                }
                
                // Check for Clappr
                let clapprSource = null;
                if (typeof Clappr !== 'undefined' || typeof player !== 'undefined') {
                    try {
                        if (window.player && window.player.options) {
                            clapprSource = window.player.options.source;
                        }
                    } catch (e) {}
                }
                
                return { sources, hlsSource, clapprSource };
            });

            console.log('\nVideo sources found:', videoInfo);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('EXTRACTED STREAM INFORMATION');
    console.log('='.repeat(70));

    const uniqueM3u8 = [...new Set(m3u8Urls)];
    const uniqueKeys = [...new Set(keyUrls)];

    if (uniqueM3u8.length > 0) {
        console.log('\n✓ M3U8 Playlist URLs:');
        uniqueM3u8.forEach(url => console.log(`  ${url}`));
    }

    if (uniqueKeys.length > 0) {
        console.log('\n✓ Decryption Key URLs:');
        uniqueKeys.forEach(url => console.log(`  ${url}`));
    }

    // Build the final stream info
    const streamInfo = {
        streamId,
        m3u8Urls: uniqueM3u8,
        keyUrls: uniqueKeys,
        timestamp: new Date().toISOString(),
    };

    // If we found a mono.css URL, that's the actual M3U8
    const actualM3u8 = uniqueM3u8.find(u => u.includes('mono.css') || u.includes('giokko.ru'));
    if (actualM3u8) {
        console.log('\n' + '='.repeat(70));
        console.log('WORKING STREAM URL');
        console.log('='.repeat(70));
        console.log(`\n✓ Stream URL: ${actualM3u8}`);
        console.log(`\nNote: This URL serves M3U8 content disguised as CSS`);
        console.log(`The stream is AES-128 encrypted.`);
        
        if (uniqueKeys.length > 0) {
            console.log(`\nDecryption key can be fetched from:`);
            uniqueKeys.forEach(k => console.log(`  ${k}`));
        }
        
        streamInfo.workingUrl = actualM3u8;
    }

    // Save results
    const outputPath = path.join(__dirname, `dlhd-stream-${streamId}-final.json`);
    fs.writeFileSync(outputPath, JSON.stringify(streamInfo, null, 2));
    console.log(`\nSaved to: ${outputPath}`);

    await browser.close();
    
    return streamInfo;
}

// Run extraction
const streamId = process.argv[2] || 769;
extractStream(parseInt(streamId))
    .then(info => {
        if (info.workingUrl) {
            console.log('\n' + '='.repeat(70));
            console.log('SUCCESS!');
            console.log('='.repeat(70));
            console.log(`\nStream ${info.streamId} URL: ${info.workingUrl}`);
        }
    })
    .catch(console.error);
