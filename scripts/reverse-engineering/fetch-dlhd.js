const https = require('https');
const fs = require('fs');
const path = require('path');

const url = "https://dlhd.dad/casting/stream-769.php";
const options = {
    headers: {
        "Referer": "https://dlhd.dad/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
};

https.get(url, options, (res) => {
    console.log('StatusCode:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        fs.writeFileSync(path.join(__dirname, 'dlhd-stream-fresh.html'), data);
        console.log('File saved.');
    });

}).on('error', (e) => {
    console.error(e);
});
