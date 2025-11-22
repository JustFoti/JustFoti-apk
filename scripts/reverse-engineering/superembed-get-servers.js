const cheerio = require('cheerio');

/**
 * Fetches the list of available servers from Superembed for a given media.
 * @param {string} tmdbId - The TMDB ID of the movie or TV show.
 * @param {string} type - 'movie' or 'tv'.
 * @param {string} [season] - Season number (required for TV).
 * @param {string} [episode] - Episode number (required for TV).
 * @returns {Promise<Array<{name: string, hash: string}>>} List of servers.
 */
async function getServers(tmdbId, type = 'movie', season = null, episode = null) {
    const url = type === 'movie'
        ? `https://vidsrc-embed.ru/embed/movie/${tmdbId}`
        : `https://vidsrc-embed.ru/embed/tv/${tmdbId}/${season}/${episode}`;

    console.log(`\n🔍 Fetching servers from: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://vidsrc-embed.ru/",
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
            const name = $(el).text().trim();
            const hash = $(el).attr('data-hash');
            if (name && hash) {
                servers.push({ name, hash });
            }
        });

        return servers;

    } catch (error) {
        console.error(`❌ Error fetching server list: ${error.message}`);
        return [];
    }
}

// CLI Usage
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("Usage: node superembed-get-servers.js <tmdb_id> [type] [season] [episode]");
        process.exit(1);
    }

    const [tmdbId, type, season, episode] = args;
    getServers(tmdbId, type, season, episode).then(servers => {
        console.log(`\n✅ Found ${servers.length} servers:`);
        console.log(JSON.stringify(servers, null, 2));
    });
}

module.exports = { getServers };
