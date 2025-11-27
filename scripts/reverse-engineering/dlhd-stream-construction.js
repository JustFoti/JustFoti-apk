/**
 * DLHD.dad Stream URL Construction Analysis
 * 
 * Analyzes how the actual stream URLs are built from the CDN domain
 */

const fs = require('fs');
const path = require('path');
const DLHDDecoder = require('./dlhd-decoder-module');

console.log('DLHD Stream URL Construction Analysis\n');
console.log('='.repeat(70));

const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Initialize decoder
const decoder = new DLHDDecoder();
decoder.initialize(html);

// Get the decoded strings array
const decodedStrings = [];
for (let i = 0; i < 0x2000; i++) {
    try {
        const decoded = decoder.decodeIndex(i);
        if (decoded && typeof decoded === 'string') {
            decodedStrings.push({ index: i, hex: '0x' + i.toString(16), value: decoded });
        }
    } catch (e) {
        continue;
    }
}

console.log(`Total decoded strings: ${decodedStrings.length}\n`);

// Search for stream-related patterns
console.log('='.repeat(70));
console.log('STREAM URL RELATED STRINGS');
console.log('='.repeat(70));

const streamKeywords = [
    'veloce', 'cdn', 'stream', 'live', 'hls', 'm3u8', 'playlist',
    'channel', 'video', 'media', 'edge', 'server', 'cast', 'embed',
    'player', 'source', 'file', 'url', 'http', 'https', 'wss', 'ws',
    '.ts', '.m3u', 'manifest', 'chunk', 'segment', 'quality', 'bitrate',
    'resolution', '720', '1080', '480', '360', 'index', 'master'
];

const streamStrings = decodedStrings.filter(s => {
    const lower = s.value.toLowerCase();
    return streamKeywords.some(kw => lower.includes(kw));
});

console.log(`\nFound ${streamStrings.length} stream-related strings:\n`);
streamStrings.forEach(s => {
    console.log(`  [${s.hex}] ${s.value}`);
});

// Look for URL path patterns
console.log('\n' + '='.repeat(70));
console.log('URL PATH PATTERNS');
console.log('='.repeat(70));

const pathStrings = decodedStrings.filter(s => {
    return s.value.startsWith('/') || 
           s.value.includes('://') ||
           /^[a-z]+\.[a-z]+$/i.test(s.value);
});

console.log(`\nFound ${pathStrings.length} path-like strings:\n`);
pathStrings.slice(0, 50).forEach(s => {
    console.log(`  [${s.hex}] ${s.value}`);
});

// Look for function names related to streaming
console.log('\n' + '='.repeat(70));
console.log('FUNCTION/METHOD NAMES');
console.log('='.repeat(70));

const funcKeywords = [
    'init', 'load', 'play', 'start', 'setup', 'create', 'build',
    'get', 'fetch', 'request', 'connect', 'open', 'send', 'receive',
    'parse', 'decode', 'encrypt', 'decrypt', 'sign', 'verify', 'token',
    'auth', 'key', 'secret', 'hash', 'config', 'option', 'setting'
];

const funcStrings = decodedStrings.filter(s => {
    const lower = s.value.toLowerCase();
    return funcKeywords.some(kw => lower.includes(kw)) && s.value.length < 50;
});

console.log(`\nFound ${funcStrings.length} function-related strings:\n`);
funcStrings.slice(0, 50).forEach(s => {
    console.log(`  [${s.hex}] ${s.value}`);
});

// Extract the main script and look for URL construction patterns
console.log('\n' + '='.repeat(70));
console.log('ANALYZING SCRIPT FOR URL CONSTRUCTION');
console.log('='.repeat(70));

let scriptContent = null;
const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
for (const tag of scriptTags) {
    const content = tag.replace(/<\/?script[^>]*>/gi, '');
    if (content.includes('function _0x8b05')) {
        scriptContent = content;
        break;
    }
}

