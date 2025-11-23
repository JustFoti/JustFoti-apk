const https = require('https');

const subdomains = ['ax', 'bx', 'cx', 'dx', 'ex', 'fx', 'gx', 'hx', 'ix', 'jx', 'kx', 'lx', 'mx', 'nx', 'ox', 'px', 'qx', 'rx', 'sx', 'tx', 'ux', 'vx', 'wx', 'xx', 'yx', 'zx', 'cdn', 'proxy', 's1', 's2', 's3', 's4', 's5'];
const targetPath = '/stormgleam42.xyz/file2/YRmKSPzMxgN19s1k6iCnFvLNzwbebSLW97tNKtalwZhzw0ywoO518NEhe4EZeH0iFstoYBlJRP79~Q8M~Lky+nBWUlaHlApNGL0ajjBxJm+k8iSElUNGHYSKKMO4l3cGvPPQxBT0PGkeRjSGDVfW0h3q02lZJn4ncetHMv4er8w=/cGxheWxpc3QubTN1OA==.m3u8';
const referer = 'https://ww2.moviesapi.to/';

async function checkProxy(subdomain) {
    return new Promise((resolve) => {
        const hostname = `${subdomain}.1hd.su`;
        const options = {
            hostname: hostname,
            path: targetPath,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': referer,
                'Origin': 'https://ww2.moviesapi.to'
            },
            timeout: 5000
        };

        const req = https.request(options, (res) => {
            console.log(`[${subdomain}] Status: ${res.statusCode}`);
            if (res.statusCode === 200) {
                resolve(subdomain);
            } else {
                resolve(null);
            }
        });

        req.on('error', (e) => {
            // console.log(`[${subdomain}] Error: ${e.message}`);
            resolve(null);
        });

        req.on('timeout', () => {
            // console.log(`[${subdomain}] Timeout`);
            req.destroy();
            resolve(null);
        });

        req.end();
    });
}

async function scan() {
    console.log("Scanning proxies...");
    const promises = subdomains.map(checkProxy);
    const results = await Promise.all(promises);
    const working = results.filter(r => r !== null);

    console.log("--- Summary ---");
    if (working.length > 0) {
        console.log("Working proxies:", working.join(', '));
    } else {
        console.log("No working proxies found.");
    }
}

scan();
