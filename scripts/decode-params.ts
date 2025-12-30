import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('sbs-full-capture.json', 'utf8'));
const paramsCall = data.apiCalls.find((c: any) => c.url.includes('common/params'));

if (paramsCall) {
  console.log('URL:', paramsCall.url);
  console.log('Status:', paramsCall.responseStatus);
  console.log('Body hex length:', paramsCall.responseBody.length);
  
  // Decode hex to string
  const hex = paramsCall.responseBody;
  const buf = Buffer.from(hex, 'hex');
  
  // ROT47 decode
  function rot47(input: string): string {
    return input.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 33 && code <= 126) {
        return String.fromCharCode(((code - 33 + 47) % 94) + 33);
      }
      return c;
    }).join('');
  }
  
  const raw = buf.toString('utf8');
  console.log('\nRaw (first 500 chars):');
  console.log(raw.substring(0, 500));
  
  const decoded = rot47(raw);
  console.log('\nROT47 Decoded (first 2000 chars):');
  console.log(decoded.substring(0, 2000));
  
  // Try to parse as JSON
  try {
    const json = JSON.parse(decoded);
    console.log('\n\nParsed JSON:');
    console.log(JSON.stringify(json, null, 2).substring(0, 3000));
  } catch (e) {
    console.log('\nNot valid JSON');
  }
}
