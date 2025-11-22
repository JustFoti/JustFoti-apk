const cheerio = require('cheerio');

const TMDB_ID = process.argv[2] || '550';
const TYPE = process.argv[3] || 'movie';
const SEASON = process.argv[4];
const EPISODE = process.argv[5];

const EMBED_URL = TYPE === 'movie'
    ? `https://vidsrc-embed.ru/embed/movie/${TMDB_ID}`
    : `https://vidsrc-embed.ru/embed/tv/${TMDB_ID}/${SEASON}/${EPISODE}`;

async function fetchServerList() {
    console.log(`\n🔍 Fetching Server List for ${TYPE} ID: ${TMDB_ID}`);
    console.log(`📍 URL: ${EMBED_URL}`);

    try {
        const response = await fetch(EMBED_URL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://vidsrc-embed.ru/",
                "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const servers = [];
        $('.server').each((i, el) => {
            servers.push({
                name: $(el).text().trim(),
                hash: $(el).attr('data-hash')
            });
        });

        console.log(`\n✅ Found ${servers.length} servers:`);
        console.log(JSON.stringify(servers, null, 2));

    } catch (error) {
        console.error(`❌ Error fetching server list: ${error.message}`);
    }
}

fetchServerList();
