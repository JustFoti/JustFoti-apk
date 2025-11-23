const crypto = require('crypto');
const https = require('https');

// Encryption Logic
function evpBytesToKey(password, salt, keyLen, ivLen) {
    const passwordBuffer = Buffer.from(password, 'utf8');
    const saltBuffer = Buffer.from(salt, 'binary');

    let digests = [];
    let genLen = 0;
    let lastDigest = Buffer.alloc(0);

    while (genLen < keyLen + ivLen) {
        const hash = crypto.createHash('md5');
        hash.update(lastDigest);
        hash.update(passwordBuffer);
        hash.update(saltBuffer);
        const digest = hash.digest();
        digests.push(digest);
        lastDigest = Buffer.from(digest);
        genLen += digest.length;
    }

    const combined = Buffer.concat(digests);
    const key = combined.slice(0, keyLen);
    const iv = combined.slice(keyLen, keyLen + ivLen);
    return { key, iv };
}

function encrypt(text, password) {
    const salt = crypto.randomBytes(8);
    const { key, iv } = evpBytesToKey(password, salt.toString('binary'), 32, 16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const saltedPrefix = Buffer.from('Salted__', 'utf8');
    const finalBuffer = Buffer.concat([saltedPrefix, salt, Buffer.from(encrypted, 'base64')]);
    return finalBuffer.toString('base64');
}

// Config
const SCRAPIFY_URL = "https://ww2.moviesapi.to/api/scrapify";
const ENCRYPTION_KEY = "moviesapi-secure-encryption-key-2024-v1";
const PLAYER_API_KEY = "moviesapi-player-auth-key-2024-secure";

const tmdbId = '1054867'; // Terrifier 3
const type = 'movie';

const sourceTypes = [
    'vidora',
    'vidcloud',
    'upcloud',
    'doodstream',
    'mixdrop',
    'filemoon',
    'streamtape',
    'vizcloud',
    'mycloud',
    'filelions',
    'sflix', // trying sflix without '2'
    'sflix2' // baseline
];

const headerConfigs = [
    {
        name: 'WW2 Base',
        referer: 'https://ww2.moviesapi.to/',
        origin: 'https://ww2.moviesapi.to'
    },
    {
        name: 'WW2 Movie Page',
        referer: `https://ww2.moviesapi.to/movie/${tmdbId}`,
        origin: 'https://ww2.moviesapi.to'
    },
    {
        name: 'MoviesApi Club',
        referer: 'https://moviesapi.club/',
        origin: 'https://moviesapi.club'
    }
];

async function testSource(source, headerConfig) {
    return new Promise((resolve) => {
        const payloadObj = {
            source: source,
            type: type,
            id: tmdbId,
            srv: "0"
        };

        const encryptedPayload = encrypt(JSON.stringify(payloadObj), ENCRYPTION_KEY);
        const postData = JSON.stringify({ payload: encryptedPayload });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-player-key': PLAYER_API_KEY,
                'Referer': headerConfig.referer,
                'Origin': headerConfig.origin,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };

        const req = https.request(`${SCRAPIFY_URL}/v1/fetch`, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (!json.error && (json.url || (json.sources && json.sources.length > 0))) {
                        resolve({ success: true, data: json });
                    } else {
                        resolve({ success: false, error: json.error || 'Unknown error' });
                    }
                } catch (e) {
                    resolve({ success: false, error: 'Invalid JSON' });
                }
            });
        });

        req.on('error', (e) => resolve({ success: false, error: e.message }));
        req.write(postData);
        req.end();
    });
}

async function runTests() {
    console.log(`Testing sources for Movie ID: ${tmdbId}`);

    for (const source of sourceTypes) {
        console.log(`\n--- Testing Source: ${source} ---`);
        for (const config of headerConfigs) {
            process.stdout.write(`  [${config.name}] ... `);
            const result = await testSource(source, config);
            if (result.success) {
                console.log(`SUCCESS!`);
                console.log(`  Data:`, JSON.stringify(result.data, null, 2));
            } else {
                console.log(`Failed (${result.error})`);
            }
            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));
        }
    }
}

runTests();
