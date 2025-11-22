const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://cloudnestra.com/sV05kUlNvOdOxvtC/a6a95bb5246c6a03e4978992dcd1e03c.js?_=1744906950';
const dest = path.join(__dirname, 'obfuscated_decoder.js');

const file = fs.createWriteStream(dest);

https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
        file.close(() => {
            console.log('Download completed.');
        });
    });
}).on('error', (err) => {
    fs.unlink(dest, () => { }); // Delete the file async. (But we don't check the result)
    console.error('Error downloading file:', err.message);
});
