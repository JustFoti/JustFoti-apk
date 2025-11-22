const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchUrl(url, headers = {}, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : require('http');
        const options = {
            method: method,
            headers: headers
        };

        const req = client.request(url, options, (res) => {
            // Handle Redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log(`Redirecting to ${res.headers.location} (${res.statusCode})`);
                const newUrl = new URL(res.headers.location, url).href;
                // Update cookies if present
                if (res.headers['set-cookie']) {
                    // Simple cookie merge - in a real app use a library
                    const newCookies = res.headers['set-cookie'].map(c => c.split(';')[0]);
                    const existingCookies = headers['Cookie'] ? headers['Cookie'].split('; ') : [];
                    const mergedCookies = [...new Set([...existingCookies, ...newCookies])].join('; ');
                    headers['Cookie'] = mergedCookies;
                }
                fetchUrl(newUrl, headers, method, body).then(resolve).catch(reject);
                return;
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ data, headers: res.headers, statusCode: res.statusCode, url: url }));
        });

        req.on('error', reject);

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

async function main() {
    try {
        // Helper to extract cookies
        let cookies = [];
        function updateCookies(headers) {
            if (headers['set-cookie']) {
                headers['set-cookie'].forEach(c => cookies.push(c.split(';')[0]));
            }
        }
        function getCookieHeader() {
            return cookies.join('; ');
        }

        // 1. Fetch Embed Page
        console.log('Fetching embed page...');
        const embedUrl = 'https://vidsrc-embed.ru/embed/movie/550';
        const embedRes = await fetchUrl(embedUrl, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });

        // 2. Extract Superembed Hash
        const hashMatch = embedRes.data.match(/<div class="server" data-hash="([^"]+)">Superembed<\/div>/);
        if (!hashMatch) {
            console.error('Superembed hash not found!');
            // Try to find ANY server hash to debug
            const anyHash = embedRes.data.match(/<div class="server" data-hash="([^"]+)">/);
            if (anyHash) console.log('Found other hash:', anyHash[1]);
            return;
        }
        const hash = hashMatch[1];
        console.log('Found hash:', hash);

        // 3. Fetch RCP Page
        console.log('Fetching RCP page...');
        const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
        const rcpRes = await fetchUrl(rcpUrl, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': embedUrl
        });
        updateCookies(rcpRes.headers);

        // 4. Extract srcrcp URL
        const srcrcpMatch = rcpRes.data.match(/src:\s*['"](\/srcrcp\/[^'"]+)['"]/);
        if (!srcrcpMatch) {
            console.error('srcrcp URL not found in RCP page!');
            fs.writeFileSync(path.join(__dirname, 'debug-rcp-fetched.html'), rcpRes.data);
            return;
        }
        const srcrcpPath = srcrcpMatch[1];
        const srcrcpUrl = `https://cloudnestra.com${srcrcpPath}`;
        console.log('Found srcrcp URL:', srcrcpUrl);

        // 5. Fetch srcrcp Page
        console.log('Fetching srcrcp page...');
        const srcrcpRes = await fetchUrl(srcrcpUrl, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': rcpUrl,
            'Cookie': getCookieHeader()
        });
        updateCookies(srcrcpRes.headers);

        // 6. Extract Obfuscated Script URL
        const scriptMatch = srcrcpRes.data.match(/src=['"](\/[a-f0-9]{32}\.js\?_=\d+)['"]/);
        if (!scriptMatch) {
            console.error('Obfuscated script URL not found in srcrcp page!');
            fs.writeFileSync(path.join(__dirname, 'debug-srcrcp-fetched.html'), srcrcpRes.data);
            console.log('Saved srcrcp content to debug-srcrcp-fetched.html');
            return;
        }
        const scriptPath = scriptMatch[1];
        const scriptUrl = `https://cloudnestra.com${scriptPath}`;
        console.log('Found obfuscated script URL:', scriptUrl);

        // 7. Fetch Script
        console.log('Fetching script...');
        const scriptRes = await fetchUrl(scriptUrl, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': srcrcpUrl,
            'Cookie': getCookieHeader()
        });

        console.log('Script fetched! Length:', scriptRes.data.length);

        // Save script for analysis
        fs.writeFileSync(path.join(__dirname, 'fetched-script.js'), scriptRes.data);
        console.log('Saved to fetched-script.js');

        // Save srcrcp page for reference
        fs.writeFileSync(path.join(__dirname, 'debug-srcrcp-fetched.html'), srcrcpRes.data);
        console.log('Saved srcrcp content to debug-srcrcp-fetched.html');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
