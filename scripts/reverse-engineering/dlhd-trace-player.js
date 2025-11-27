/**
 * DLHD.dad Player Trace
 * 
 * Traces through the iframe chain to find where the key is actually fetched
 */

const puppeteer = require('puppeteer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function tracePlayer(streamId = 769) {
    console.log('DLHD Player Trace\n');
    console.log('='.repeat(70));

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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    let capturedKey = null;
    let capturedSegment = null;
    let m3u8Content = null;
    let ivHex = null;

    // Track all network requests
    page.on('response', async response => {
        const url = response.url();
        const status = response.status();
        
        // Capture M3U8
        if (url.includes('mono.css') || (url.includes('giokko.ru') && url.includes('zeko'))) {
            try {
                const body = await response.text();
                if (body.includes('#EXTM3U')) {
                    m3u8Content = body;
                    const ivMatch = body.match(/IV=0x([a-fA-F0-9]+)/);
                    if (ivMatch) ivHex = ivMatch[1];
                    console.log(`[M3U8] Captured from ${url}`);
                    console.log(`[IV] ${ivHex}`);
                }
            } catch (e) {}
        }
        
        // Capture key - look for any 16-byte response from giokko.ru
        if (url.includes('giokko.ru') && !url.includes('mono.css') && !url.includes('zeko')) {
            try {
                const buffer = await response.buffer();
                console.log(`[GIOKKO] ${url.substring(0, 80)}... - ${status} - ${buffer.length} bytes`);
                if (buffer.length === 16) {
                    capturedKey = buffer;
                    console.log(`[KEY] ✓ Captured: ${buffer.toString('hex')}`);
                }
            } catch (e) {}
        }
        
        // Capture segment
        if (url.includes('whalesignal.ai') && status === 200) {
            try {
                const buffer = await response.buffer();
                if (buffer.length > 10000 && !capturedSegment) {
                    capturedSegment = buffer;
                    console.log(`[SEGMENT] ✓ Captured: ${buffer.length} bytes`);
                }
            } catch (e) {}
        }
    });

    // Start from the main DLHD page
    const mainUrl = `https://dlhd.dad/casting/stream-${streamId}.php`;
    console.log(`\n1. Loading main page: ${mainUrl}\n`);

    try {
        await page.goto(mainUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        // Wait for everything to load
        await new Promise(r => setTimeout(r, 8000));

        // Get all frames
        const frames = page.frames();
        console.log(`\nFound ${frames.length} frames:`);
        frames.forEach((f, i) => {
            console.log(`  ${i}: ${f.url().substring(0, 100)}`);
        });

        // Look for the player frame
        for (const frame of frames) {
            const frameUrl = frame.url();
            if (frameUrl.includes('giokko.ru') || frameUrl.includes('epicplayplay') || frameUrl.includes('daddyhd')) {
                console.log(`\nFound player frame: ${frameUrl}`);
                
                // Try to get video info from this frame
                try {
                    const videoInfo = await frame.evaluate(() => {
                        const videos = document.querySelectorAll('video');
                        return {
                            count: videos.length,
                            sources: Array.from(videos).map(v => v.src || v.currentSrc),
                        };
                    });
                    console.log('Video info:', videoInfo);
                } catch (e) {}
            }
        }

        // Wait more for stream to start
        await new Promise(r => setTimeout(r, 5000));

    } catch (e) {
        console.log('Error:', e.message);
    }

    await browser.close();

    // Results
    console.log('\n' + '='.repeat(70));
    console.log('CAPTURED DATA');
    console.log('='.repeat(70));

    if (capturedKey) {
        console.log(`\n✓ Key: ${capturedKey.toString('hex')}`);
        fs.writeFileSync(path.join(__dirname, `dlhd-key-${streamId}.bin`), capturedKey);
    } else {
        console.log('\n✗ No key captured');
    }

    if (capturedSegment) {
        console.log(`✓ Segment: ${capturedSegment.length} bytes`);
        fs.writeFileSync(path.join(__dirname, `dlhd-segment-${streamId}.bin`), capturedSegment);
    } else {
        console.log('✗ No segment captured');
    }

    if (m3u8Content) {
        console.log(`✓ M3U8: ${m3u8Content.length} chars`);
        fs.writeFileSync(path.join(__dirname, `dlhd-m3u8-${streamId}.txt`), m3u8Content);
    }

    // If we have all pieces, decrypt
    if (capturedKey && capturedSegment && ivHex) {
        console.log('\n' + '='.repeat(70));
        console.log('DECRYPTION');
        console.log('='.repeat(70));

        const ivBuffer = Buffer.alloc(16, 0);
        const ivBytes = Buffer.from(ivHex, 'hex');
        ivBytes.copy(ivBuffer, 16 - ivBytes.length);

        console.log(`\nKey: ${capturedKey.toString('hex')}`);
        console.log(`IV:  ${ivBuffer.toString('hex')}`);

        try {
            const decipher = crypto.createDecipheriv('aes-128-cbc', capturedKey, ivBuffer);
            const decrypted = Buffer.concat([
                decipher.update(capturedSegment),
                decipher.final()
            ]);

            console.log(`\n✓ Decryption successful!`);
            console.log(`Decrypted: ${decrypted.length} bytes`);
            
            if (decrypted[0] === 0x47) {
                console.log(`✓ Valid MPEG-TS`);
            }

            const outputPath = path.join(__dirname, `dlhd-decrypted-${streamId}.ts`);
            fs.writeFileSync(outputPath, decrypted);
            console.log(`✓ Saved: ${outputPath}`);

        } catch (e) {
            console.log(`Decryption error: ${e.message}`);
        }
    }
}

tracePlayer(parseInt(process.argv[2]) || 769).catch(console.error);
