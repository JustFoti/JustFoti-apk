/**
 * DLHD.dad Stream URL Extractor
 * 
 * This script runs the obfuscated code in a sandbox to extract
 * the actual stream URLs and understand the CDN loading mechanism.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('DLHD Stream URL Extractor\n');

// Read the fresh HTML
const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract the main script content - find the script containing _0x8b05
let scriptContent = null;
const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
for (const tag of scriptTags) {
    const content = tag.replace(/<\/?script[^>]*>/gi, '');
    if (content.includes('function _0x8b05')) {
        scriptContent = content;
        break;
    }
}

if (!scriptContent) {
    console.error('Could not find main obfuscated script');
    process.exit(1);
}

console.log(`Extracted script: ${scriptContent.length} chars\n`);

// Extract window variables first
const windowVars = {};

// Ad config
const adConfigMatch = html.match(/window\['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'\]\s*=\s*(\{[^}]+\});/);
if (adConfigMatch) {
    try {
        windowVars['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'] = JSON.parse(adConfigMatch[1].replace(/(\w+):/g, '"$1":'));
    } catch (e) {}
}

// Encoded data
const encodedMatch = html.match(/window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/);
if (encodedMatch) {
    windowVars['ZpQw9XkLmN8c3vR3'] = encodedMatch[1];
}

console.log('Window variables extracted:');
console.log('  x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF:', windowVars['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'] ? 'present' : 'missing');
console.log('  ZpQw9XkLmN8c3vR3:', windowVars['ZpQw9XkLmN8c3vR3'] ? `${windowVars['ZpQw9XkLmN8c3vR3'].length} chars` : 'missing');

// Create sandbox with comprehensive mocks
const capturedUrls = [];
const capturedSources = [];
const capturedConfigs = [];

const sandbox = {
    window: {},
    document: {
        createElement: (tag) => {
            const elem = {
                tagName: tag.toUpperCase(),
                style: {},
                attributes: {},
                children: [],
                innerHTML: '',
                src: '',
                setAttribute: function(name, value) {
                    this.attributes[name] = value;
                    if (name === 'src') {
                        this.src = value;
                        if (value.includes('m3u8') || value.includes('stream')) {
                            capturedUrls.push({ type: 'element-src', tag, value });
                        }
                    }
                },
                getAttribute: function(name) { return this.attributes[name]; },
                appendChild: function(child) { this.children.push(child); return child; },
                addEventListener: () => {},
                removeEventListener: () => {},
                remove: () => {},
                play: () => Promise.resolve(),
                pause: () => {},
            };
            return elem;
        },
        getElementById: () => null,
        getElementsByTagName: () => [],
        getElementsByClassName: () => [],
        querySelector: () => null,
        querySelectorAll: () => [],
        body: { 
            appendChild: () => {}, 
            removeChild: () => {},
            style: {}
        },
        head: { appendChild: () => {} },
        documentElement: { style: {} },
        title: '',
        referrer: 'https://dlhd.dad/',
        location: { href: 'https://dlhd.dad/casting/stream-769.php' },
        cookie: '',
        readyState: 'complete',
        dispatchEvent: () => {},
        write: () => {},
        writeln: () => {},
    },
    navigator: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        platform: 'Win32',
        language: 'en-US',
        languages: ['en-US', 'en'],
        sendBeacon: () => true,
        plugins: [],
        mimeTypes: [],
        hardwareConcurrency: 8,
        deviceMemory: 8,
        connection: { effectiveType: '4g' },
    },
    location: {
        href: 'https://dlhd.dad/casting/stream-769.php',
        hostname: 'dlhd.dad',
        pathname: '/casting/stream-769.php',
        protocol: 'https:',
        search: '',
        hash: '',
        origin: 'https://dlhd.dad',
    },
    screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24,
    },
    console: {
        log: (...args) => {
            const msg = args.join(' ');
            if (msg.includes('m3u8') || msg.includes('stream') || msg.includes('source')) {
                console.log('[SCRIPT LOG]', msg);
            }
        },
        warn: () => {},
        error: () => {},
        info: () => {},
        debug: () => {},
    },
    setTimeout: (fn, delay) => {
        // Execute immediately for analysis
        try { fn(); } catch (e) {}
        return 1;
    },
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    requestAnimationFrame: (fn) => { try { fn(0); } catch (e) {} return 1; },
    cancelAnimationFrame: () => {},
    
    // Standard JS globals
    String, Array, Object, Date, Math, Number, Boolean, RegExp, Error,
    parseInt, parseFloat, isNaN, isFinite, JSON,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
    btoa: (s) => Buffer.from(s).toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
    
    // URL handling
    URL: function(url, base) {
        try {
            const parsed = new (require('url').URL)(url, base);
            return parsed;
        } catch (e) {
            return { href: url, toString: () => url };
        }
    },
    URLSearchParams: require('url').URLSearchParams,
    
    // Storage
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
    },
    sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
    },
    
    // Network - capture all fetch/XHR calls
    fetch: (url, options) => {
        console.log('[FETCH]', url);
        if (typeof url === 'string' && (url.includes('m3u8') || url.includes('stream') || url.includes('cdn'))) {
            capturedUrls.push({ type: 'fetch', url, options });
        }
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
            blob: () => Promise.resolve(new Blob()),
        });
    },
    XMLHttpRequest: function() {
        this.open = (method, url) => {
            this._url = url;
            console.log('[XHR]', method, url);
            if (url.includes('m3u8') || url.includes('stream') || url.includes('cdn')) {
                capturedUrls.push({ type: 'xhr', method, url });
            }
        };
        this.send = () => {
            if (this.onload) setTimeout(() => this.onload(), 0);
        };
        this.setRequestHeader = () => {};
        this.addEventListener = () => {};
        this.responseText = '';
        this.status = 200;
    },
    
    // Player mocks
    jwplayer: function(id) {
        console.log('[JWPLAYER] Init:', id);
        return {
            setup: (config) => {
                console.log('[JWPLAYER] Setup config:', JSON.stringify(config, null, 2));
                capturedConfigs.push({ player: 'jwplayer', config });
                if (config.file) capturedSources.push({ player: 'jwplayer', source: config.file });
                if (config.sources) capturedSources.push({ player: 'jwplayer', sources: config.sources });
                return this;
            },
            on: () => this,
            play: () => this,
            pause: () => this,
            getState: () => 'idle',
            remove: () => {},
        };
    },
    Clappr: {
        Player: function(config) {
            console.log('[CLAPPR] Config:', JSON.stringify(config, null, 2));
            capturedConfigs.push({ player: 'clappr', config });
            if (config.source) capturedSources.push({ player: 'clappr', source: config.source });
            if (config.sources) capturedSources.push({ player: 'clappr', sources: config.sources });
        }
    },
    Hls: function() {
        return {
            loadSource: (url) => {
                console.log('[HLS] Load source:', url);
                capturedSources.push({ player: 'hls.js', source: url });
            },
            attachMedia: () => {},
            on: () => {},
        };
    },
    
    // Events
    Event: function(type) { this.type = type; },
    CustomEvent: function(type, options) { this.type = type; this.detail = options?.detail; },
    MutationObserver: function() { return { observe: () => {}, disconnect: () => {} }; },
    IntersectionObserver: function() { return { observe: () => {}, disconnect: () => {} }; },
    ResizeObserver: function() { return { observe: () => {}, disconnect: () => {} }; },
    
    // Misc
    performance: { now: () => Date.now() },
    devicePixelRatio: 1,
    innerWidth: 1920,
    innerHeight: 1080,
    outerWidth: 1920,
    outerHeight: 1080,
    
    // Captured data storage
    __capturedUrls: capturedUrls,
    __capturedSources: capturedSources,
    __capturedConfigs: capturedConfigs,
};

// Set up window references
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.top = sandbox;
sandbox.parent = sandbox;
sandbox.frames = sandbox;

// Add window variables
Object.assign(sandbox.window, windowVars);
Object.assign(sandbox, windowVars);

// Create context
vm.createContext(sandbox);

console.log('\nExecuting obfuscated script...\n');

try {
    // First, just run the decoder setup
    vm.runInContext(scriptContent, sandbox, {
        timeout: 60000,
        displayErrors: true,
    });
    
    console.log('\nScript executed successfully!\n');
} catch (e) {
    console.log('\nScript execution error:', e.message);
    if (e.stack) {
        const lines = e.stack.split('\n').slice(0, 5);
        console.log(lines.join('\n'));
    }
}

// Report findings
console.log('\n' + '='.repeat(60));
console.log('CAPTURED DATA');
console.log('='.repeat(60));

console.log('\nCaptured URLs:', capturedUrls.length);
capturedUrls.forEach((u, i) => {
    console.log(`  [${i + 1}] ${u.type}: ${u.url || u.value}`);
});

console.log('\nCaptured Sources:', capturedSources.length);
capturedSources.forEach((s, i) => {
    console.log(`  [${i + 1}] ${s.player}:`, s.source || JSON.stringify(s.sources));
});

console.log('\nCaptured Configs:', capturedConfigs.length);
capturedConfigs.forEach((c, i) => {
    console.log(`  [${i + 1}] ${c.player}:`, JSON.stringify(c.config, null, 2).substring(0, 500));
});

// Check for decoded functions
console.log('\n' + '='.repeat(60));
console.log('SANDBOX STATE');
console.log('='.repeat(60));

const interestingKeys = Object.keys(sandbox).filter(k => {
    if (k.startsWith('_0x')) return true;
    if (typeof sandbox[k] === 'function' && k.length > 20) return true;
    return false;
});

console.log('\nObfuscated functions found:', interestingKeys.length);
interestingKeys.slice(0, 10).forEach(k => {
    console.log(`  ${k}: ${typeof sandbox[k]}`);
});

// Try to find and call the decoder
if (typeof sandbox._0xb4a0 === 'function') {
    console.log('\n' + '='.repeat(60));
    console.log('DECODER FUNCTION AVAILABLE');
    console.log('='.repeat(60));
    
    console.log('\nDecoding sample indices...');
    const sampleIndices = [0x0, 0x1, 0x10, 0x100, 0x200, 0x500, 0x1000];
    
    sampleIndices.forEach(idx => {
        try {
            const decoded = sandbox._0xb4a0(idx);
            if (decoded) {
                console.log(`  [0x${idx.toString(16)}] = "${decoded.substring(0, 50)}${decoded.length > 50 ? '...' : ''}"`);
            }
        } catch (e) {}
    });
    
    // Search for stream-related strings
    console.log('\nSearching for stream-related decoded strings...');
    const streamKeywords = ['m3u8', 'stream', 'cdn', 'veloce', 'hls', 'video', 'source', 'file', 'http'];
    const foundStrings = [];
    
    for (let i = 0; i < 0x2000; i++) {
        try {
            const decoded = sandbox._0xb4a0(i);
            if (decoded && typeof decoded === 'string') {
                const lower = decoded.toLowerCase();
                for (const kw of streamKeywords) {
                    if (lower.includes(kw)) {
                        foundStrings.push({ index: i, value: decoded, keyword: kw });
                        break;
                    }
                }
            }
        } catch (e) {}
    }
    
    console.log(`\nFound ${foundStrings.length} stream-related strings:`);
    foundStrings.slice(0, 30).forEach(s => {
        console.log(`  [0x${s.index.toString(16)}] (${s.keyword}): "${s.value.substring(0, 60)}${s.value.length > 60 ? '...' : ''}"`);
    });
    
    // Save all found strings
    const outputPath = path.join(__dirname, 'dlhd-stream-strings.json');
    fs.writeFileSync(outputPath, JSON.stringify(foundStrings, null, 2));
    console.log(`\nSaved to: ${outputPath}`);
}

console.log('\n' + '='.repeat(60));
console.log('EXTRACTION COMPLETE');
console.log('='.repeat(60));
