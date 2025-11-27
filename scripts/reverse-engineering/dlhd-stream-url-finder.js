/**
 * DLHD.dad Stream URL Finder
 * 
 * Analyzes the script to find how stream URLs are constructed
 */

const fs = require('fs');
const path = require('path');
const DLHDDecoder = require('./dlhd-decoder-module');

console.log('DLHD Stream URL Finder\n');

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

console.log('='.repeat(60));
console.log('SEARCHING FOR STREAM URL PATTERNS');
console.log('='.repeat(60));

// Look for patterns that construct URLs with the CDN domain
const patterns = [
    // Protocol + domain patterns
    /https?:\/\/['"]\s*\+\s*[^+]+\s*\+\s*['"]/g,
    // String concatenation with domain
    /['"][^'"]*\.\s*\+\s*[^+]+Domain/g,
    // CDN domain usage
    /cdnDomain[^;]+/g,
    // velocecdn patterns
    /velocecdn[^'";\s]+/gi,
    // Stream path patterns
    /\/stream\/[^'"]+/g,
    /\/live\/[^'"]+/g,
    /\/hls\/[^'"]+/g,
    /\/cast[^'"]+/g,
];

patterns.forEach(pattern => {
    const matches = scriptContent.match(pattern) || [];
    if (matches.length > 0) {
        console.log(`\nPattern ${pattern}:`);
        [...new Set(matches)].slice(0, 10).forEach(m => {
            console.log(`  ${m.substring(0, 150)}`);
        });
    }
});

// Look for the pjs_drv_cast script (player driver)
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR PLAYER DRIVER');
console.log('='.repeat(60));

const pjsPatterns = [
    /pjs_drv[^'";\s]+/gi,
    /Clappr[^'";\s]+/gi,
    /jwplayer[^'";\s]+/gi,
    /player\s*\.\s*setup/gi,
    /player\s*\.\s*load/gi,
    /\.source\s*=/gi,
    /\.file\s*=/gi,
];

pjsPatterns.forEach(pattern => {
    const matches = scriptContent.match(pattern) || [];
    if (matches.length > 0) {
        console.log(`\nPattern ${pattern}: ${matches.length} matches`);
        [...new Set(matches)].slice(0, 5).forEach(m => console.log(`  ${m}`));
    }
});

// Search for decoded strings that might be URL templates
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR URL TEMPLATES IN DECODED STRINGS');
console.log('='.repeat(60));

const urlTemplateKeywords = [
    'stream', 'live', 'cast', 'hls', 'm3u8', 'playlist',
    'channel', 'video', 'media', 'cdn', 'edge', 'server'
];

const foundTemplates = [];

for (let i = 0; i < 0x2000; i++) {
    try {
        const decoded = decoder.decodeIndex(i);
        if (!decoded || typeof decoded !== 'string') continue;
        
        const lower = decoded.toLowerCase();
        
        // Check if it looks like a URL path
        if (decoded.includes('/') && decoded.length > 5) {
            const hasKeyword = urlTemplateKeywords.some(kw => lower.includes(kw));
            if (hasKeyword) {
                foundTemplates.push({ index: i, value: decoded });
            }
        }
        
        // Check for domain patterns
        if (decoded.includes('.') && (decoded.includes('cdn') || decoded.includes('stream'))) {
            foundTemplates.push({ index: i, value: decoded });
        }
    } catch (e) {
        continue;
    }
}

console.log(`\nFound ${foundTemplates.length} potential URL templates:`);
foundTemplates.forEach(t => {
    console.log(`  [0x${t.index.toString(16)}] ${t.value}`);
});

// Look for the actual stream initialization
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR STREAM INITIALIZATION');
console.log('='.repeat(60));

// Find where streams are loaded
const streamInitPatterns = [
    /loadSource\s*\([^)]+\)/g,
    /source\s*:\s*['"][^'"]+['"]/g,
    /file\s*:\s*['"][^'"]+['"]/g,
    /src\s*:\s*['"][^'"]+['"]/g,
    /playlist\s*:\s*\[/g,
    /sources\s*:\s*\[/g,
];

streamInitPatterns.forEach(pattern => {
    const matches = scriptContent.match(pattern) || [];
    if (matches.length > 0) {
        console.log(`\nPattern ${pattern}:`);
        matches.slice(0, 5).forEach(m => console.log(`  ${m.substring(0, 200)}`));
    }
});

// Look for fetch/XHR calls that might load stream data
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR NETWORK REQUESTS');
console.log('='.repeat(60));

const networkPatterns = [
    /fetch\s*\([^)]+\)/g,
    /XMLHttpRequest/g,
    /\.open\s*\([^)]+\)/g,
    /\.send\s*\(/g,
    /ajax\s*\(/g,
];

networkPatterns.forEach(pattern => {
    const matches = scriptContent.match(pattern) || [];
    console.log(`${pattern}: ${matches.length} occurrences`);
});

// Extract the player configuration from the page
console.log('\n' + '='.repeat(60));
console.log('PLAYER CONFIGURATION');
console.log('='.repeat(60));

const playerConfig = decoder.extractConfig(html);
console.log('\nDecoded Player Config:');
console.log(JSON.stringify(playerConfig, null, 2));

// Look for stream ID in the URL
const streamIdMatch = html.match(/stream-(\d+)\.php/);
if (streamIdMatch) {
    console.log(`\nStream ID: ${streamIdMatch[1]}`);
}

// Check for any embedded stream URLs in the HTML
console.log('\n' + '='.repeat(60));
console.log('EMBEDDED URLS IN HTML');
console.log('='.repeat(60));

const embeddedUrls = html.match(/https?:\/\/[^\s'"<>]+/g) || [];
const streamUrls = embeddedUrls.filter(url => 
    url.includes('stream') || 
    url.includes('m3u8') || 
    url.includes('hls') ||
    url.includes('live') ||
    url.includes('cdn')
);

console.log(`\nFound ${streamUrls.length} potential stream URLs:`);
[...new Set(streamUrls)].forEach(url => console.log(`  ${url}`));

console.log('\n' + '='.repeat(60));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(60));
