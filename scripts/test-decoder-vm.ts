/**
 * Test the actual decoder in VM to debug why it's not working
 */
const vm = require('vm');

async function fetchWithHeaders(url: string, referer?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  if (referer) headers['Referer'] = referer;
  return fetch(url, { headers });
}

async function testRealDecoder() {
  console.log('Fetching real decoder from vidsrc-embed.ru...\n');
  
  // Step 1: Fetch embed page
  const embedUrl = 'https://vidsrc-embed.ru/embed/movie/550'; // Fight Club
  const embedResponse = await fetchWithHeaders(embedUrl);
  const embedHtml = await embedResponse.text();
  
  // Step 2: Extract RCP iframe
  const iframeMatch = embedHtml.match(/<iframe[^>]*src=["']([^"']+cloudnestra\.com\/rcp\/([^"']+))["']/i);
  if (!iframeMatch) throw new Error('No RCP iframe found');
  const rcpPath = iframeMatch[2];
  console.log('Found RCP path:', rcpPath);
  
  // Step 3: Fetch RCP page
  const rcpUrl = `https://cloudnestra.com/rcp/${rcpPath}`;
  const rcpResponse = await fetchWithHeaders(rcpUrl, 'https://vidsrc-embed.ru/');
  const rcpHtml = await rcpResponse.text();
  
  // Step 4: Extract prorcp URL
  const prorcpMatch = rcpHtml.match(/src:\s*['"]\/prorcp\/([^'"]+)['"]/);
  if (!prorcpMatch) throw new Error('No prorcp found');
  const prorcpPath = prorcpMatch[1];
  console.log('Found PRORCP path:', prorcpPath);
  
  // Step 5: Fetch PRORCP page
  const prorcpUrl = `https://cloudnestra.com/prorcp/${prorcpPath}`;
  const prorcpResponse = await fetchWithHeaders(prorcpUrl, 'https://cloudnestra.com/');
  const prorcpHtml = await prorcpResponse.text();
  
  // Step 6: Extract div ID and encoded content
  const divMatch = prorcpHtml.match(/<div id="([A-Za-z0-9]+)" style="display:none;">([^<]+)<\/div>/);
  if (!divMatch) throw new Error('No encoded div found');
  const divId = divMatch[1];
  const encodedContent = divMatch[2];
  console.log('Div ID:', divId, 'Encoded length:', encodedContent.length);
  
  // Step 7: Fetch decoder script
  const scriptMatch = prorcpHtml.match(/sV05kUlNvOdOxvtC\/([a-f0-9]+)\.js/);
  if (!scriptMatch) throw new Error('No decoder script found');
  const scriptHash = scriptMatch[1];
  const scriptUrl = `https://cloudnestra.com/sV05kUlNvOdOxvtC/${scriptHash}.js?_=${Date.now()}`;
  console.log('Fetching decoder script...');
  const scriptResponse = await fetchWithHeaders(scriptUrl, 'https://cloudnestra.com/');
  const decoderScript = await scriptResponse.text();
  console.log('Decoder script length:', decoderScript.length);
  
  // Now test in VM
  console.log('\n--- Testing in VM ---\n');
  
  const isolatedContext: Record<string, unknown> = {};
  vm.createContext(isolatedContext);
  
  // Bootstrap
  vm.runInContext(`
    this.String = String;
    this.Number = Number;
    this.Boolean = Boolean;
    this.Array = Array;
    this.Object = Object;
    this.Function = Function;
    this.Math = Math;
    this.Date = Date;
    this.RegExp = RegExp;
    this.JSON = JSON;
    this.Error = Error;
    this.TypeError = TypeError;
    this.RangeError = RangeError;
    this.SyntaxError = SyntaxError;
    this.parseInt = parseInt;
    this.parseFloat = parseFloat;
    this.isNaN = isNaN;
    this.isFinite = isFinite;
    this.encodeURIComponent = encodeURIComponent;
    this.decodeURIComponent = decodeURIComponent;
    this.encodeURI = encodeURI;
    this.decodeURI = decodeURI;
    this.escape = escape;
    this.unescape = unescape;
    this.Infinity = Infinity;
    this.NaN = NaN;
    this.undefined = undefined;
  `, isolatedContext);
  
  const mockWindow: Record<string, unknown> = {};
  const mockDocument = {
    getElementById: (id: string) => {
      if (id === divId) {
        return { innerHTML: encodedContent };
      }
      return null;
    }
  };
  
  isolatedContext.window = mockWindow;
  isolatedContext.document = mockDocument;
  isolatedContext.atob = (s: string) => Buffer.from(s, 'base64').toString('binary');
  isolatedContext.btoa = (s: string) => Buffer.from(s, 'binary').toString('base64');
  isolatedContext.setTimeout = (fn: () => void) => { if (typeof fn === 'function') fn(); };
  isolatedContext.setInterval = () => {};
  isolatedContext.clearTimeout = () => {};
  isolatedContext.clearInterval = () => {};
  isolatedContext.console = { log: () => {}, error: () => {}, warn: () => {}, info: () => {} };
  
  // Block dangerous
  isolatedContext.fetch = undefined;
  isolatedContext.XMLHttpRequest = undefined;
  isolatedContext.WebSocket = undefined;
  isolatedContext.require = undefined;
  isolatedContext.process = undefined;
  isolatedContext.Buffer = undefined;
  
  try {
    console.log('Running decoder in VM...');
    
    // Try runInNewContext instead - it should auto-populate built-ins
    const simpleContext = {
      window: mockWindow,
      document: mockDocument,
      atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
      btoa: (s: string) => Buffer.from(s, 'binary').toString('base64'),
      setTimeout: (fn: () => void) => { if (typeof fn === 'function') fn(); },
      setInterval: () => {},
      clearTimeout: () => {},
      clearInterval: () => {},
      console: { log: () => {}, error: () => {}, warn: () => {}, info: () => {} },
      // Block dangerous
      fetch: undefined,
      XMLHttpRequest: undefined,
      WebSocket: undefined,
      require: undefined,
      process: undefined,
      Buffer: undefined,
    };
    
    vm.runInNewContext(decoderScript, simpleContext, { timeout: 5000 });
    
    console.log('\nResults:');
    console.log('mockWindow keys:', Object.keys(mockWindow));
    console.log('mockWindow[divId]:', mockWindow[divId]);
    
    if (mockWindow[divId]) {
      console.log('\n✅ SUCCESS! Decoded URL:', mockWindow[divId]);
    } else {
      console.log('\n❌ FAILED - No result in mockWindow');
      // Check if it's in the context directly
      console.log('Context keys:', Object.keys(isolatedContext).filter(k => !['String','Number','Boolean','Array','Object','Function','Math','Date','RegExp','JSON','Error','TypeError','RangeError','SyntaxError','parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent','encodeURI','decodeURI','escape','unescape','Infinity','NaN','undefined','window','document','atob','btoa','setTimeout','setInterval','clearTimeout','clearInterval','console','fetch','XMLHttpRequest','WebSocket','require','process','Buffer'].includes(k)));
    }
  } catch (error) {
    console.error('VM Error:', error);
  }
}

testRealDecoder().catch(console.error);
