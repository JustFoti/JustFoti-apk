const https = require('https');

const url = 'https://ww2.moviesapi.to/movie/1054867';

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://moviesapi.club/',
    }
};

console.log(`Fetching ${url}...`);

https.get(url, options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);

    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Data length: ${data.length}`);
        console.log("Preview:", data.substring(0, 500));

        // Check for iframes
        const iframes = data.match(/<iframe[^>]+src=["']([^"']+)["']/g);
        if (iframes) {
            console.log("Found iframes:", iframes);
        } else {
            console.log("No iframes found.");
        }
    });

}).on('error', (err) => {
    console.error('Error:', err.message);
});
