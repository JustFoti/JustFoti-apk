/**
 * FULL PUPPETEER EXTRACTOR WITH STEALTH
 * 
 * Uses Puppeteer-Extra with Stealth plugin to bypass Cloudflare
 * Intercepts network requests to capture M3U8 URLs
 * 
 * Flow:
 * 1. Navigate to vidsrc-embed.ru with stealth
 * 2. Intercept ALL network requests for M3U8 files
 * 3. Click play button if needed
 * 4. Capture M3U8 URL from network traffic
 */

let browserInstance: any = null;

/**
 * Get or create browser instance with STEALTH
 * Creates a NEW browser for each request to avoid conflicts
 */
async function getBrowser() {
  // ALWAYS create a new browser instance to avoid concurrent request conflicts
  console.log('[Stealth Puppeteer] Launching NEW browser with stealth mode');

  const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  let newBrowser;
  
  if (isProduction) {
    const chromium = await import('@sparticuz/chromium');
    const puppeteerExtra = await import('puppeteer-extra');
    const StealthPlugin = await import('puppeteer-extra-plugin-stealth');
    
    puppeteerExtra.default.use(StealthPlugin.default());
    
    newBrowser = await puppeteerExtra.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    const puppeteerExtra = await import('puppeteer-extra');
    const StealthPlugin = await import('puppeteer-extra-plugin-stealth');
    
    puppeteerExtra.default.use(StealthPlugin.default());
    
    newBrowser = await puppeteerExtra.default.launch({
      headless: false, // HEADFUL MODE for local dev to bypass detection
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--start-maximized',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation']
    });
  }

  return newBrowser;
}

/**
 * Extract M3U8 URL using stealth Puppeteer with network interception
 */
export async function extractWithFullPuppeteer(
  tmdbId: string,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<string> {
  const browser = await getBrowser();
  
  // Create new page with error handling
  let page;
  try {
    page = await browser.newPage();
  } catch (error) {
    console.error('[Stealth Puppeteer] Failed to create new page:', error);
    // Reset browser instance and try again
    browserInstance = null;
    const newBrowser = await getBrowser();
    page = await newBrowser.newPage();
  }

  // Array to capture M3U8 URLs from network requests
  const capturedUrls: string[] = [];

  try {
    // AGGRESSIVE ANTI-DETECTION: Override navigator properties
    await page.evaluateOnNewDocument(() => {
      // Override the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Override the plugins property
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override the languages property
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Add chrome object
      (window as any).chrome = {
        runtime: {},
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters);
    });

    // Enable request interception to capture M3U8 URLs
    await page.setRequestInterception(true);
    
    page.on('request', (request: any) => {
      try {
        const url = request.url();
        
        // Capture any M3U8 or playlist URLs
        if (url.includes('.m3u8') || url.includes('/pl/') || url.includes('master') || url.includes('playlist')) {
          console.log('[Stealth Puppeteer] Captured M3U8 URL:', url.substring(0, 100));
          capturedUrls.push(url);
        }
        
        request.continue();
      } catch (error) {
        // Request might already be handled - this is normal
      }
    });

    // Also listen to responses
    page.on('response', async (response: any) => {
      const url = response.url();
      
      if (url.includes('.m3u8') || url.includes('/pl/')) {
        console.log('[Stealth Puppeteer] M3U8 response:', url.substring(0, 100));
        if (!capturedUrls.includes(url)) {
          capturedUrls.push(url);
        }
      }
    });

    // Set realistic headers with more details
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    });

    // Navigate to embed page
    const embedUrl = type === 'movie'
      ? `https://vidsrc-embed.ru/embed/movie/${tmdbId}`
      : `https://vidsrc-embed.ru/embed/tv/${tmdbId}/${season}/${episode}`;

    console.log('[Stealth Puppeteer] Navigating to:', embedUrl);
    
    await page.goto(embedUrl, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('[Stealth Puppeteer] Page loaded');
    const pageTitle = await page.title();
    const initialHtml = await page.content();
    console.log('[Stealth Puppeteer] Page title:', pageTitle);
    console.log('[Stealth Puppeteer] Page HTML length:', initialHtml.length);

    // Check if we got blocked by Cloudflare
    if (initialHtml.length < 1000 || pageTitle.includes('Just a moment') || initialHtml.includes('cf-browser-verification')) {
      console.error('[Stealth Puppeteer] CLOUDFLARE DETECTED - Page is challenge page');
      throw new Error('Cloudflare challenge detected. The site is blocking automated access. Try again in a few minutes.');
    }

    // Wait for page to fully load and JavaScript to execute
    console.log('[Stealth Puppeteer] Waiting for page scripts to execute...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to find and click play button
    console.log('[Stealth Puppeteer] Looking for play button...');
    try {
      const playButton = await page.$('button[class*="play"], button[aria-label*="play"], .play-button, #play-button, [class*="Player"] button');
      if (playButton) {
        console.log('[Stealth Puppeteer] Found play button, clicking...');
        await playButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.log('[Stealth Puppeteer] No play button found or click failed');
    }

    // Try clicking on video/iframe
    try {
      const video = await page.$('video, iframe');
      if (video) {
        console.log('[Stealth Puppeteer] Found video element, clicking...');
        await video.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.log('[Stealth Puppeteer] No video element found');
    }

    // Wait for M3U8 URLs to be captured
    console.log('[Stealth Puppeteer] Waiting for M3U8 URLs...');
    const maxWait = 15000; // 15 seconds
    const startTime = Date.now();
    
    while (capturedUrls.length === 0 && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (capturedUrls.length > 0) {
      console.log('[Stealth Puppeteer] Captured', capturedUrls.length, 'M3U8 URLs');
      // Return the first captured URL (usually the master playlist)
      return capturedUrls[0];
    }

    // If no M3U8 captured from network, fail
    const pageHtml = await page.content();
    if (pageHtml.length < 100) {
      throw new Error('Stream source blocked by anti-bot protection. Page is empty.');
    }
    
    throw new Error('No M3U8 stream found. The page loaded but no video stream was detected.');

  } finally {
    try {
      await page.close();
      // Close the browser instance immediately after use
      await browser.close();
      console.log('[Stealth Puppeteer] Browser and page closed');
    } catch (error) {
      console.error('[Stealth Puppeteer] Error closing browser:', error);
    }
  }
}

/**
 * Close browser instance
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log('[Full Puppeteer] Browser closed');
  }
}
