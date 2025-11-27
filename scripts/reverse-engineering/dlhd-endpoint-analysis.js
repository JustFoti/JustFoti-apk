/**
 * DLHD.dad Endpoint Analysis
 * 
 * Analyzes the video/slider.php and video/select.php endpoints
 */

const fs = require('fs');
const path = require('path');
const DLHDDecoder = require('./dlhd-decoder-module');

console.log('DLHD Endpoint Analysis\n');
console.log('='.repeat(70));

const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Initialize decoder
const decoder = new DLHDDecoder();
decoder.initialize(html);

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

// Find the #Gt function (video/slider.php)
console.log('ANALYZING #Gt FUNCTION (video/slider.php)');
console.log('='.repeat(70));

// Look for the function that uses 0x73f (/video/sli)
const gtPattern = /#Gt\s*\(\s*\)\s*\{[^}]+0x73f[^}]+\}/g;
let match = scriptContent.match(gtPattern);
if (match) {
    console.log('Found #Gt function:');
    console.log(match[0].substring(0, 500));
}

// Look for broader context around 0x73f
console.log('\nContext around /video/slider.php usage:');
const sliderContext = /.{0,300}0x73f.{0,500}/g;
const sliderMatches = scriptContent.match(sliderContext) || [];
sliderMatches.forEach((ctx, i) => {
    console.log(`\n--- Context ${i + 1} ---`);
    console.log(ctx);
});

// Find the #Qt function (video/select.php)
console.log('\n' + '='.repeat(70));
console.log('ANALYZING #Qt FUNCTION (video/select.php)');
console.log('='.repeat(70));

// Look for broader context around 0x122a
console.log('\nContext around /video/select.php usage:');
const selectContext = /.{0,300}0x122a.{0,500}/g;
const selectMatches = scriptContent.match(selectContext) || [];
selectMatches.forEach((ctx, i) => {
    console.log(`\n--- Context ${i + 1} ---`);
    console.log(ctx);
});

// Decode additional indices found in the context
console.log('\n' + '='.repeat(70));
console.log('DECODING ADDITIONAL INDICES FROM CONTEXT');
console.log('='.repeat(70));

// Extract all hex indices from the contexts
const allIndices = new Set();
const hexPattern = /0x[a-f0-9]+/gi;

sliderMatches.forEach(ctx => {
    const matches = ctx.match(hexPattern) || [];
    matches.forEach(m => allIndices.add(parseInt(m, 16)));
});

selectMatches.forEach(ctx => {
    const matches = ctx.match(hexPattern) || [];
    matches.forEach(m => allIndices.add(parseInt(m, 16)));
});

// Decode and display
const sortedIndices = [...allIndices].sort((a, b) => a - b);
console.log(`\nFound ${sortedIndices.length} unique indices in context:`);

for (const idx of sortedIndices) {
    if (idx < 0x2000) {
        try {
            const value = decoder.decodeIndex(idx);
            if (value && value.length < 50) {
                console.log(`  [0x${idx.toString(16).padStart(4, '0')}] ${value}`);
            }
        } catch (e) {}
    }
}

// Look for fetch/request patterns
console.log('\n' + '='.repeat(70));
console.log('ANALYZING FETCH PATTERNS');
console.log('='.repeat(70));

// Find fetch calls near the video endpoints
const fetchNearVideo = /.{0,200}fetch.{0,200}(?:0x73f|0x122a).{0,200}/g;
const fetchMatches = scriptContent.match(fetchNearVideo) || [];
console.log(`\nFound ${fetchMatches.length} fetch calls near video endpoints`);
fetchMatches.forEach((m, i) => {
    console.log(`\n--- Fetch ${i + 1} ---`);
    console.log(m);
});

// Look for response handling
console.log('\n' + '='.repeat(70));
console.log('ANALYZING RESPONSE HANDLING');
console.log('='.repeat(70));

// Look for .then() or await patterns after fetch
const responsePattern = /fetch\s*\([^)]+\)[^;]*\.then\s*\([^)]+\)/g;
const responseMatches = scriptContent.match(responsePattern) || [];
console.log(`\nFound ${responseMatches.length} fetch response handlers`);
responseMatches.slice(0, 5).forEach((m, i) => {
    console.log(`\n--- Response ${i + 1} ---`);
    console.log(m.substring(0, 300));
});

// Look for JSON parsing of responses
console.log('\n' + '='.repeat(70));
console.log('ANALYZING JSON RESPONSE PARSING');
console.log('='.repeat(70));

// Look for .json() calls
const jsonPattern = /\.json\s*\(\s*\)/g;
const jsonMatches = scriptContent.match(jsonPattern) || [];
console.log(`\nFound ${jsonMatches.length} .json() calls`);

// Look for what happens after JSON parsing
const jsonContextPattern = /\.json\s*\(\s*\)[^;]{0,300}/g;
const jsonContextMatches = scriptContent.match(jsonContextPattern) || [];
jsonContextMatches.slice(0, 5).forEach((m, i) => {
    console.log(`\n--- JSON Context ${i + 1} ---`);
    console.log(m);
});

// Look for the stream URL extraction from response
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR STREAM URL EXTRACTION');
console.log('='.repeat(70));

// Look for patterns that might extract stream URL from response
const streamExtractPatterns = [
    /\[['"]?(?:stream|url|src|source|file|link|video)['"]?\]/gi,
    /\.(?:stream|url|src|source|file|link|video)\b/gi,
];

streamExtractPatterns.forEach(pattern => {
    const matches = scriptContent.match(pattern) || [];
    if (matches.length > 0) {
        console.log(`\nPattern ${pattern}: ${matches.length} matches`);
        [...new Set(matches)].slice(0, 10).forEach(m => console.log(`  ${m}`));
    }
});

// Look for Clappr player initialization
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR PLAYER INITIALIZATION');
console.log('='.repeat(70));

// Decode indices related to player
const playerIndices = [
    0x6c8,  // source
    0x14b,  // src
    0x378,  // preload
    0x46c,  // loaded
    0x4ba,  // playsinlin
    0xe45,  // video
];

console.log('\nPlayer-related decoded strings:');
for (const idx of playerIndices) {
    try {
        const value = decoder.decodeIndex(idx);
        console.log(`  [0x${idx.toString(16)}] ${value}`);
    } catch (e) {}
}

// Look for Clappr or video player setup
const playerSetupPattern = /(?:Clappr|player|video)[^;]{0,200}(?:source|src|file)[^;]{0,100}/gi;
const playerSetupMatches = scriptContent.match(playerSetupPattern) || [];
console.log(`\nFound ${playerSetupMatches.length} player setup patterns`);
playerSetupMatches.slice(0, 5).forEach((m, i) => {
    console.log(`\n--- Player Setup ${i + 1} ---`);
    console.log(m.substring(0, 300));
});

console.log('\n' + '='.repeat(70));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(70));
