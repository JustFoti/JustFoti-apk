/**
 * Superembed Reverse Engineering Script
 * 
 * Usage: node scripts/reverse-engineering/superembed-reverse.js [tmdb_id] [type] [season] [episode]
 * Example: node scripts/reverse-engineering/superembed-reverse.js 550 movie
 * Example: node scripts/reverse-engineering/superembed-reverse.js 1396 tv 1 1
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Configuration
const CONFIG = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
    }
};

// Helper to fetch pages with full control
function fetchPage(url, referer, origin, followRedirects = true) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                ...CONFIG.headers,
                'Host': urlObj.hostname,
                'Referer': referer,
                'Origin': origin
            }
        };

        console.log(`Fetching: ${url}`);

        const req = https.request(options, res => {
            console.log(`Status: ${res.statusCode}`);

            // Handle redirects
            if (followRedirects && [301, 302, 303, 307, 308].includes(res.statusCode)) {
                const redirectUrl = res.headers.location;
                if (redirectUrl) {
                    console.log(`Redirecting to: ${redirectUrl}`);
                    const nextUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).toString();
                    return fetchPage(nextUrl, referer, origin, followRedirects).then(resolve).catch(reject);
                }
            }

            let stream = res;
            const encoding = res.headers['content-encoding'];

            if (encoding === 'br') {
                stream = res.pipe(zlib.createBrotliDecompress());
            } else if (encoding === 'gzip') {
                stream = res.pipe(zlib.createGunzip());
            } else if (encoding === 'deflate') {
                stream = res.pipe(zlib.createInflate());
            }

            let data = '';
            stream.on('data', chunk => data += chunk);
            stream.on('end', () => resolve({
                body: data,
                headers: res.headers,
                statusCode: res.statusCode,
                url: url
            }));
            stream.on('error', reject);
        });

        req.on('error', reject);
        req.end();
    });
}

// Extraction Logic
const Extractors = {
    superembedHash: (html) => {
        const match = html.match(/data-hash="([^"]+)"[^>]*>[\s\S]{0,200}?Superembed/i);
        return match ? match[1] : null;
    },

    srcRcpUrl: (html) => {
        const match = html.match(/['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/);
        return match ? `https://cloudnestra.com/srcrcp/${match[1]}` : null;
    },

    streamSources: (html) => {
        const sources = {
            m3u8: [],
            mp4: [],
            base64: [],
            packed: [],
            windowVars: []
        };

        // Direct URL matches
        const m3u8Matches = [...html.matchAll(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g)];
        sources.m3u8 = m3u8Matches.map(m => m[0]);

        const mp4Matches = [...html.matchAll(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/g)];
        sources.mp4 = mp4Matches.map(m => m[0]);

        // Base64 strings (long strings that look like base64)
        const base64Matches = [...html.matchAll(/["']([A-Za-z0-9+\/]{100,}={0,2})["']/g)];
        sources.base64 = base64Matches.map(m => m[1]);

        // Packed code (eval(function(p,a,c,k,e,d)...))
        const packedMatches = [...html.matchAll(/eval\(function\(p,a,c,k,e,d\).+?\.split\('\|'\)\)\)/g)];
        sources.packed = packedMatches.map(m => m[0]);

        // Suspicious window variables
        const windowVarMatches = [...html.matchAll(/window\['([A-Za-z0-9]+)'\]\s*=\s*(.+?);/g)];
        sources.windowVars = windowVarMatches.map(m => ({ key: m[1], value: m[2] }));

        return sources;
    }
};

// Main Execution Flow
async function main() {
    const args = process.argv.slice(2);
    const tmdbId = args[0] || '550'; // Default: Fight Club
    const type = args[1] || 'movie';
    const season = args[2];
    const episode = args[3];

    console.log(`Starting analysis for ${type} ID: ${tmdbId} ${season ? `S${season}E${episode}` : ''}`);

    // Step 1: Construct Embed URL
    let embedUrl = `https://vidsrc-embed.ru/embed/${type}/${tmdbId}`;
    if (type === 'tv' && season && episode) {
        embedUrl += `/${season}/${episode}`;
    }

    console.log('\n--- Step 1: Fetch Embed Page ---');
    const embedRes = await fetchPage(embedUrl, 'https://vidsrc-embed.ru/', 'https://vidsrc-embed.ru');

    const hash = Extractors.superembedHash(embedRes.body);
    console.log(`Superembed Hash: ${hash || 'NOT FOUND'}`);

    if (!hash) {
        console.error('Failed to extract hash. Exiting.');
        return;
    }

    // Step 2: Fetch RCP Page
    const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
    console.log('\n--- Step 2: Fetch RCP Page ---');
    const rcpRes = await fetchPage(rcpUrl, embedUrl, 'https://vidsrc-embed.ru');

    // Save RCP page
    fs.writeFileSync(path.join(__dirname, `debug-rcp-${tmdbId}.html`), rcpRes.body);
    console.log(`Saved RCP HTML to: debug-rcp-${tmdbId}.html`);

    const srcRcpUrl = Extractors.srcRcpUrl(rcpRes.body);
    console.log(`SrcRCP URL: ${srcRcpUrl || 'NOT FOUND'}`);

    // Check for PRORCP
    const proRcpMatch = rcpRes.body.match(/['"]\/prorcp\/([A-Za-z0-9+\/=\-_]+)['"]/);
    if (proRcpMatch) {
        console.log(`ProRCP URL: https://cloudnestra.com/prorcp/${proRcpMatch[1]}`);
    } else {
        console.log('ProRCP URL: NOT FOUND');
    }

    if (!srcRcpUrl && !proRcpMatch) {
        console.error('Failed to extract SrcRCP or ProRCP URL. Exiting.');
        return;
    }

    if (!srcRcpUrl) return; // Stop if only ProRCP found for now (or handle it)

    // Step 3: Fetch SrcRCP Page
    console.log('\n--- Step 3: Fetch SrcRCP Page ---');
    const srcRcpRes = await fetchPage(srcRcpUrl, embedUrl, 'https://vidsrc-embed.ru');

    // Save for debugging
    const debugFile = path.join(__dirname, `debug-srcrcp-${tmdbId}.html`);
    fs.writeFileSync(debugFile, srcRcpRes.body);
    console.log(`Saved SrcRCP HTML to: ${debugFile}`);

    // Step 4: Analyze Sources
    console.log('\n--- Step 4: Analyze Sources ---');
    const analysis = Extractors.streamSources(srcRcpRes.body);

    console.log(`Found ${analysis.m3u8.length} M3U8 URLs`);
    analysis.m3u8.forEach(url => console.log(` - ${url}`));

    console.log(`Found ${analysis.mp4.length} MP4 URLs`);
    analysis.mp4.forEach(url => console.log(` - ${url}`));

    console.log(`Found ${analysis.packed.length} Packed Scripts`);

    console.log(`Found ${analysis.windowVars.length} Window Variables`);
    analysis.windowVars.forEach(v => {
        if (v.value.length > 50) console.log(` - window['${v.key}'] = ${v.value.substring(0, 50)}...`);
        else console.log(` - window['${v.key}'] = ${v.value}`);
    });

    console.log(`Found ${analysis.base64.length} Base64 Strings`);

    // Try to decode Base64 strings that look promising
    console.log('\n--- Decoding Promising Base64 Strings ---');
    analysis.base64.forEach((b64, i) => {
        try {
            const decoded = Buffer.from(b64, 'base64').toString('utf-8');
            if (decoded.includes('http') || decoded.includes('.m3u8') || decoded.includes('player')) {
                console.log(`\n[Base64 #${i}] Decoded Content:`);
                console.log(decoded.substring(0, 200) + (decoded.length > 200 ? '...' : ''));
            }
        } catch (e) {
            // Ignore invalid base64
        }
    });

}

main().catch(console.error);
