const puppeteer = require('puppeteer');

async function navigateDirect(url) {
    console.log(`\n📍 Navigating to: ${url}`);

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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log('⏳ Connecting...');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log(`\n✅ Page loaded (domcontentloaded): ${page.url()}`);

        // Wait a bit for scripts
        await new Promise(r => setTimeout(r, 2000));

        // Log HTML title and body length
        const title = await page.title();
        const bodyLen = await page.evaluate(() => document.body.innerHTML.length);
        console.log(`📄 Title: ${title}`);
        console.log(`📄 Body Length: ${bodyLen}`);

        // Wait for content
        await new Promise(r => setTimeout(r, 5000));

        // Check for video
        const video = await page.$('video');
        if (video) {
            console.log('🎥 Video element found!');
            const src = await page.evaluate(v => v.src, video);
            console.log(`   Src: ${src}`);
        } else {
            console.log('ℹ️  No video element found.');
        }

        // Check for play button
        const btn = await page.$('#pl_but_background, #pl_but');
        if (btn) {
            console.log('🖱️  Play button found. Clicking...');
            await btn.click();
            await new Promise(r => setTimeout(r, 5000));

            // Check again
            const video2 = await page.$('video');
            if (video2) {
                console.log('🎥 Video element found after click!');
                const src = await page.evaluate(v => v.src, video2);
                console.log(`   Src: ${src}`);
            } else {
                console.log('ℹ️  Still no video after click.');
                // Check if iframe loaded
                const frames = page.frames();
                console.log(`ℹ️  Frames: ${frames.length}`);
                frames.forEach(f => console.log(`   ${f.url()}`));
            }
        } else {
            console.log('ℹ️  No play button found.');
        }

    } catch (e) {
        console.error(`❌ Error: ${e.message}`);
    }

    await browser.close();
}

const url = process.argv[2];
if (url) {
    navigateDirect(url);
} else {
    console.log('Usage: node superembed-direct-navigator.js <url>');
}
