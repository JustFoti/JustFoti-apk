const https = require('https');

// URL from previous debug output (sflix2 source)
const url = "https://cloudspark91.live/file2/YRmKSPzMxgN19s1k6iCnFvLNzwbebSLW97tNKtalwZhzw0ywoO518NEhe4EZeH0iFstoYBlJRP79~Q8M~Lky+nBWUlaHlApNGL0ajjBxJm+k8iSElUNGHYSKKMO4l3cGvPPQxBT0PGkeRjSGDVfW0h3q02lZJn4ncetHMv4er8w=/cGxheWxpc3QubTN1OA==.m3u8";

// Headers from API response
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://videostr.net/',
    'Origin': 'https://videostr.net'
};

console.log(`Fetching ${url}...`);
console.log('Headers:', headers);

const options = {
    headers: headers
};

https.get(url, options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Response Headers:', res.headers);

    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Data length: ${data.length}`);
        if (res.statusCode === 200) {
            console.log("Preview:", data.substring(0, 200));
        } else {
            console.log("Response Body:", data);
        }
    });

}).on('error', (err) => {
    console.error('Error:', err.message);
});
