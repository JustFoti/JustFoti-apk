const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log("🚀 Complete Script Deobfuscation\n");

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        const scriptPath = path.join(__dirname, 'extracted-script-5.js');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        console.log(`📄 Loading ${(scriptContent.length / 1024).toFixed(1)}KB script into browser...`);

        // Load entire script (executes shuffle automatically)
        await page.goto('about:blank');
        await page.addScriptTag({ content: scriptContent });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify decoder is available
        const check = await page.evaluate(() => ({
            hasDecoder: typeof _0x32e7 === 'function',
            arrayLen: typeof _0x5bd0 !== 'undefined' ? _0x5bd0.length : 0
        }));

        if (!check.hasDecoder) {
            throw new Error("Decoder function not available");
        }

        console.log(`✅ Decoder loaded with ${check.arrayLen} string array elements\n`);

        // Split to get just the body
        const splitString = '),function(){';
        const splitIndex = scriptContent.indexOf(splitString);
        const body = scriptContent.substring(splitIndex + 2);

        console.log("🔍 Finding all decoder calls...");

        // Find ALL calls to _0x32e7 (both direct and via proxy functions)
        // This regex matches: functionName(arg1, arg2, ...) where args are numbers/hex
        const callRegex = /(_0x[a-f0-9]+)\(([^)]+)\)/g;
        const allCalls = [];
        let match;

        while ((match = callRegex.exec(body)) !== null) {
            allCalls.push({
                fullMatch: match[0],
                funcName: match[1],
                argsStr: match[2],
                index: match.index
            });
        }

        console.log(`Found ${allCalls.length} total function calls`);

        // Now decode them in the browser by calling the decoder with the actual arguments
        console.log("\n🔓 Decoding strings in batches...\n");

        let deobfuscated = body;
        let totalDecoded = 0;
        const batchSize = 100;

        for (let i = 0; i < allCalls.length; i += batchSize) {
            const batch = allCalls.slice(i, i + batchSize);
            const progress = Math.floor((i / allCalls.length) * 100);
            process.stdout.write(`\r⏳ Progress: ${progress}% (${i}/${allCalls.length}) - Decoded: ${totalDecoded}`);

            // Decode this batch in the browser
            const decoded = await page.evaluate((callsBatch) => {
                const results = [];

                for (const call of callsBatch) {
                    try {
                        // Try to evaluate the call to get its result
                        const result = eval(call.fullMatch);

                        // Only keep if it's a string (decoded value)
                        if (typeof result === 'string') {
                            results.push({
                                fullMatch: call.fullMatch,
                                decoded: result,
                                success: true
                            });
                        } else {
                            results.push({ fullMatch: call.fullMatch, success: false });
                        }
                    } catch (e) {
                        results.push({ fullMatch: call.fullMatch, success: false });
                    }
                }

                return results;
            }, batch);

            // Replace successfully decoded calls
            // We need to be careful about replacement order to avoid replacing substrings
            const successfulDecodes = decoded.filter(d => d.success);

            for (const result of successfulDecodes) {
                // Escape special regex characters in the match
                const escapedMatch = result.fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedMatch, 'g');

                deobfuscated = deobfuscated.replace(regex, JSON.stringify(result.decoded));
                totalDecoded++;
            }
        }

        console.log(`\r✅ Progress: 100% (${allCalls.length}/${allCalls.length}) - Decoded: ${totalDecoded}  \n`);

        // Save output
        const outputPath = path.join(__dirname, 'deobfuscated-script-5.js');
        fs.writeFileSync(outputPath, deobfuscated);

        console.log(`\n💾 Saved to: ${path.basename(outputPath)}`);
        console.log(`📊 File size: ${(deobfuscated.length / 1024).toFixed(1)}KB\n`);

        // Analyze for key terms
        console.log("=== 🔎 Key Term Analysis ===");
        const terms = {
            'ZpQw9XkLmN8c3vR3': 'Full config variable',
            'ZpQw': 'Config variable (partial)',
            'window[': 'Window property access',
            'atob': 'Base64 decode',
            'fetch': 'Fetch API',
            'XMLHttpRequest': 'AJAX request',
            'm3u8': 'HLS playlist',
            'mp4': 'Video file',
            'sources': 'Sources array',
            'play': 'Play function'
        };

        let foundTerms = 0;
        for (const [term, desc] of Object.entries(terms)) {
            const regex = new RegExp(term, 'gi');
            const matches = deobfuscated.match(regex);
            const count = matches ? matches.length : 0;

            if (count > 0) {
                console.log(`  ✓ ${desc}: ${count} occurrence(s)`);
                foundTerms++;

                // Show context for critical terms
                if (term.includes('ZpQw') || term === 'sources') {
                    const contextRegex = new RegExp(`.{0,80}${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.{0,80}`, 'i');
                    const ctx = deobfuscated.match(contextRegex);
                    if (ctx && ctx[0]) {
                        console.log(`    → ...${ctx[0].substring(0, 120)}...`);
                    }
                }
            }
        }

        if (foundTerms === 0) {
            console.log("  ⚠️ No key terms found - script may still be partially obfuscated");
        }

        console.log("\n✨ Deobfuscation complete!");

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.stack) console.error(error.stack.substring(0, 1000));
    } finally {
        await browser.close();
    }
})();
