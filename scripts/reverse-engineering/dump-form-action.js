const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function dumpFormAction(id, type = 'movie') {
    const embedUrl = `https://vidsrc-embed.ru/embed/${type}/${id}`;
    console.log(`Navigating to: ${embedUrl}`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('Page loaded.');

        // Helper to find form in all frames
        const findForm = async () => {
            const frames = page.frames();
            for (const frame of frames) {
                try {
                    const formAction = await frame.evaluate(() => {
                        const form = document.querySelector('.form-button-click');
                        const input = document.querySelector('.input-button-click');
                        if (form) {
                            return {
                                found: true,
                                tag: 'form',
                                action: form.action,
                                method: form.method,
                                innerHTML: form.innerHTML,
                                inputName: input ? input.name : 'unknown'
                            };
                        }
                        if (input) {
                            // If input exists but form not found by class, try parent
                            const parent = input.closest('form');
                            return {
                                found: true,
                                tag: 'input-only',
                                action: parent ? parent.action : 'no-parent-form',
                                inputName: input.name
                            };
                        }
                        return null;
                    });

                    if (formAction) {
                        console.log(`\n✅ FOUND FORM in frame: ${frame.url()}`);
                        console.log(JSON.stringify(formAction, null, 2));
                        return formAction;
                    }
                } catch (e) {
                    // Ignore frame access errors
                }
            }
            return null;
        };

        // Check initially
        let result = await findForm();
        if (result) return;

        // Click play button
        console.log('Clicking play button...');
        const frames = page.frames();
        let clicked = false;
        for (const frame of frames) {
            const btn = await frame.$('#pl_but_background, #pl_but, .play-button');
            if (btn) {
                await btn.click();
                console.log(`Clicked button in frame: ${frame.url()}`);
                clicked = true;
                break;
            }
        }

        if (!clicked) {
            console.log('Could not find play button.');
        }

        // Wait and check repeatedly
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1000));
            console.log(`Checking for form (attempt ${i + 1})...`);
            result = await findForm();
            if (result) break;
        }

        // Dump all frames HTML if still not found
        if (!result) {
            console.log('Form not found. Dumping frames...');
            for (const frame of frames) {
                try {
                    const html = await frame.content();
                    const safeUrl = frame.url().replace(/[^a-z0-9]/gi, '_').substring(0, 50);
                    fs.writeFileSync(`dump-${safeUrl}.html`, html);
                    console.log(`Dumped ${frame.url()}`);
                } catch (e) { }
            }
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

dumpFormAction('550');