if (scriptContent) {
    // Look for string concatenation patterns that might build URLs
    const concatPatterns = [
        // https:// + domain + path
        /['"]https?:\/\/['"]\s*\+/g,
        // wss:// patterns for websocket
        /['"]wss?:\/\/['"]\s*\+/g,
        // Protocol-relative URLs
        /['"]\/\/['"]\s*\+/g,
        // Path concatenation
        /\+\s*['"]\/[^'"]+['"]/g,
        // .m3u8 or .ts extensions
        /['"][^'"]*\.m3u8['"]/g,
        /['"][^'"]*\.ts['"]/g,
    ];

    concatPatterns.forEach(pattern => {
        const matches = scriptContent.match(pattern) || [];
        if (matches.length > 0) {
            console.log(`\nPattern ${pattern}:`);
            [...new Set(matches)].slice(0, 10).forEach(m => {
                console.log(`  ${m}`);
            });
        }
    });

    // Look for fetch/XMLHttpRequest with URL construction
    console.log('\n' + '='.repeat(70));
    console.log('NETWORK REQUEST PATTERNS');
    console.log('='.repeat(70));

    // Find fetch calls
    const fetchPattern = /fetch\s*\(\s*([^)]+)\)/g;
    let match;
    const fetchCalls = [];
    while ((match = fetchPattern.exec(scriptContent)) !== null) {
        fetchCalls.push(match[1].substring(0, 200));
    }
    
    if (fetchCalls.length > 0) {
        console.log(`\nFound ${fetchCalls.length} fetch calls:`);
        fetchCalls.slice(0, 10).forEach((call, i) => {
            console.log(`  ${i + 1}. ${call}`);
        });
    }

    // Look for WebSocket connections
    const wsPattern = /new\s+WebSocket\s*\(\s*([^)]+)\)/g;
    const wsCalls = [];
    while ((match = wsPattern.exec(scriptContent)) !== null) {
        wsCalls.push(match[1].substring(0, 200));
    }
    
    if (wsCalls.length > 0) {
        console.log(`\nFound ${wsCalls.length} WebSocket connections:`);
        wsCalls.forEach((call, i) => {
            console.log(`  ${i + 1}. ${call}`);
        });
    }
}

// Look for the velocecdn domain pattern
console.log('\n' + '='.repeat(70));
console.log('VELOCECDN DOMAIN ANALYSIS');
console.log('='.repeat(70));

const veloceStrings = decodedStrings.filter(s => 
    s.value.toLowerCase().includes('veloce') || 
    s.value.toLowerCase().includes('cdn')
);

console.log(`\nVeloce/CDN related strings:`);
veloceStrings.forEach(s => {
    console.log(`  [${s.hex}] ${s.value}`);
});

// Look for the stream ID handling
console.log('\n' + '='.repeat(70));
console.log('STREAM ID PATTERNS');
console.log('='.repeat(70));

const streamIdMatch = html.match(/stream-(\d+)\.php/);
if (streamIdMatch) {
    console.log(`\nStream ID from URL: ${streamIdMatch[1]}`);
}

// Look for how stream ID is used in the script
if (scriptContent) {
    const idPatterns = [
        /streamId/gi,
        /stream_id/gi,
        /channelId/gi,
        /channel_id/gi,
        /videoId/gi,
        /video_id/gi,
    ];

    idPatterns.forEach(pattern => {
        const matches = scriptContent.match(pattern) || [];
        if (matches.length > 0) {
            console.log(`\n${pattern}: ${matches.length} occurrences`);
        }
    });
}

// Look for the player configuration object
console.log('\n' + '='.repeat(70));
console.log('PLAYER CONFIGURATION SEARCH');
console.log('='.repeat(70));

// Search for Clappr or other player initialization
const playerPatterns = [
    /Clappr\.Player/g,
    /new\s+Clappr/g,
    /jwplayer\s*\(/g,
    /videojs\s*\(/g,
    /Hls\s*\(/g,
    /new\s+Hls/g,
    /player\s*=\s*new/g,
    /createPlayer/g,
    /initPlayer/g,
    /setupPlayer/g,
];

if (scriptContent) {
    playerPatterns.forEach(pattern => {
        const matches = scriptContent.match(pattern) || [];
        if (matches.length > 0) {
            console.log(`\n${pattern}: ${matches.length} occurrences`);
        }
    });
}

// Look for HLS.js patterns
console.log('\n' + '='.repeat(70));
console.log('HLS.JS PATTERNS');
console.log('='.repeat(70));

const hlsPatterns = [
    /loadSource\s*\(/g,
    /attachMedia\s*\(/g,
    /\.on\s*\(\s*['"]hlsError['"]/g,
    /\.on\s*\(\s*['"]manifestParsed['"]/g,
    /\.on\s*\(\s*['"]levelLoaded['"]/g,
];

if (scriptContent) {
    hlsPatterns.forEach(pattern => {
        const matches = scriptContent.match(pattern) || [];
        if (matches.length > 0) {
            console.log(`\n${pattern}: ${matches.length} occurrences`);
        }
    });
}

console.log('\n' + '='.repeat(70));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(70));
