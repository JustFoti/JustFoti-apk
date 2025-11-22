/**
 * Superembed Deep Analysis with Puppeteer
 * 
 * This script uses Puppeteer to:
 * 1. Intercept ALL network requests
 * 2. Capture JavaScript execution and decoding logic
 * 3. Extract actual M3U8/MP4 URLs
 * 4. Analyze HOW the play parameter is decoded
 * 
 * Goal: Understand the logic to replicate in fetch-only solution
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const MOVIE_ID = process.argv[2] || '550';
const MEDIA_TYPE = process.argv[3] || 'movie';

console.log(`\n=== SUPEREMBED DEEP ANALYSIS ===`);
console.log(`Media: ${MEDIA_TYPE} ${MOVIE_ID}\n`);

async function deepAnalysis() {
    const allRequests = [];
    const allResponses = [];
    const consoleLogs = [];
    const videoSources = [];

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Capture console logs from the page
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        console.log(`[BROWSER CONSOLE]`, text);
    });

    // Intercept ALL requests
    page.on('request', request => {
        const url = request.url();
        const method = request.method();
        const headers = request.headers();

        allRequests.push({
            url,
            method,
            headers,
            resourceType: request.resourceType(),
            timestamp: Date.now()
        });

        console.log(`>> [${method}] ${url}`);
    });

    // Intercept ALL responses
    page.on('response', async response => {
        const url = response.url();
        const status = response.status();
        const headers = response.headers();

        const responseData = {
            url,
            status,
            headers,
            contentType: headers['content-type'] || 'unknown',
            timestamp: Date.now()
        };

        // Capture M3U8/MP4/video sources
        if (url.includes('.m3u8') || url.includes('.mp4') ||
            url.includes('master.m3u8') || url.includes('playlist.m3u8')) {
            console.log(`\n🎬 VIDEO SOURCE FOUND!`);
            console.log(`URL: ${url}`);
            console.log(`Status: ${status}\n`);

            videoSources.push({
                url,
                status,
                type: url.includes('.m3u8') ? 'HLS' : 'MP4'
            });

            try {
                const text = await response.text();
                responseData.body = text.substring(0, 500);
            } catch (e) {
                responseData.body = 'Could not read body';
            }
        }

        // Capture any JSON responses
        if (headers['content-type']?.includes('application/json')) {
            try {
                const json = await response.json();
                responseData.json = json;
                console.log(`<< [JSON] ${url}:`, JSON.stringify(json).substring(0, 200));
            } catch (e) {
                responseData.jsonError = e.message;
            }
        }

        allResponses.push(responseData);
        console.log(`<< [${status}] ${url}`);
    });

    // Step 1: Go to vidsrc-embed
    console.log('\n--- Step 1: Navigating to vidsrc-embed ---');
    const embedUrl = `https://vidsrc-embed.ru/embed/${MEDIA_TYPE}/${MOVIE_ID}`;
    console.log(`URL: ${embedUrl}`);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    });

    // Capture console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.evaluateOnNewDocument(() => {
        console.log("Injecting hooks...");
        const originalCreateObjectURL = URL.createObjectURL;
        URL.createObjectURL = function (blob) {
            console.log("URL.createObjectURL called with blob type:", blob.type);
            const reader = new FileReader();
            reader.onload = function () {
                console.log("BLOB_CONTENT_START");
                console.log(reader.result);
                console.log("BLOB_CONTENT_END");
            };
            reader.readAsText(blob);
            return originalCreateObjectURL.apply(this, arguments);
        };
    });

    // Enable request interception to block anti-bot scripts
    await page.setRequestInterception(true);
    page.on('request', request => {
        const url = request.url();
        if (url.includes('disable-devtool') || url.includes('sbx.js')) {
            console.log(`🚫 Blocking request to: ${url}`);
            request.abort();
        } else {
            request.continue();
        }
    });

    try {
        await page.goto(embedUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        console.log('✓ Page loaded');

        // Dump initial HTML
        const initialHtml = await page.content();
        fs.writeFileSync(`superembed-initial-${MOVIE_ID}.html`, initialHtml);
        console.log('Saved initial HTML');

        // Extract iframe src
        const iframeSrc = await page.evaluate(() => {
            const iframe = document.getElementById('player_iframe');
            return iframe ? iframe.src : null;
        });

        if (iframeSrc) {
            console.log(`\n🔗 Found iframe src: ${iframeSrc}`);
            console.log('Navigating to iframe...');

            // Navigate to the iframe URL
            const fullIframeUrl = iframeSrc.startsWith('//') ? 'https:' + iframeSrc : iframeSrc;
            await page.goto(fullIframeUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            console.log('✓ RCP page loaded');

            // Dump RCP HTML
            const rcpHtml = await page.content();
            fs.writeFileSync(`superembed-rcp-${MOVIE_ID}.html`, rcpHtml);
            console.log('Saved RCP HTML');

            // Extract the PRORCP URL from the loadIframe function
            const prorcpMatch = rcpHtml.match(/src:\s*['"](\/prorcp\/[^'"]+)['"]/);

            if (prorcpMatch && prorcpMatch[1]) {
                const prorcpUrl = 'https://cloudnestra.com' + prorcpMatch[1];
                console.log(`\n🔗 Found PRORCP URL: ${prorcpUrl}`);
                console.log('Navigating to PRORCP...');

                // Set Referer to the current RCP page
                await page.setExtraHTTPHeaders({
                    'Referer': fullIframeUrl,
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                });

                await page.goto(prorcpUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 45000
                });
                console.log('✓ PRORCP page loaded');

                // Dump PRORCP HTML
                const prorcpHtml = await page.content();
                fs.writeFileSync(`superembed-prorcp-${MOVIE_ID}.html`, prorcpHtml);
                console.log('Saved PRORCP HTML');

            } else {
                console.log('⚠️ Could not find PRORCP URL in RCP page content');
                // Try clicking the button as fallback
                try {
                    console.log('Attempting to click play button...');
                    await page.click('#pl_but');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (e) {
                    console.log('Could not click play button:', e.message);
                }
            }
        } else {
            console.log('⚠️ No iframe found with id "player_iframe"');
        }

        // Take screenshot
        await page.screenshot({ path: `superembed-screenshot-${MOVIE_ID}.png`, fullPage: true });
        console.log('Saved screenshot');

        // Log frames
        const frames = page.frames();
        console.log(`Total frames: ${frames.length}`);
        frames.forEach((frame, i) => {
            console.log(`Frame ${i}: ${frame.url()}`);
        });

    } catch (e) {
        console.log('! Navigation timeout or error:', e.message);
    }

    // Wait for potential redirects and JavaScript execution
    console.log('\nWaiting 10 seconds for redirects and JavaScript execution...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Try to find video element
    console.log('\n--- Checking for video elements ---');
    const videoData = await page.evaluate(() => {
        const videos = document.querySelectorAll('video');
        const iframes = document.querySelectorAll('iframe');
        const videoInfo = Array.from(videos).map(v => ({
            src: v.src,
            currentSrc: v.currentSrc,
            poster: v.poster,
            sources: Array.from(v.querySelectorAll('source')).map(s => ({
                src: s.src,
                type: s.type
            }))
        }));

        const iframeInfo = Array.from(iframes).map(f => ({
            src: f.src,
            id: f.id,
            className: f.className
        }));

        return {
            videos: videoInfo,
            iframes: iframeInfo,
            currentUrl: window.location.href,
            documentTitle: document.title
        };
    });

    console.log('Current URL:', videoData.currentUrl);
    console.log('Videos found:', videoData.videos.length);
    console.log('Iframes found:', videoData.iframes.length);

    if (videoData.videos.length > 0) {
        console.log('\n🎬 Video elements:', JSON.stringify(videoData.videos, null, 2));
    }

    if (videoData.iframes.length > 0) {
        console.log('\n📦 Iframes:', JSON.stringify(videoData.iframes, null, 2));
    }

    // Try to extract any window variables that might contain sources
    console.log('\n--- Checking global variables ---');
    const globalVars = await page.evaluate(() => {
        const interestingVars = {};

        // Check for common video player variable names
        const varsToCheck = ['playerData', 'videoData', 'sources', 'playlist',
            'config', 'jwplayer', 'videojs', 'plyr'];

        varsToCheck.forEach(varName => {
            if (window[varName]) {
                try {
                    interestingVars[varName] = JSON.parse(JSON.stringify(window[varName]));
                } catch (e) {
                    interestingVars[varName] = 'Cannot stringify';
                }
            }
        });

        return interestingVars;
    });

    if (Object.keys(globalVars).length > 0) {
        console.log('Global variables found:', JSON.stringify(globalVars, null, 2));
    }

    // Get final HTML
    const finalHtml = await page.content();

    // Save results
    const timestamp = Date.now();
    const results = {
        mediaId: MOVIE_ID,
        mediaType: MEDIA_TYPE,
        timestamp,
        finalUrl: videoData.currentUrl,
        videoSources,
        videoElements: videoData.videos,
        iframes: videoData.iframes,
        globalVars,
        consoleLogs,
        requests: allRequests,
        responses: allResponses.map(r => ({
            url: r.url,
            status: r.status,
            contentType: r.contentType,
            hasJson: !!r.json,
            hasBody: !!r.body
        }))
    };

    const resultsFile = `superembed-deep-analysis-${MOVIE_ID}-${timestamp}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n✓ Results saved to: ${resultsFile}`);

    const htmlFile = `superembed-final-html-${MOVIE_ID}-${timestamp}.html`;
    fs.writeFileSync(htmlFile, finalHtml);
    console.log(`✓ Final HTML saved to: ${htmlFile}`);

    await browser.close();

    // Print summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total Requests: ${allRequests.length}`);
    console.log(`Total Responses: ${allResponses.length}`);
    console.log(`Video Sources Found: ${videoSources.length}`);
    console.log(`Console Logs: ${consoleLogs.length}`);

    if (videoSources.length > 0) {
        console.log('\n🎬 VIDEO SOURCES:');
        videoSources.forEach((source, i) => {
            console.log(`\n${i + 1}. ${source.type}`);
            console.log(`   URL: ${source.url}`);
            console.log(`   Status: ${source.status}`);
        });
    } else {
        console.log('\n⚠️  No video sources found in network requests');
        console.log('This might mean:');
        console.log('  1. Sources are loaded in nested iframe');
        console.log('  2. More wait time needed');
        console.log('  3. Additional user interaction required');
    }

    return results;
}

deepAnalysis()
    .then(results => {
        console.log('\n✅ Analysis complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
