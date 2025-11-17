/**
 * Puppeteer-Based Decoder for Vercel
 * Uses @sparticuz/chromium for serverless, regular puppeteer for local
 * 
 * This decoder creates a minimal page, injects the hidden div,
 * then executes the decoder script.
 */

// No imports needed for file system operations

let browserInstance: any = null;

/**
 * Get or create browser instance
 * Uses different configuration for local vs production
 */
async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  console.log('[Puppeteer Decoder] Launching browser');

  // Check if we're in production (Vercel)
  const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isProduction) {
    // Production: Use @sparticuz/chromium
    const chromium = await import('@sparticuz/chromium');
    const puppeteerCore = await import('puppeteer-core');
    
    browserInstance = await puppeteerCore.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    // Local development: Use regular puppeteer
    const puppeteer = await import('puppeteer');
    
    browserInstance = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  return browserInstance;
}

/**
 * Decode hidden div content using Puppeteer
 * 
 * IMPORTANT: This function needs the ProRCP hash to navigate to the actual page
 * where the decoder script runs. The decoder script is NOT included locally.
 * 
 * @param divContent - Encoded content from hidden div (not used in this approach)
 * @param dataI - data-i attribute value (not used in this approach)
 * @param divId - ID of the hidden div
 * @param proRcpHash - ProRCP hash to navigate to the actual page
 * @returns Decoded M3U8 URL
 */
export async function decode(
  _divContent: string,
  _dataI: string,
  divId: string,
  proRcpHash?: string
): Promise<string> {
  if (!proRcpHash) {
    throw new Error('ProRCP hash is required for Puppeteer decoder');
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Navigate to the actual ProRCP page instead of creating a minimal page
    const proRcpUrl = `https://cloudnestra.com/prorcp/${proRcpHash}`;
    console.log('[Puppeteer Decoder] Navigating to ProRCP page');
    
    await page.goto(proRcpUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('[Puppeteer Decoder] Page loaded, waiting for decoder to execute');
    
    // Poll for the decoded value with timeout
    console.log('[Puppeteer Decoder] Waiting for decoder to process...');
    const maxAttempts = 20; // 10 seconds total (20 * 500ms)
    let result: string | null = null;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      result = await page.evaluate((divId: string) => {
        // Check window[divId]
        if ((window as any)[divId]) {
          return (window as any)[divId];
        }
        
        // Check for any property that looks like an M3U8 URL
        for (const key in window) {
          try {
            const value = (window as any)[key];
            if (typeof value === 'string' && (value.includes('.m3u8') || value.includes('/pl/'))) {
              return value;
            }
          } catch (e) {
            // Skip properties that throw errors
          }
        }
        
        return null;
      }, divId);
      
      if (result && typeof result === 'string') {
        console.log(`[Puppeteer Decoder] Found decoded value after ${attempt * 500}ms`);
        break;
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (result && typeof result === 'string') {
      console.log('[Puppeteer Decoder] Successfully decoded, checking if URL needs decoding');
      
      // Check if the result is URL-encoded (contains % characters)
      if (result.includes('%')) {
        try {
          const decoded = decodeURIComponent(result);
          console.log('[Puppeteer Decoder] URL decoded result');
          
          // Validate it looks like an M3U8 URL after decoding
          if (decoded.includes('.m3u8') || decoded.includes('/pl/')) {
            return decoded;
          }
        } catch (e) {
          console.log('[Puppeteer Decoder] URL decode failed, using original');
        }
      }
      
      return result;
    }

    // If we still don't have a result, do a final comprehensive check
    console.log('[Puppeteer Decoder] Final comprehensive check...');
    const finalCheck = await page.evaluate((divId: string) => {
      const windowKeys = Object.keys(window).filter(k => {
        try {
          const val = (window as any)[k];
          return typeof val === 'string' && val.length > 50;
        } catch {
          return false;
        }
      });
      
      return {
        divIdExists: divId in window,
        divIdValue: (window as any)[divId],
        divIdType: typeof (window as any)[divId],
        relevantKeys: windowKeys.slice(0, 10),
        divElement: !!document.getElementById(divId),
        bodyDataI: document.body.getAttribute('data-i')
      };
    }, divId);
    
    console.log('[Puppeteer Decoder] Final check result:', JSON.stringify(finalCheck, null, 2));
    throw new Error('No decoded value found in window object after polling');
  } catch (error) {
    console.error('[Puppeteer Decoder] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Decoder failed: ${errorMessage}`);
  } finally {
    await page.close();
  }
}

/**
 * Close browser instance (call this on shutdown)
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log('[Puppeteer Decoder] Browser closed');
  }
}
