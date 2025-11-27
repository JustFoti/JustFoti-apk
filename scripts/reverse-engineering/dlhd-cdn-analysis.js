/**
 * DLHD.dad CDN Stream Analysis
 * 
 * Focused analysis on how streams are loaded from velocecdn and other CDNs
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('DLHD CDN Stream Analysis\n');

// Read the fresh HTML
const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract the main script
let scriptContent = null;
const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
for (const tag of scriptTags) {
    const content = tag.replace(/<\/?script[^>]*>/gi, '');
    if (content.includes('function _0x8b05')) {
        scriptContent = content;
        break;
    }
}

// Create minimal sandbox just to get the decoder working
const sandbox = {
    window: {},
    document: { createElement: () => ({ style: {} }) },
    navigator: { userAgent: 'Mozilla/5.0' },
    location: { href: 'https://dlhd.dad/' },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout: () => 1,
    setInterval: () => 1,
    String, Array, Object, Date, Math, Number, Boolean, RegExp, Error,
    parseInt, parseFloat, JSON,
    btoa: (s) => Buffer.from(s).toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
};
sandbox.window = sandbox;
sandbox.self = sandbox;

vm.createContext(sandbox);

try {
    vm.runInContext(scriptContent, sandbox, { timeout: 60000 });
} catch (e) {
    // Ignore errors, we just need the decoder
}

const decoder = sandbox._0xb4a0;
if (typeof decoder !== 'function') {
    console.error('Decoder not available');
    process.exit(1);
}

console.log('Decoder function ready!\n');

// Decode ALL strings and categorize them
console.log('Decoding all strings...\n');

const allStrings = {};
const categories = {
    urls: [],
    cdn: [],
    stream: [],
    player: [],
    m3u8: [],
    hls: [],
    video: [],
    source: [],
    file: [],
    config: [],
    domain: [],
};

for (let i = 0; i < 0x2000; i++) {
    try {
        const decoded = decoder(i);
        if (decoded && typeof decoded === 'string' && decoded.length > 0) {
            allStrings[`0x${i.toString(16)}`] = decoded;
            
            const lower = decoded.toLowerCase();
            
            // Categorize
            if (lower.includes('http') || lower.includes('://')) categories.urls.push({ i, decoded });
            if (lower.includes('cdn')) categories.cdn.push({ i, decoded });
            if (lower.includes('stream')) categories.stream.push({ i, decoded });
            if (lower.includes('player') || lower.includes('jwplayer') || lower.includes('clappr')) categories.player.push({ i, decoded });
            if (lower.includes('m3u8')) categories.m3u8.push({ i, decoded });
            if (lower.includes('hls')) categories.hls.push({ i, decoded });
            if (lower.includes('video')) categories.video.push({ i, decoded });
            if (lower.includes('source')) categories.source.push({ i, decoded });
            if (lower.includes('file')) categories.file.push({ i, decoded });
            if (lower.includes('config') || lower.includes('setup')) categories.config.push({ i, decoded });
            if (lower.includes('.com') || lower.includes('.net') || lower.includes('.io') || 
                lower.includes('.live') || lower.includes('.tv') || lower.includes('veloce')) {
                categories.domain.push({ i, decoded });
            }
        }
    } catch (e) {}
}

console.log(`Total decoded strings: ${Object.keys(allStrings).length}\n`);

// Print categorized results
console.log('='.repeat(60));
console.log('CATEGORIZED STRINGS');
console.log('='.repeat(60));

for (const [category, items] of Object.entries(categories)) {
    if (items.length > 0) {
        console.log(`\n${category.toUpperCase()} (${items.length}):`);
        items.slice(0, 15).forEach(({ i, decoded }) => {
            console.log(`  [0x${i.toString(16)}] "${decoded}"`);
        });
        if (items.length > 15) console.log(`  ... and ${items.length - 15} more`);
    }
}

// Now search the raw script for patterns that use these decoded strings
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR CDN/STREAM PATTERNS IN CODE');
console.log('='.repeat(60));

// Look for velocecdn references
const veloceMatches = scriptContent.match(/velocecdn[^'"\s]*/gi) || [];
console.log(`\nvelocecdn references: ${veloceMatches.length}`);
[...new Set(veloceMatches)].slice(0, 10).forEach(m => console.log(`  ${m}`));

