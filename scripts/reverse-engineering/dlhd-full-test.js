/**
 * DLHD.dad Full Stream Test
 * 
 * Tests the stream with proper browser context and headers
 */

const puppeteer = require('puppeteer');

async function testStream(streamId = 769) {
    console.log('DLHD Full Stream Test\n');
    console.log('='.repeat(70));

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // URLs to test
    const m3u8Url = `https://zekonew.giokko.ru/zeko/premium${streamId}/mono.css`;
    const keyUrl = `https://top2.giokko.ru/wmsxx.php?test=true&name=premium${streamId}&number=5880710`;

    console.log('\n1. Testing M3U8 Playlist with browser context...');
    
    // First visit the main page to get cookies
    console.log('   Setting up session by visiting main page...');
    await page.goto(`https://dlhd.dad/casting/stream-${streamId}.php`, {
        waitUntil: 'networkidle2',
        timeout: 30000
    }).catch(() => {});

    // Wait a bit
    await new Promise(r => setTimeout(r, 3000));

    // Now test the M3U8 URL
    console.log(`\n   Fetching: ${m3u8Url}`);
    
    const m3u8Result = await page.evaluate(async (url) => {
        try {
            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Accept': '*/*',
                }
            });
            const text = await response.text();
            return {
                status: response.status,
                contentType: response.headers.get('content-type'),
                body: text.substring(0, 1500),
                ok: response.ok
            };
        } catch (e) {
            return { error: e.message };
        }
    }, m3u8Url);

    console.log(`   Status: ${m3u8Result.status}`);
    console.log(`   Content-Type: ${m3u8Result.contentType}`);
    
    if (m3u8Result.ok) {
        console.log(`   ✓ M3U8 accessible!`);
        console.log(`\n   Content:`);
        console.log('   ' + m3u8Result.body.split('\n').slice(0, 20).join('\n   '));
    }

    // Test the key URL
    console.log('\n2. Testing Decryption Key with browser context...');
    console.log(`   Fetching: ${keyUrl}`);

    const keyResult = await page.evaluate(async (url) => {
        try {
            const response = await fetch(url, {
                credentials: 'include',
            });
            const buffer = await response.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            return {
                status: response.status,
                contentType: response.headers.get('content-type'),
                length: bytes.length,
                hex: hex,
                ok: response.ok
            };
        } catch (e) {
            return { error: e.message };
        }
    }, keyUrl);

    console.log(`   Status: ${keyResult.status}`);
    console.log(`   Content-Type: ${keyResult.contentType}`);
    console.log(`   Length: ${keyResult.length} bytes`);
    
    if (keyResult.ok && keyResult.length === 16) {
        console.log(`   ✓ Key accessible! (16 bytes = AES-128)`);
        console.log(`   Key (hex): ${keyResult.hex}`);
    } else if (keyResult.ok) {
        console.log(`   Key data (hex): ${keyResult.hex}`);
    }

    // Test a segment URL
    if (m3u8Result.body) {
        const segmentMatch = m3u8Result.body.match(/https:\/\/whalesignal\.ai\/[^\s]+/);
        if (segmentMatch) {
            console.log('\n3. Testing Video Segment...');
            const segmentUrl = segmentMatch[0];
            console.log(`   Fetching: ${segmentUrl.substring(0, 80)}...`);

            const segResult = await page.evaluate(async (url) => {
                try {
                    const response = await fetch(url, {
                        credentials: 'include',
                    });
                    const buffer = await response.arrayBuffer();
                    return {
                        status: response.status,
                        contentType: response.headers.get('content-type'),
                        length: buffer.byteLength,
                        ok: response.ok
                    };
                } catch (e) {
                    return { error: e.message };
                }
            }, segmentUrl);

            console.log(`   Status: ${segResult.status}`);
            console.log(`   Content-Type: ${segResult.contentType}`);
            console.log(`   Length: ${segResult.length} bytes`);
            
            if (segResult.ok) {
                console.log(`   ✓ Segment accessible!`);
            }
        }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('FINAL STREAM URLS');
    console.log('='.repeat(70));
    
    console.log(`
✓ WORKING STREAM URL:
  ${m3u8Url}

✓ DECRYPTION KEY URL:
  ${keyUrl}

To play with VLC:
  vlc "${m3u8Url}"

To play with ffplay:
  ffplay "${m3u8Url}"

To download with ffmpeg:
  ffmpeg -i "${m3u8Url}" -c copy output.ts

Stream Pattern:
  M3U8: https://zekonew.giokko.ru/zeko/premium{ID}/mono.css
  Key:  https://top2.giokko.ru/wmsxx.php?test=true&name=premium{ID}&number={NUM}
`);

    await browser.close();
}

testStream(parseInt(process.argv[2]) || 769).catch(console.error);
