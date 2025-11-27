/**
 * DLHD.dad XOR Decoder
 * 
 * Based on the discovered pattern:
 * [...atob(data)].map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('DLHD XOR Decoder\n');

// Read the fresh HTML
const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract the encoded data
const encodedMatch = html.match(/window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/);
if (!encodedMatch) {
    console.error('Could not find encoded player data');
    process.exit(1);
}

const encoded = encodedMatch[1];
console.log(`Encoded data length: ${encoded.length}`);

// First, base64 decode
const b64decoded = Buffer.from(encoded, 'base64');
console.log(`Base64 decoded length: ${b64decoded.length}`);
console.log(`First 50 bytes (hex): ${b64decoded.slice(0, 50).toString('hex')}`);

// Now we need to find the XOR key
// The key is likely derived from the script or a constant

// Common XOR keys to try
const potentialKeys = [
    'x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF',  // Ad config variable name
    'ZpQw9XkLmN8c3vR3',                  // Encoded data variable name
    'dlhd',
    'stream',
    'player',
    'video',
    'wpnxiswpuyrfn',                     // Ad server domain
    'rpyztjadsbonh',                     // CDN domain
    'dlhd.dad',
    'casting',
    'stream-769',
    '769',
    // Try the decoded strings from the obfuscated script
    'pjs_drv_cast',
    'Clappr',
    'jwplayer',
];

console.log('\n' + '='.repeat(60));
console.log('XOR DECODING ATTEMPTS');
console.log('='.repeat(60));

function xorDecode(data, key) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(data[i] ^ key.charCodeAt(i % key.length));
    }
    return result;
}

function isPrintable(str) {
    return /^[\x20-\x7E\n\r\t]+$/.test(str);
}

function hasJsonStructure(str) {
    return str.includes('{') && str.includes('}') && (str.includes(':') || str.includes('"'));
}

potentialKeys.forEach(key => {
    const decoded = xorDecode(b64decoded, key);
    const printable = decoded.replace(/[^\x20-\x7E]/g, '.');
    const printableRatio = (decoded.match(/[\x20-\x7E]/g) || []).length / decoded.length;
    
    console.log(`\nKey: "${key}"`);
    console.log(`  Printable ratio: ${(printableRatio * 100).toFixed(1)}%`);
    console.log(`  First 100 chars: ${printable.substring(0, 100)}`);
    
    if (printableRatio > 0.8) {
        console.log(`  *** HIGH PRINTABLE RATIO - POSSIBLE MATCH ***`);
    }
    
    if (hasJsonStructure(decoded)) {
        console.log(`  *** CONTAINS JSON STRUCTURE ***`);
        try {
            const json = JSON.parse(decoded);
            console.log(`  Parsed JSON:`, JSON.stringify(json, null, 2).substring(0, 500));
        } catch (e) {}
    }
});

// Try to extract the actual key from the script
console.log('\n' + '='.repeat(60));
console.log('EXTRACTING KEY FROM SCRIPT');
console.log('='.repeat(60));

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

// Find the XOR key pattern - look for the string that's used with charCodeAt in XOR
// Pattern: _0x2e2ca9=_0x4de1ae(0xbad)+_0x4de1ae(0xb73)
const keyPattern = /_0x[a-f0-9]+\s*=\s*_0x[a-f0-9]+\(0x[a-f0-9]+\)\s*\+\s*_0x[a-f0-9]+\(0x[a-f0-9]+\)/g;
const keyMatches = scriptContent.match(keyPattern) || [];
console.log(`\nFound ${keyMatches.length} potential key construction patterns`);
keyMatches.slice(0, 5).forEach(m => console.log(`  ${m}`));

// Create sandbox to decode the key indices
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
} catch (e) {}

const decoder = sandbox._0xb4a0;
if (typeof decoder === 'function') {
    console.log('\nDecoder available, trying to find key indices...');
    
    // The pattern shows: _0x4de1ae(0xbad)+_0x4de1ae(0xb73)
    // Let's decode these indices
    const keyIndices = [
        [0xbad, 0xb73],  // From the pattern we found
        [0xc0b, 0xd00],  // cdnDomain, velocecdn
    ];
    
    keyIndices.forEach(([idx1, idx2]) => {
        try {
            const part1 = decoder(idx1);
            const part2 = decoder(idx2);
            const key = part1 + part2;
            console.log(`\nKey from indices [0x${idx1.toString(16)}, 0x${idx2.toString(16)}]:`);
            console.log(`  Part 1: "${part1}"`);
            console.log(`  Part 2: "${part2}"`);
            console.log(`  Combined: "${key}"`);
            
            // Try decoding with this key
            const decoded = xorDecode(b64decoded, key);
            const printableRatio = (decoded.match(/[\x20-\x7E]/g) || []).length / decoded.length;
            console.log(`  Decoded printable ratio: ${(printableRatio * 100).toFixed(1)}%`);
            console.log(`  First 100 chars: ${decoded.replace(/[^\x20-\x7E]/g, '.').substring(0, 100)}`);
            
            if (printableRatio > 0.8) {
                console.log(`  *** LIKELY CORRECT KEY ***`);
                console.log(`  Full decoded: ${decoded}`);
            }
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    });
    
    // Try all combinations of decoded strings that might be keys
    console.log('\nTrying decoded string combinations as keys...');
    
    // Get some decoded strings that might be key parts
    const keyParts = [];
    for (let i = 0xb00; i < 0xc00; i++) {
        try {
            const decoded = decoder(i);
            if (decoded && decoded.length >= 5 && decoded.length <= 30) {
                keyParts.push({ idx: i, value: decoded });
            }
        } catch (e) {}
    }
    
    console.log(`Found ${keyParts.length} potential key parts`);
    
    // Try each as a key
    let bestMatch = { key: '', ratio: 0, decoded: '' };
    
    keyParts.forEach(({ idx, value }) => {
        const decoded = xorDecode(b64decoded, value);
        const printableRatio = (decoded.match(/[\x20-\x7E]/g) || []).length / decoded.length;
        
        if (printableRatio > bestMatch.ratio) {
            bestMatch = { key: value, ratio: printableRatio, decoded, idx };
        }
    });
    
    if (bestMatch.ratio > 0.5) {
        console.log(`\nBest single key match:`);
        console.log(`  Key: "${bestMatch.key}" (index 0x${bestMatch.idx.toString(16)})`);
        console.log(`  Printable ratio: ${(bestMatch.ratio * 100).toFixed(1)}%`);
        console.log(`  First 200 chars: ${bestMatch.decoded.replace(/[^\x20-\x7E]/g, '.').substring(0, 200)}`);
    }
}

// Try brute force with short keys
console.log('\n' + '='.repeat(60));
console.log('BRUTE FORCE SHORT KEYS');
console.log('='.repeat(60));

// Try single character XOR
console.log('\nTrying single character XOR...');
for (let c = 0; c < 256; c++) {
    const key = String.fromCharCode(c);
    const decoded = xorDecode(b64decoded, key);
    const printableRatio = (decoded.match(/[\x20-\x7E]/g) || []).length / decoded.length;
    
    if (printableRatio > 0.7) {
        console.log(`  Key 0x${c.toString(16)} (${c}): ${(printableRatio * 100).toFixed(1)}% printable`);
        console.log(`    ${decoded.replace(/[^\x20-\x7E]/g, '.').substring(0, 100)}`);
    }
}

console.log('\n' + '='.repeat(60));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(60));
