/**
 * DLHD.dad Schedule API Test
 * 
 * Tests the schedule API endpoints to understand the data format
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = __dirname;

const API_ENDPOINTS = [
    '/schedule-api.php',
    '/schedule-api.php?source=extra',
    '/schedule-api.php?source=extra_plus',
    '/schedule-api.php?source=extra_ppv',
    '/schedule-api.php?source=extra_topembed',
    '/schedule-api.php?source=extra_backup',
    '/schedule-api.php?source=extra_sd',
    '/api.php'
];

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://dlhd.dad/'
            }
        };
        
        protocol.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        }).on('error', reject);
    });
}

async function testScheduleAPIs() {
    console.log('='.repeat(60));
    console.log('DLHD.dad Schedule API Test');
    console.log('='.repeat(60));
    
    const results = {};
    
    for (const endpoint of API_ENDPOINTS) {
        const url = `https://dlhd.dad${endpoint}`;
        console.log(`\nTesting: ${url}`);
        
        try {
            const response = await fetchUrl(url);
            console.log(`  Status: ${response.status}`);
            console.log(`  Content-Type: ${response.headers['content-type']}`);
            console.log(`  Data length: ${response.data.length} bytes`);
            
            // Try to parse as JSON
            try {
                const json = JSON.parse(response.data);
                console.log(`  JSON parsed successfully`);
                
                if (Array.isArray(json)) {
                    console.log(`  Array with ${json.length} items`);
                    if (json.length > 0) {
                        console.log(`  First item keys: ${Object.keys(json[0]).join(', ')}`);
                    }
                } else if (typeof json === 'object') {
                    console.log(`  Object keys: ${Object.keys(json).join(', ')}`);
                }
                
                results[endpoint] = {
                    status: response.status,
                    type: 'json',
                    data: json
                };
            } catch (e) {
                console.log(`  Not valid JSON, first 200 chars: ${response.data.substring(0, 200)}`);
                results[endpoint] = {
                    status: response.status,
                    type: 'html',
                    preview: response.data.substring(0, 500)
                };
            }
        } catch (err) {
            console.log(`  Error: ${err.message}`);
            results[endpoint] = { error: err.message };
        }
    }
    
    // Save results
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'dlhd-api-test-results.json'),
        JSON.stringify(results, null, 2)
    );
    console.log('\n\nSaved results to dlhd-api-test-results.json');
    
    return results;
}

testScheduleAPIs()
    .then(() => {
        console.log('\n' + '='.repeat(60));
        console.log('API TEST COMPLETE');
        console.log('='.repeat(60));
    })
    .catch(err => {
        console.error('Error:', err);
    });
