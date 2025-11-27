/**
 * DLHD.dad Stream Response Analysis
 * 
 * Analyzes how the stream URL is extracted from the API response
 */

const fs = require('fs');
const path = require('path');
const DLHDDecoder = require('./dlhd-decoder-module');

console.log('DLHD Stream Response Analysis\n');
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

// Decode more indices
console.log('DECODING KEY INDICES');
console.log('='.repeat(70));

const keyIndices = [
    0x216,  // zoneId
    0xd6,   // ?r=
    0x249,  // &atv=
    0x4e1,  // &sub1=
    0xab0,  // &abtg=1
    0x1ea,  // abcdefgh01
    0x162f, // 23456789
    0x7fa,  // sub1
    0x1491, // isAdbMode
    0x13fb, // adblockSet
    0xe35,  // tings
    0xcdd,  // delay
    0x2cf,  // ?
];

for (const idx of keyIndices) {
    try {
        const value = decoder.decodeIndex(idx);
        console.log(`  [0x${idx.toString(16).padStart(4, '0')}] ${value}`);
    } catch (e) {
        console.log(`  [0x${idx.toString(16).padStart(4, '0')}] ERROR`);
    }
}

// Look for the #Zt function (which seems to be called before #Kt)
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR #Zt FUNCTION (Stream Fetcher)');
console.log('='.repeat(70));

const ztPattern = /#Zt\s*\(\s*\)\s*\{[^}]+\}/g;
let match = scriptContent.match(ztPattern);
if (match) {
    console.log('Found #Zt function:');
    console.log(match[0].substring(0, 1000));
}

// Look for broader context
const ztContext = /.{0,100}#Zt.{0,500}/g;
const ztMatches = scriptContent.match(ztContext) || [];
console.log(`\nFound ${ztMatches.length} #Zt references`);
ztMatches.slice(0, 3).forEach((ctx, i) => {
    console.log(`\n--- Context ${i + 1} ---`);
    console.log(ctx);
});

// Look for the #Kt function (which processes the stream data)
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR #Kt FUNCTION (Stream Processor)');
console.log('='.repeat(70));

const ktContext = /.{0,100}#Kt.{0,500}/g;
const ktMatches = scriptContent.match(ktContext) || [];
console.log(`\nFound ${ktMatches.length} #Kt references`);
ktMatches.slice(0, 3).forEach((ctx, i) => {
    console.log(`\n--- Context ${i + 1} ---`);
    console.log(ctx);
});

// Look for async functions that might fetch stream data
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR ASYNC STREAM FUNCTIONS');
console.log('='.repeat(70));

const asyncPattern = /async\s+#[A-Za-z]+\s*\(\s*\)\s*\{[^}]{0,1000}\}/g;
const asyncMatches = scriptContent.match(asyncPattern) || [];
console.log(`\nFound ${asyncMatches.length} async private methods`);
asyncMatches.slice(0, 5).forEach((m, i) => {
    console.log(`\n--- Async Method ${i + 1} ---`);
    console.log(m.substring(0, 500));
});

// Look for the response processing
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR RESPONSE PROCESSING');
console.log('='.repeat(70));

// Look for patterns like response.url, response.stream, etc.
const responseProps = [];
for (let i = 0; i < 0x2000; i++) {
    try {
        const val = decoder.decodeIndex(i);
        if (val && ['url', 'stream', 'link', 'file', 'source', 'src', 'video', 'hls', 'm3u8', 'manifest', 'playlist'].includes(val.toLowerCase())) {
            responseProps.push({ index: i, value: val });
        }
    } catch (e) {}
}

console.log('\nResponse property candidates:');
responseProps.forEach(p => {
    console.log(`  [0x${p.index.toString(16)}] ${p.value}`);
});

// Look for how these properties are accessed
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR PROPERTY ACCESS PATTERNS');
console.log('='.repeat(70));

for (const prop of responseProps) {
    const hexStr = '0x' + prop.index.toString(16);
    const accessPattern = new RegExp(`\\[_0x[a-f0-9]+\\(${hexStr}\\)\\]`, 'g');
    const matches = scriptContent.match(accessPattern) || [];
    if (matches.length > 0) {
        console.log(`\n${prop.value} (${hexStr}): ${matches.length} accesses`);
        
        // Get context
        const contextPattern = new RegExp(`.{0,100}\\[_0x[a-f0-9]+\\(${hexStr}\\)\\].{0,100}`, 'g');
        const contexts = scriptContent.match(contextPattern) || [];
        contexts.slice(0, 2).forEach((ctx, i) => {
            console.log(`  Context ${i + 1}: ${ctx.substring(0, 200)}`);
        });
    }
}

// Look for the Clappr player setup
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR CLAPPR PLAYER');
console.log('='.repeat(70));

// Search for Clappr in decoded strings
const clapprIndices = [];
for (let i = 0; i < 0x2000; i++) {
    try {
        const val = decoder.decodeIndex(i);
        if (val && val.toLowerCase().includes('clappr')) {
            clapprIndices.push({ index: i, value: val });
        }
    } catch (e) {}
}

console.log('\nClappr-related strings:');
clapprIndices.forEach(p => {
    console.log(`  [0x${p.index.toString(16)}] ${p.value}`);
});

// Look for HLS.js
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR HLS.JS');
console.log('='.repeat(70));

const hlsIndices = [];
for (let i = 0; i < 0x2000; i++) {
    try {
        const val = decoder.decodeIndex(i);
        if (val && (val.toLowerCase() === 'hls' || val.includes('Hls') || val.includes('HLS'))) {
            hlsIndices.push({ index: i, value: val });
        }
    } catch (e) {}
}

console.log('\nHLS-related strings:');
hlsIndices.forEach(p => {
    console.log(`  [0x${p.index.toString(16)}] ${p.value}`);
});

// Look for loadSource pattern
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR loadSource');
console.log('='.repeat(70));

const loadSourceIndices = [];
for (let i = 0; i < 0x2000; i++) {
    try {
        const val = decoder.decodeIndex(i);
        if (val && val.includes('loadSource')) {
            loadSourceIndices.push({ index: i, value: val });
        }
    } catch (e) {}
}

console.log('\nloadSource strings:');
loadSourceIndices.forEach(p => {
    console.log(`  [0x${p.index.toString(16)}] ${p.value}`);
});

// Look for the actual stream URL variable
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR STREAM URL VARIABLE');
console.log('='.repeat(70));

// Look for patterns like #streamUrl, #url, #src
const streamVarPattern = /#(?:stream|url|src|source|video|hls|m3u8)[A-Za-z]*/gi;
const streamVarMatches = scriptContent.match(streamVarPattern) || [];
console.log('\nStream-related private variables:');
[...new Set(streamVarMatches)].forEach(v => console.log(`  ${v}`));

console.log('\n' + '='.repeat(70));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(70));