// Look for cdnDomain usage
const cdnDomainMatches = scriptContent.match(/cdnDomain[^'"\s,;)}\]]*/gi) || [];
console.log(`\ncdnDomain references: ${cdnDomainMatches.length}`);
[...new Set(cdnDomainMatches)].slice(0, 10).forEach(m => console.log(`  ${m}`));

// Look for m3u8 patterns
const m3u8Matches = scriptContent.match(/\.m3u8[^'"\s]*/gi) || [];
console.log(`\nm3u8 references: ${m3u8Matches.length}`);
[...new Set(m3u8Matches)].slice(0, 10).forEach(m => console.log(`  ${m}`));

// Look for stream URL construction patterns
const streamPatterns = [
    /https?:\/\/[^'"]+stream[^'"]*/gi,
    /https?:\/\/[^'"]+live[^'"]*/gi,
    /https?:\/\/[^'"]+cdn[^'"]*/gi,
];

console.log('\nStream URL patterns in code:');
streamPatterns.forEach(pattern => {
    const matches = scriptContent.match(pattern) || [];
    if (matches.length > 0) {
        console.log(`  Pattern ${pattern}:`);
        [...new Set(matches)].slice(0, 5).forEach(m => console.log(`    ${m.substring(0, 100)}`));
    }
});

// Extract window config
console.log('\n' + '='.repeat(60));
console.log('WINDOW CONFIGURATION');
console.log('='.repeat(60));

const adConfigMatch = html.match(/window\['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'\]\s*=\s*(\{[^}]+\});/);
if (adConfigMatch) {
    console.log('\nAd Server Config:');
    console.log(adConfigMatch[1]);
}

// Look for the encoded player data and try to decode it
const encodedMatch = html.match(/window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/);
if (encodedMatch) {
    const encoded = encodedMatch[1];
    console.log('\nEncoded Player Data:');
    console.log(`  Length: ${encoded.length}`);
    console.log(`  Sample: ${encoded.substring(0, 80)}...`);
    
    // Try various decoding methods
    console.log('\nDecoding attempts:');
    
    // Try base64
    try {
        const b64 = Buffer.from(encoded, 'base64').toString('utf8');
        console.log(`  Base64: ${b64.substring(0, 100)}...`);
    } catch (e) {
        console.log('  Base64: failed');
    }
    
    // Try XOR with common keys
    const xorKeys = ['dlhd', 'stream', 'video', 'player'];
    xorKeys.forEach(key => {
        try {
            let result = '';
            for (let i = 0; i < Math.min(encoded.length, 100); i++) {
                result += String.fromCharCode(encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            if (/^[\x20-\x7E]+$/.test(result)) {
                console.log(`  XOR(${key}): ${result}`);
            }
        } catch (e) {}
    });
}

// Look for the actual player initialization in the script
console.log('\n' + '='.repeat(60));
console.log('PLAYER INITIALIZATION PATTERNS');
console.log('='.repeat(60));

// Find function calls that might set up the player
const setupPatterns = [
    /setup\s*\(\s*\{[^}]*file[^}]*\}/gi,
    /source\s*:\s*['"][^'"]+['"]/gi,
    /file\s*:\s*['"][^'"]+['"]/gi,
    /loadSource\s*\([^)]+\)/gi,
];

setupPatterns.forEach(pattern => {
    const matches = scriptContent.match(pattern) || [];
    if (matches.length > 0) {
        console.log(`\nPattern ${pattern}:`);
        matches.slice(0, 3).forEach(m => console.log(`  ${m.substring(0, 150)}`));
    }
});

// Save all decoded strings for reference
const outputPath = path.join(__dirname, 'dlhd-all-decoded-strings.json');
fs.writeFileSync(outputPath, JSON.stringify(allStrings, null, 2));
console.log(`\nAll decoded strings saved to: ${outputPath}`);

// Save categorized strings
const categorizedPath = path.join(__dirname, 'dlhd-categorized-strings.json');
fs.writeFileSync(categorizedPath, JSON.stringify(categories, null, 2));
console.log(`Categorized strings saved to: ${categorizedPath}`);

console.log('\n' + '='.repeat(60));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(60));
