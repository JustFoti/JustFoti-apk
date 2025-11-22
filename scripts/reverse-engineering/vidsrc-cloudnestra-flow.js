/**
 * VIDSRC → CLOUDNESTRA FLOW ANALYZER
 * 
 * Comprehensive fetch-based framework to trace:
 * 1. vidsrc-embed.ru → cloudnestra RCP
 * 2. cloudnestra RCP → cloudnestra PRORCP/SRCRCP
 * 3. Analyze how sources are listed
 * 
 * Usage: node scripts/reverse-engineering/vidsrc-cloudnestra-flow.js [tmdb_id] [type] [season] [episode]
 * Example: node scripts/reverse-engineering/vidsrc-cloudnestra-flow.js 550 movie
 * Example: node scripts/reverse-engineering/vidsrc-cloudnestra-flow.js 1396 tv 1 1
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ANSI color codes for better console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

const log = {
    step: (msg) => console.log(`${colors.bright}${colors.cyan}📍 ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
    data: (label, value) => console.log(`${colors.magenta}  ${label}:${colors.reset} ${value}`)
};

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

/**
 * Fetch a URL with proper headers and redirect handling
 */
function fetchPage(url, referer, origin, followRedirects = true, maxRedirects = 5, redirectCount = 0) {
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

        const req = https.request(options, res => {
            // Handle redirects
            if (followRedirects && [301, 302, 303, 307, 308].includes(res.statusCode)) {
                const redirectUrl = res.headers.location;
                if (redirectUrl) {
                    if (redirectCount >= maxRedirects) {
                        return reject(new Error(`Too many redirects (${redirectCount})`));
                    }

                    const nextUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).toString();
                    log.info(`Redirect ${redirectCount + 1}: ${nextUrl}`);

                    return fetchPage(nextUrl, referer, origin, followRedirects, maxRedirects, redirectCount + 1)
                        .then(resolve)
                        .catch(reject);
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
                url: url,
                redirectChain: []
            }));
            stream.on('error', reject);
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

/**
 * Extract superembed hash from vidsrc-embed page
 */
function extractSuperembedHash(html) {
    const match = html.match(/data-hash="([^"]+)"[^>]*>[\s\S]{0,200}?Superembed/i);
    return match ? match[1] : null;
 */
    function analyzeSourceListing(html) {
        const analysis = {
            sources: [],
            patterns: [],
            obfuscatedScripts: [],
            iframes: [],
            variables: []
        };

        // Look for common video source patterns
        const patterns = [
            { name: 'M3U8 URLs', regex: /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g },
            { name: 'MP4 URLs', regex: /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/g },
            { name: 'Source URLs', regex: /['"]?sources?['"]?\s*[:=]\s*['"](https?:\/\/[^'"]+)['"]/gi },
            { name: 'File URLs', regex: /['"]?file['"]?\s*[:=]\s*['"](https?:\/\/[^'"]+)['"]/gi }
        ];

        patterns.forEach(({ name, regex }) => {
            const matches = [...html.matchAll(regex)];
            if (matches.length > 0) {
                analysis.patterns.push({
                    name,
                    count: matches.length,
                    matches: matches.slice(0, 5).map(m => m[0] || m[1])
                });
            }
        });

        // Look for iframes
        const iframeMatches = [...html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
        analysis.iframes = iframeMatches.map(m => m[1]);

        // Look for suspicious variables
        const varMatches = [...html.matchAll(/(?:var|let|const|window\[['"])\s*([A-Za-z0-9_$]+)['"]\]?\s*=\s*['"]?([A-Za-z0-9+/=]{50,})['"]?/g)];
        analysis.variables = varMatches.slice(0, 10).map(m => ({
            name: m[1],
            value: m[2].substring(0, 100) + (m[2].length > 100 ? '...' : '')
        }));

        // Look for packed/obfuscated scripts
        const packedMatches = [...html.matchAll(/eval\(function\(p,a,c,k,e,d\).+?\.split\('\|'\)\)\)/g)];
        analysis.obfuscatedScripts = packedMatches.map((m, i) => ({
            index: i,
            preview: m[0].substring(0, 200) + '...'
        }));

        return analysis;
    }

    /**
     * Find source provider names/types
     */
    function findSourceProviders(html) {
        const providers = new Set();

        // Common provider names
        const providerPatterns = [
            /(?:provider|server|source)['":\s]+['"]([^'"]+)['"]/gi,
            /data-(?:provider|server|source)=["']([^"']+)["']/gi,
            /<(?:div|li|button)[^>]*class=["'][^"']*(?:server|source|provider)[^"']*["'][^>]*>([^<]+)</gi
        ];

        providerPatterns.forEach(pattern => {
            const matches = [...html.matchAll(pattern)];
            matches.forEach(m => {
                if (m[1] && m[1].trim()) {
                    providers.add(m[1].trim());
                }
            });
        });

        return Array.from(providers);
    }

    /**
     * Save page content for debugging
     */
    function savePage(filename, content, metadata = {}) {
        const debugDir = path.join(__dirname, 'debug-output');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }

        const filepath = path.join(debugDir, filename);
        fs.writeFileSync(filepath, content, 'utf-8');

        // Also save metadata
        const metaFilepath = path.join(debugDir, filename.replace(/\.[^.]+$/, '.meta.json'));
        fs.writeFileSync(metaFilepath, JSON.stringify(metadata, null, 2), 'utf-8');

        log.success(`Saved: ${filename} (${content.length} bytes)`);
        return filepath;
    }

    /**
     * Main execution flow
     */
    async function main() {
        const args = process.argv.slice(2);
        const tmdbId = args[0] || '550'; // Default: Fight Club
        const type = args[1] || 'movie';
        const season = args[2];
        const episode = args[3];

        console.log('\n' + '='.repeat(80));
        console.log(`${colors.bright}${colors.cyan}🔍 VIDSRC → CLOUDNESTRA FLOW ANALYZER${colors.reset}`);
        console.log('='.repeat(80) + '\n');

        log.info(`Analyzing: ${type} ID ${tmdbId} ${season ? `S${season}E${episode}` : ''}`);
        console.log('');

        // STEP 1: Fetch vidsrc-embed page
        log.step('STEP 1: Fetching vidsrc-embed.ru page');

        let embedUrl = `https://vidsrc-embed.ru/embed/${type}/${tmdbId}`;
        if (type === 'tv' && season && episode) {
            embedUrl += `/${season}/${episode}`;
        }

        log.data('URL', embedUrl);

        const embedRes = await fetchPage(embedUrl, 'https://vidsrc-embed.ru/', 'https://vidsrc-embed.ru');
        log.data('Status', embedRes.statusCode);
        log.data('Size', embedRes.body.length + ' bytes');

        savePage(`1-vidsrc-embed-${tmdbId}.html`, embedRes.body, {
            url: embedUrl,
            statusCode: embedRes.statusCode,
            step: 'vidsrc-embed'
        });

        // Extract superembed hash
        const hash = extractSuperembedHash(embedRes.body);
        if (!hash) {
            log.error('Failed to extract superembed hash!');
            log.warn('This might not be a superembed source');
            return;
        }

        log.success(`Extracted hash: ${hash.substring(0, 50)}...`);
        console.log('');

        // STEP 2: Fetch RCP page
        log.step('STEP 2: Fetching cloudnestra RCP page');

        const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
        log.data('URL', rcpUrl);

        const rcpRes = await fetchPage(rcpUrl, embedUrl, 'https://vidsrc-embed.ru');
        log.data('Status', rcpRes.statusCode);
        log.data('Size', rcpRes.body.length + ' bytes');

        savePage(`2-cloudnestra-rcp-${tmdbId}.html`, rcpRes.body, {
            url: rcpUrl,
            statusCode: rcpRes.statusCode,
            step: 'rcp',
            hash: hash
        });

        // Extract next URLs
        const srcRcpUrl = extractSrcRcpUrl(rcpRes.body);
        const proRcpUrl = extractProRcpUrl(rcpRes.body);

        if (srcRcpUrl) {
            log.success(`Found SRCRCP URL: ${srcRcpUrl}`);
        }
        if (proRcpUrl) {
            log.success(`Found PRORCP URL: ${proRcpUrl}`);
        }

        if (!srcRcpUrl && !proRcpUrl) {
            log.error('No SRCRCP or PRORCP URL found!');

            // Analyze RCP page to understand the structure
            log.info('Analyzing RCP page structure...');
            const rcpAnalysis = analyzeSourceListing(rcpRes.body);

            if (rcpAnalysis.iframes.length > 0) {
                log.data('Iframes found', rcpAnalysis.iframes.length);
                rcpAnalysis.iframes.forEach((iframe, i) => {
                    console.log(`  ${i + 1}. ${iframe}`);
                });
            }

            if (rcpAnalysis.variables.length > 0) {
                log.data('Suspicious variables', rcpAnalysis.variables.length);
                rcpAnalysis.variables.forEach(v => {
                    console.log(`  ${v.name}: ${v.value}`);
                });
            }

            return;
        }
        console.log('');

        // STEP 3A: Fetch SRCRCP page (if available)
        if (srcRcpUrl) {
            log.step('STEP 3A: Fetching cloudnestra SRCRCP page');
            log.data('URL', srcRcpUrl);

            const srcRcpRes = await fetchPage(srcRcpUrl, embedUrl, 'https://vidsrc-embed.ru');
            log.data('Status', srcRcpRes.statusCode);
            log.data('Size', srcRcpRes.body.length + ' bytes');

            savePage(`3a-cloudnestra-srcrcp-${tmdbId}.html`, srcRcpRes.body, {
                url: srcRcpUrl,
                statusCode: srcRcpRes.statusCode,
                step: 'srcrcp'
            });

            // Analyze SRCRCP page
            console.log('');
            log.step('Analyzing SRCRCP page for source listings...');

            const srcAnalysis = analyzeSourceListing(srcRcpRes.body);

            if (srcAnalysis.patterns.length > 0) {
                log.data('Patterns found', srcAnalysis.patterns.length);
                srcAnalysis.patterns.forEach(p => {
                    console.log(`\n  ${colors.cyan}${p.name}${colors.reset} (${p.count} matches):`);
                    p.matches.forEach(m => console.log(`    - ${m}`));
                });
            }

            if (srcAnalysis.iframes.length > 0) {
                log.data('\nNested iframes', srcAnalysis.iframes.length);
                srcAnalysis.iframes.forEach((iframe, i) => {
                    console.log(`  ${i + 1}. ${iframe}`);
                });
            }

            if (srcAnalysis.obfuscatedScripts.length > 0) {
                log.data('\nObfuscated scripts', srcAnalysis.obfuscatedScripts.length);
            }

            // Find source providers
            const providers = findSourceProviders(srcRcpRes.body);
            if (providers.length > 0) {
                log.data('\nPotential providers', providers.length);
                providers.forEach(p => console.log(`  - ${p}`));
            }

            // Save analysis
            const analysisPath = savePage(`3a-srcrcp-analysis-${tmdbId}.json`, JSON.stringify(srcAnalysis, null, 2), {
                step: 'srcrcp-analysis',
                providers: providers
            });

            console.log('');
        }

        // STEP 3B: Fetch PRORCP page (if available)
        if (proRcpUrl) {
            log.step('STEP 3B: Fetching cloudnestra PRORCP page');
            log.data('URL', proRcpUrl);

            const proRcpRes = await fetchPage(proRcpUrl, embedUrl, 'https://vidsrc-embed.ru');
            log.data('Status', proRcpRes.statusCode);
            log.data('Size', proRcpRes.body.length + ' bytes');

            savePage(`3b-cloudnestra-prorcp-${tmdbId}.html`, proRcpRes.body, {
                url: proRcpUrl,
                statusCode: proRcpRes.statusCode,
                step: 'prorcp'
            });

            // Analyze PRORCP page
            console.log('');
            log.step('Analyzing PRORCP page for source listings...');

            const proAnalysis = analyzeSourceListing(proRcpRes.body);

            if (proAnalysis.patterns.length > 0) {
                log.data('Patterns found', proAnalysis.patterns.length);
                proAnalysis.patterns.forEach(p => {
                    console.log(`\n  ${colors.cyan}${p.name}${colors.reset} (${p.count} matches):`);
                    p.matches.forEach(m => console.log(`    - ${m}`));
                });
            }

            if (proAnalysis.iframes.length > 0) {
                log.data('\nNested iframes', proAnalysis.iframes.length);
                proAnalysis.iframes.forEach((iframe, i) => {
                    console.log(`  ${i + 1}. ${iframe}`);
                });
            }

            // Find source providers
            const providers = findSourceProviders(proRcpRes.body);
            if (providers.length > 0) {
                log.data('\nPotential providers', providers.length);
                providers.forEach(p => console.log(`  - ${p}`));
            }

            // Save analysis
            savePage(`3b-prorcp-analysis-${tmdbId}.json`, JSON.stringify(proAnalysis, null, 2), {
                step: 'prorcp-analysis',
                providers: providers
            });

            console.log('');
        }

        console.log('\n' + '='.repeat(80));
        log.success('Analysis complete! Check debug-output/ directory for saved files.');
        console.log('='.repeat(80) + '\n');
    }

    main().catch(error => {
        log.error(`Error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
