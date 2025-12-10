const { spawn } = require('child_process');

const url = 'https://top2.giokko.ru/wmsxx.php?test=true&name=premium51&number=5884999';
const amzDate = '20251210T010000Z';
const auth = 'AWS4-HMAC-SHA256 Credential=/20251210/us-east-1//aws4_request, SignedHeaders=host;x-amz-date, Signature=0000000000000000000000000000000000000000000000000000000000000000';

const args = [
  '-s', '-L', '--max-time', '30', '--http2', '-k',
  '-H', 'x-amz-date: ' + amzDate,
  '-H', 'authorization: ' + auth,
  '-H', 'user-agent: insomnia/2022.4.2',
  '-H', 'accept: */*',
  '-i',
  url
];

console.log('Args:', JSON.stringify(args, null, 2));

const curl = spawn('curl', args);
const chunks = [];

curl.stdout.on('data', d => chunks.push(d));
curl.stderr.on('data', d => console.error('stderr:', d.toString()));

curl.on('close', code => {
  const output = Buffer.concat(chunks);
  console.log('Exit code:', code);
  console.log('Output length:', output.length);
  console.log('First 500 bytes:', output.slice(0, 500).toString());
});
