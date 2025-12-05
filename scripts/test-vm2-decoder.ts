/**
 * Test decoder with VM2 (works with Bun)
 */
const { VM } = require('vm2');

async function fetchWithHeaders(url: string, referer?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  if (referer) headers['Referer'] = referer;
  return fetch(url, { headers });
}

function customAtob(str: string): string {
  return Buffer.from(str, 'base64').toString('binary');
}

function customBtoa(str: string): string {
  return Buffer.from(str, 'binary').toString('base64');
}

async function testVM2Decoder() {
  console.log('Fetching real decoder from vidsrc-embed.ru...\n');
  
  // Fetch the decoder (same as before)
  const embedUrl = 'https://vidsrc-embed.ru/embed/movie/550';
  const embedResponse = await fetchWithHeaders(embedUrl);
  const embedHtml = await embedResponse.text();
  
  const iframeMatch = embedHtml.match(/<iframe[^>]*src=["']([^"']+cloudnestra\.com\/rcp\/([^"']+))["']/i);
  if (!iframeMatch) throw new Error('No RCP iframe found');
  const rcpPath = iframeMatch[2];
  console.log('Found RCP path');
  
  const rcpUrl = `https://cloudnestra.com/rcp/${rcpPath}`;
  const rcpResponse = await fetchWithHeaders(rcpUrl, 'https://vidsrc-embed.ru/');
  const rcpHtml = await rcpResponse.text();
  
  const prorcpMatch = rcpHtml.match(/src:\s*['"]\/prorcp\/([^'"]+)['"]/);
  if (!prorcpMatch) throw new Error('No prorcp found');
  const prorcpPath = prorcpMatch[1];
  console.log('Found PRORCP path');
  
  const prorcpUrl = `https://cloudnestra.com/prorcp/${prorcpPath}`;
  const prorcpResponse = await fetchWithHeaders(prorcpUrl, 'https://cloudnestra.com/');
  const prorcpHtml = await prorcpResponse.text();
  
  const divMatch = prorcpHtml.match(/<div id="([A-Za-z0-9]+)" style="display:none;">([^<]+)<\/div>/);
  if (!divMatch) throw new Error('No encoded div found');
  const divId = divMatch[1];
  const encodedContent = divMatch[2];
  console.log('Div ID:', divId, 'Encoded length:', encodedContent.length);
  
  const scriptMatch = prorcpHtml.match(/sV05kUlNvOdOxvtC\/([a-f0-9]+)\.js/);
  if (!scriptMatch) throw new Error('No decoder script found');
  const scriptHash = scriptMatch[1];
  const scriptUrl = `https://cloudnestra.com/sV05kUlNvOdOxvtC/${scriptHash}.js?_=${Date.now()}`;
  console.log('Fetching decoder script...');
  const scriptResponse = await fetchWithHeaders(scriptUrl, 'https://cloudnestra.com/');
  const decoderScript = await scriptResponse.text();
  console.log('Decoder script length:', decoderScript.length);
  
  // Test with VM2
  console.log('\n--- Testing with VM2 ---\n');
  
  const mockWindow: Record<string, unknown> = {};
  const mockDocument = {
    getElementById: (id: string) => {
      if (id === divId) {
        return { innerHTML: encodedContent };
      }
      return null;
    }
  };
  
  const vm = new VM({
    timeout: 5000,
    sandbox: {
      window: mockWindow,
      document: mockDocument,
      atob: customAtob,
      btoa: customBtoa,
      setTimeout: (fn: () => void) => { if (typeof fn === 'function') fn(); },
      setInterval: () => {},
      clearTimeout: () => {},
      clearInterval: () => {},
      console: { log: () => {}, error: () => {}, warn: () => {}, info: () => {} },
      fetch: undefined,
      XMLHttpRequest: undefined,
      WebSocket: undefined,
      require: undefined,
      process: undefined,
      Buffer: undefined,
    },
    eval: false,
    wasm: false,
  });
  
  try {
    console.log('Running decoder in VM2...');
    vm.run(decoderScript);
    
    console.log('\nResults:');
    console.log('mockWindow keys:', Object.keys(mockWindow));
    
    const result = mockWindow[divId];
    if (typeof result === 'string' && result.includes('https://')) {
      console.log('\n✅ SUCCESS! Decoded URL preview:', result.substring(0, 100) + '...');
    } else {
      console.log('\n❌ FAILED - No result in mockWindow');
    }
  } catch (error) {
    console.error('VM2 Error:', error);
  }
}

testVM2Decoder().catch(console.error);
