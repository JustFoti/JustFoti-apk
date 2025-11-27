/**
 * DLHD.dad - Find the actual decoder for player data
 */

const fs = require('fs');
const path = require('path');

console.log('DLHD Decoder Finder\n');

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

console.log(`Script length: ${scriptContent.length} chars\n`);

// Find where ZpQw9XkLmN8c3vR3 is used
const varName = 'ZpQw9XkLmN8c3vR3';

// Search for the variable in different contexts
console.log('='.repeat(60));
console.log('SEARCHING FOR ENCODED DATA USAGE');
console.log('='.repeat(60));

// Find all occurrences with surrounding context
let pos = 0;
let occurrences = [];
while ((pos = scriptContent.indexOf(varName, pos)) !== -1) {
    const start = Math.max(0, pos - 100);
    const end = Math.min(scriptContent.length, pos + varName.length + 200);
    occurrences.push({
        position: pos,
        context: scriptContent.substring(start, end)
    });
    pos++;
}

console.log(`\nFound ${occurrences.length} occurrences of '${varName}'`);
occurrences.forEach((occ, i) => {
    console.log(`\n--- Occurrence ${i + 1} at position ${occ.position} ---`);
    console.log(occ.context.replace(/\n/g, ' ').substring(0, 300));
});

// Look for atob usage (base64 decode)
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR atob USAGE');
console.log('='.repeat(60));

pos = 0;
let atobOccurrences = [];
while ((pos = scriptContent.indexOf('atob', pos)) !== -1) {
    const start = Math.max(0, pos - 50);
    const end = Math.min(scriptContent.length, pos + 150);
    atobOccurrences.push({
        position: pos,
        context: scriptContent.substring(start, end)
    });
    pos++;
}

console.log(`\nFound ${atobOccurrences.length} occurrences of 'atob'`);
atobOccurrences.forEach((occ, i) => {
    console.log(`\n--- atob ${i + 1} at position ${occ.position} ---`);
    console.log(occ.context.replace(/\n/g, ' '));
});

// Look for charCodeAt usage (often used in custom decoders)
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR charCodeAt USAGE');
console.log('='.repeat(60));

pos = 0;
let charCodeOccurrences = [];
while ((pos = scriptContent.indexOf('charCodeAt', pos)) !== -1) {
    const start = Math.max(0, pos - 100);
    const end = Math.min(scriptContent.length, pos + 200);
    charCodeOccurrences.push({
        position: pos,
        context: scriptContent.substring(start, end)
    });
    pos++;
}

console.log(`\nFound ${charCodeOccurrences.length} occurrences of 'charCodeAt'`);
charCodeOccurrences.forEach((occ, i) => {
    console.log(`\n--- charCodeAt ${i + 1} at position ${occ.position} ---`);
    console.log(occ.context.replace(/\n/g, ' ').substring(0, 300));
});

// Look for XOR operations (^)
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR XOR PATTERNS');
console.log('='.repeat(60));

// XOR is often used in decoding: char ^ key
const xorPattern = /\w+\s*\^\s*\w+/g;
const xorMatches = scriptContent.match(xorPattern) || [];
console.log(`\nFound ${xorMatches.length} XOR operations`);
console.log('Sample XOR patterns:');
[...new Set(xorMatches)].slice(0, 20).forEach(m => console.log(`  ${m}`));

// Look for the ad config variable usage
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR AD CONFIG USAGE');
console.log('='.repeat(60));

const adConfigVar = 'x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF';
pos = 0;
let adConfigOccurrences = [];
while ((pos = scriptContent.indexOf(adConfigVar, pos)) !== -1) {
    const start = Math.max(0, pos - 50);
    const end = Math.min(scriptContent.length, pos + adConfigVar.length + 150);
    adConfigOccurrences.push({
        position: pos,
        context: scriptContent.substring(start, end)
    });
    pos++;
}

console.log(`\nFound ${adConfigOccurrences.length} occurrences of ad config var`);
adConfigOccurrences.slice(0, 5).forEach((occ, i) => {
    console.log(`\n--- Ad Config ${i + 1} at position ${occ.position} ---`);
    console.log(occ.context.replace(/\n/g, ' ').substring(0, 250));
});

// Look for velocecdn usage
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR VELOCECDN USAGE');
console.log('='.repeat(60));

pos = 0;
let veloceOccurrences = [];
const velocePattern = /velocecdn/gi;
let match;
while ((match = velocePattern.exec(scriptContent)) !== null) {
    const start = Math.max(0, match.index - 100);
    const end = Math.min(scriptContent.length, match.index + 200);
    veloceOccurrences.push({
        position: match.index,
        context: scriptContent.substring(start, end)
    });
}

console.log(`\nFound ${veloceOccurrences.length} occurrences of 'velocecdn'`);
veloceOccurrences.forEach((occ, i) => {
    console.log(`\n--- velocecdn ${i + 1} at position ${occ.position} ---`);
    console.log(occ.context.replace(/\n/g, ' ').substring(0, 300));
});

// Look for stream/m3u8/hls patterns
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR STREAM PATTERNS');
console.log('='.repeat(60));

const streamPatterns = ['m3u8', 'hls', 'playlist', 'manifest', '.ts'];
streamPatterns.forEach(pattern => {
    const regex = new RegExp(pattern, 'gi');
    const matches = [];
    while ((match = regex.exec(scriptContent)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(scriptContent.length, match.index + 100);
        matches.push(scriptContent.substring(start, end));
    }
    if (matches.length > 0) {
        console.log(`\n${pattern}: ${matches.length} occurrences`);
        matches.slice(0, 3).forEach(m => console.log(`  ${m.replace(/\n/g, ' ').substring(0, 150)}`));
    }
});

// Look for URL construction patterns
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR URL CONSTRUCTION');
console.log('='.repeat(60));

const urlPatterns = [
    /https?:\/\/[^'"]+/g,
    /protocol\s*\+\s*['"][^'"]*['"]/g,
    /hostname|host\s*\+/g,
];

urlPatterns.forEach(pattern => {
    const matches = scriptContent.match(pattern) || [];
    if (matches.length > 0) {
        console.log(`\nPattern ${pattern}:`);
        [...new Set(matches)].slice(0, 10).forEach(m => console.log(`  ${m.substring(0, 100)}`));
    }
});

console.log('\n' + '='.repeat(60));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(60));
