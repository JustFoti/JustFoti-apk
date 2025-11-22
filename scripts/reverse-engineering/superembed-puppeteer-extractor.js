/**
 * Superembed Puppeteer Source Extractor
 * 
 * This script uses Puppeteer to execute JavaScript and intercept network requests
 * to capture the actual video source URLs from Superembed.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function extractSuperembedSources(id, type = 'movie') {
    const embedUrl = `https://vidsrc-embed.ru/embed/${type}/${id}`;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎬 Extracting Superembed Sources for ${type} ID: ${id}`);
    console.log(`${'='.repeat(80)}\n`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });

    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Storage for captured sources
    const capturedSources = {
        m3u8: [],
        mp4: [],
        iframes: [],
        redirects: [],
        allRequests: []
    };

    // Intercept network requests
    await page.setRequestInterception(true);

    page.on('request', request => {
        const url = request.url();

        // Block sbx.js to prevent sandbox detection
        if (url.includes('sbx.js')) {
            console.log(`🚫 Blocking request to: ${url}`);
            request.abort();
            return;
        }

        capturedSources.allRequests.push({
            url,
            type: request.resourceType(),
            method: request.method()
        });

        // Log interesting requests
        if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('play') || url.includes('source')) {
            console.log(`📡 Request: ${request.method()} ${url.substring(0, 100)}...`);
        }

        request.continue();
    });

    page.on('response', async response => {
        const url = response.url();
        const status = response.status();

        // Capture M3U8 URLs
        if (url.includes('.m3u8')) {
            console.log(`\n✅ M3U8 Found: ${url}`);
            capturedSources.m3u8.push({ url, status });
        }

        // Capture MP4 URLs
        if (url.includes('.mp4')) {
            console.log(`\n✅ MP4 Found: ${url}`);
            capturedSources.mp4.push({ url, status });
        }

        // Capture redirects
        if (status >= 300 && status < 400) {
            const location = response.headers()['location'];
            if (location) {
                console.log(`🔄 Redirect (${status}): ${url} → ${location}`);
                capturedSources.redirects.push({ from: url, to: location, status });
            }
        }

        // Capture iframe sources
        if (url.includes('/rcp/') || url.includes('/srcrcp/') || url.includes('/prorcp/')) {
            console.log(`\n📄 Player Page: ${url}`);
            try {
                const html = await response.text();

                // Save to file for analysis
                const safeName = url.split('/').pop().substring(0, 50);
                const filename = `debug-${safeName}-${Date.now()}.html`;
                fs.writeFileSync(path.join(__dirname, filename), html);
                console.log(`   Saved to: ${filename}`);

                // Extract iframe sources from HTML
                const iframeMatches = html.match(/<iframe[^>]+src=["']([^"']+)["']/gi);
                if (iframeMatches) {
                    iframeMatches.forEach(match => {
                        const srcMatch = match.match(/src=["']([^"']+)["']/);
                        if (srcMatch) {
                            const iframeUrl = srcMatch[1];
                            console.log(`   → Iframe: ${iframeUrl}`);
                            capturedSources.iframes.push(iframeUrl);
                        }
                    });
                }
            } catch (e) {
                console.log(`   ⚠️  Error reading response: ${e.message}`);
            }
        }
    });

    console.log(`\n📍 Navigating to: ${embedUrl}\n`);

    try {
        await page.goto(embedUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log(`\n✅ Page loaded`);

        // Click play button if present (handle multiple layers and iframes)
        for (let i = 0; i < 15; i++) {
            try {
                console.log(`\n📍 Current URL: ${page.url()}`);
                const frames = page.frames();
                console.log(`ℹ️  Detected ${frames.length} frames:`);
                frames.forEach((f, idx) => console.log(`   [${idx}] ${f.url()}`));

                // Check for video element in all frames
                let videoFound = false;
                for (const frame of frames) {
                    const video = await frame.$('video');
                    if (video) {
                        console.log(`\n🎥 Video element found in frame: ${frame.url()}`);
                        videoFound = true;
                        break;
                    }
                }
                if (videoFound) break;

                // Find play button in all frames
                let buttonFound = false;
                for (const frame of frames) {
                    const playButton = await frame.$('#pl_but_background, #pl_but');
                    if (playButton) {
                        console.log(`\n🖱️  Clicking play button in frame: ${frame.url()} (Attempt ${i + 1})...`);
                        await playButton.click();
                        buttonFound = true;
                        await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for action
                        break; // Click one at a time
                    }
                }

                if (!buttonFound) {
                    console.log('\nℹ️  No play button found in any frame.');
                    if (i > 2) break; // Give it a few tries
                }
            } catch (e) {
                console.log(`   ⚠️  Error clicking play button: ${e.message}`);
            }
        }

        // Try to find video elements or player configurations
        const videoData = await page.evaluate(() => {
            const results = {
                videoElements: [],
                playerConfigs: [],
                windowVars: {}
            };

            // Check for video elements
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                results.videoElements.push({
                    src: video.src,
                    currentSrc: video.currentSrc,
                    sources: Array.from(video.querySelectorAll('source')).map(s => ({
                        src: s.src,
                        type: s.type
                    }))
                });
            });

            // Check window for common player variable names
            const playerVarNames = ['jwplayer', 'player', 'videojs', 'Clappr', 'Plyr', 'flowplayer', 'playerjs'];
            playerVarNames.forEach(name => {
                if (window[name]) {
                    try {
                        results.windowVars[name] = JSON.stringify(window[name]);
                    } catch (e) {
                        results.windowVars[name] = 'Found but cannot stringify';
                    }
                }
            });

            return results;
        });

        console.log('\n📊 Page Analysis:');
        console.log(`   Video Elements: ${videoData.videoElements.length}`);
        console.log(`   Window Variables: ${Object.keys(videoData.windowVars).join(', ') || 'None'}`);

        if (videoData.videoElements.length > 0) {
            videoData.videoElements.forEach((video, i) => {
                console.log(`\n   Video ${i + 1}:`);
                if (video.src) console.log(`     src: ${video.src}`);
                if (video.currentSrc) console.log(`     currentSrc: ${video.currentSrc}`);
                video.sources.forEach((source, j) => {
                    console.log(`     source ${j + 1}: ${source.src} (${source.type})`);
                });
            });
        }

    } catch (e) {
        console.error(`\n❌ Error during navigation: ${e.message}`);
    }

    await browser.close();

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📋 SUMMARY');
    console.log(`${'='.repeat(80)}\n`);
    console.log(`M3U8 URLs found: ${capturedSources.m3u8.length}`);
    console.log(`MP4 URLs found: ${capturedSources.mp4.length}`);
    console.log(`Iframes found: ${capturedSources.iframes.length}`);
    console.log(`Redirects: ${capturedSources.redirects.length}`);
    console.log(`Total requests: ${capturedSources.allRequests.length}`);

    // Save results to JSON
    const resultsFile = path.join(__dirname, `superembed-sources-${id}-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(capturedSources, null, 2));
    console.log(`\n💾 Full results saved to: ${path.basename(resultsFile)}`);

    return capturedSources;
}

// Run if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    const id = args[0] || '550';
    const type = args[1] || 'movie';

    extractSuperembedSources(id, type)
        .then(sources => {
            console.log('\n✅ Extraction complete!');
            process.exit(0);
        })
        .catch(err => {
            console.error('\n❌ Error:', err);
            process.exit(1);
        });
}

module.exports = { extractSuperembedSources };
