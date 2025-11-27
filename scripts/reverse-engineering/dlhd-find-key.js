/**
 * DLHD.dad Find Real Key
 * 
 * The key URL in M3U8 returns 404, so we need to find where the real key comes from
 */

const puppeteer = require('puppeteer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function findKey(streamId = 769) {
    console.log('DLHD Find Real Key\n');
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

    // Track ALL responses that could be keys (16 bytes or binary data)
    const potentialKeys = [];
    let m3u8Content = null;
    let capturedSegment = null;

    page.on('response', async response => {
        const url = response.url();
        const status = response.status();
        const contentType = response.headers()['content-type'] || '';
        
        if (status !== 200) return;
        
        try {
            // Skip known non-key responses
            if (url.includes('.js') || url.includes('.css') || url.includes('.png') || 
                url.includes('.jpg') || url.includes('.gif') || url.includes('.svg') ||
                url.includes('.woff') || url.includes('.ttf') || url.includes('histats') ||
                url.includes('sharethis') || url.includes('dtscout') || url.includes('lijit') ||
                url.includes('crwdcntrl') || url.includes('intentiq') || url.includes('rlcdn') ||
                url.includes('adsrvr') || url.includes('33across')) {
                return;
            }

            const buffer = await response.buffer();
            
            // Capture M3U8
            if (url.includes('mono.css') || buffer.toString().includes('#EXTM3U')) {
                m3u8Content = buffer.toString();
                console.log(`[M3U8] ${url.substring(0, 60)}`);
                return;
            }
            
            // Capture segment
            if (url.includes('whalesignal.ai') && buffer.length > 10000) {
                if (!capturedSegment) {
                    capturedSegment = buffer;
                    console.log(`[SEGMENT] ${buffer.length} bytes`);
                }
                return;
            }
            
            // Look for potential keys - exactly 16 bytes or binary data
            if (buffer.length === 16) {
                const hex = buffer.toString('hex');
                const isJson = buffer.toString().startsWith('{');
                console.log(`[16 BYTES] ${url.substring(0, 60)} - ${hex} ${isJson ? '(JSON)' : ''}`);
                if (!isJson) {
                    potentialKeys.push({ url, data: buffer, hex });
                }
            }
            
            // Also check for octet-stream responses
            if (contentType.includes('octet-stream') || contentType.includes('binary')) {
                console.log(`[BINARY] ${url.substring(0, 60)} - ${buffer.length} bytes`);
                if (buffer.length === 16) {
                    potentialKeys.push({ url, data: buffer, hex: buffer.toString('hex') });
                }
            }
            
        } catch (e) {}
    });

    // Load the main page
    console.log(`\nLoading: https://dlhd.dad/casting/stream-${streamId}.php\n`);

    await page.goto(`https://dlhd.dad/casting/stream-${streamId}.php`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
    }).catch(() => {});

    // Wait for stream to fully initialize
    console.log('\nWaiting for stream to initialize...');
    await new Promise(r => setTimeout(r, 15000));

    await browser.close();

    // Results
    console.log('\n' + '='.repeat(70));
    console.log('RESULTS');
    console.log('='.repeat(70));

    console.log(`\nPotential keys found: ${potentialKeys.length}`);
    potentialKeys.forEach((k, i) => {
        console.log(`  ${i + 1}. ${k.hex} from ${k.url.substring(0, 50)}`);
    });

    if (!m3u8Content) {
        console.log('\n✗ No M3U8 captured');
        return;
    }

    // Parse M3U8
    const ivMatch = m3u8Content.match(/IV=0x([a-fA-F0-9]+)/);
    const ivHex = ivMatch ? ivMatch[1] : null;
    console.log(`\nIV from M3U8: ${ivHex}`);

    if (!capturedSegment) {
        console.log('✗ No segment captured');
        return;
    }

    console.log(`Segment: ${capturedSegment.length} bytes`);

    // Save segment for analysis
    fs.writeFileSync(path.join(__dirname, `dlhd-segment-${streamId}.bin`), capturedSegment);
    fs.writeFileSync(path.join(__dirname, `dlhd-m3u8-${streamId}.txt`), m3u8Content);

    // Try each potential key
    if (potentialKeys.length > 0 && ivHex) {
        console.log('\n' + '='.repeat(70));
        console.log('TRYING DECRYPTION WITH EACH KEY');
        console.log('='.repeat(70));

        const ivBuffer = Buffer.alloc(16, 0);
        const ivBytes = Buffer.from(ivHex, 'hex');
        ivBytes.copy(ivBuffer, 16 - ivBytes.length);

        for (const key of potentialKeys) {
            console.log(`\nTrying key: ${key.hex}`);
            try {
                const decipher = crypto.createDecipheriv('aes-128-cbc', key.data, ivBuffer);
                const decrypted = Buffer.concat([
                    decipher.update(capturedSegment),
                    decipher.final()
                ]);

                console.log(`✓ Decryption successful! ${decrypted.length} bytes`);
                
                if (decrypted[0] === 0x47) {
                    console.log(`✓ Valid MPEG-TS!`);
                }

                const outputPath = path.join(__dirname, `dlhd-decrypted-${streamId}.ts`);
                fs.writeFileSync(outputPath, decrypted);
                console.log(`✓ Saved: ${outputPath}`);
                return;

            } catch (e) {
                console.log(`✗ Failed: ${e.message}`);
            }
        }
    }

    // If no keys worked, the stream might not be encrypted or uses a different method
    console.log('\n' + '='.repeat(70));
    console.log('ANALYZING SEGMENT');
    console.log('='.repeat(70));

    console.log(`\nFirst 64 bytes of segment:`);
    console.log(capturedSegment.slice(0, 64).toString('hex'));
    
    // Check if it's already MPEG-TS (starts with 0x47)
    if (capturedSegment[0] === 0x47) {
        console.log('\n✓ Segment appears to be unencrypted MPEG-TS!');
        const outputPath = path.join(__dirname, `dlhd-decrypted-${streamId}.ts`);
        fs.writeFileSync(outputPath, capturedSegment);
        console.log(`✓ Saved: ${outputPath}`);
    }
}

findKey(parseInt(process.argv[2]) || 769).catch(console.error);
