/**
 * DEEP ANALYSIS - NEW Format Reverse Engineering
 * 
 * This script uses Puppeteer to load the NEW format sample page,
 * intercepts the decoder execution, and extracts the EXACT algorithm
 * used to decode the content.
 */

import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function analyzeNewFormat() {
  console.log('='.repeat(80));
  console.log('DEEP ANALYSIS - NEW Format Reverse Engineering');
  console.log('='.repeat(80));
  console.log();

  const browser = await puppeteer.launch({
    headless: false, // Show browser to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true // Open devtools automatically
  });

  try {
    const page = await browser.newPage();

    // Intercept console logs
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text });
      console.log(`[Browser Console ${msg.type()}]:`, text);
    });

    // Capture all function calls and variable assignments
    await page.evaluateOnNewDocument(() => {
      window.decoderTrace = [];
      
      // Intercept XOR operations
      const originalCharCodeAt = String.prototype.charCodeAt;
      String.prototype.charCodeAt = function(...args) {
        const result = originalCharCodeAt.apply(this, args);
        if (window.trackingXOR) {
          window.decoderTrace.push({
            type: 'charCodeAt',
            string: this.substring(0, 50),
            index: args[0],
            result
          });
        }
        return result;
      };

      // Intercept fromCharCode
      const originalFromCharCode = String.fromCharCode;
      String.fromCharCode = function(...args) {
        const result = originalFromCharCode.apply(String, args);
        if (window.trackingXOR) {
          window.decoderTrace.push({
            type: 'fromCharCode',
            codes: args,
            result
          });
        }
        return result;
      };
    });

    // Load the NEW format sample page - use live URL
    const liveUrl = 'https://cloudnestra.com/prorcp/ODBlOWZkMGU5NmEwYTIy';
    console.log('Loading live page:', liveUrl);
    
    await page.goto(liveUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Page loaded, waiting for decoder to execute...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract all the decoder information
    const analysis = await page.evaluate(() => {
      const results = {
        hiddenDivs: [],
        decoderFunctions: [],
        xorKeys: [],
        decodedValues: [],
        windowVars: {},
        playerJsCode: null,
        decoderTrace: window.decoderTrace || []
      };

      // Find all hidden divs
      const divs = document.querySelectorAll('div[style*="display:none"], div[style*="display: none"]');
      divs.forEach(div => {
        if (div.textContent.length > 50) {
          results.hiddenDivs.push({
            id: div.id,
            dataI: div.getAttribute('data-i'),
            content: div.textContent.substring(0, 200) + '...',
            fullLength: div.textContent.length
          });
        }
      });

      // Look for decoder functions in window
      for (const key of Object.keys(window)) {
        const value = window[key];
        if (typeof value === 'function') {
          const funcStr = value.toString();
          if (funcStr.includes('charCodeAt') || funcStr.includes('fromCharCode') || 
              funcStr.includes('XOR') || funcStr.includes('decode')) {
            results.decoderFunctions.push({
              name: key,
              code: funcStr.substring(0, 500)
            });
          }
        }
      }

      // Look for XOR keys or decoder variables
      for (const key of Object.keys(window)) {
        const value = window[key];
        if (typeof value === 'string' && value.length < 100) {
          if (key.toLowerCase().includes('key') || 
              key.toLowerCase().includes('decode') ||
              key.toLowerCase().includes('xor')) {
            results.xorKeys.push({ name: key, value });
          }
        }
      }

      // Check for decoded values
      for (const key of Object.keys(window)) {
        const value = window[key];
        if (typeof value === 'string' && (value.includes('http') || value.includes('.m3u8'))) {
          results.decodedValues.push({ name: key, value });
        }
      }

      // Get Playerjs object if it exists
      if (window.Playerjs) {
        results.playerJsCode = window.Playerjs.toString().substring(0, 1000);
      }

      // Store important window variables
      const importantVars = ['ux8qjPHC66', 'player', 'file'];
      for (const varName of importantVars) {
        if (window[varName]) {
          results.windowVars[varName] = typeof window[varName] === 'string' 
            ? window[varName].substring(0, 200)
            : typeof window[varName];
        }
      }

      return results;
    });

    console.log();
    console.log('='.repeat(80));
    console.log('ANALYSIS RESULTS');
    console.log('='.repeat(80));
    console.log();

    console.log('Hidden Divs Found:', analysis.hiddenDivs.length);
    analysis.hiddenDivs.forEach(div => {
      console.log(`  - ID: ${div.id}, Length: ${div.fullLength}, data-i: ${div.dataI}`);
      console.log(`    Content: ${div.content}`);
    });
    console.log();

    console.log('Decoder Functions Found:', analysis.decoderFunctions.length);
    analysis.decoderFunctions.forEach(func => {
      console.log(`  - ${func.name}:`);
      console.log(`    ${func.code}`);
    });
    console.log();

    console.log('XOR Keys Found:', analysis.xorKeys.length);
    analysis.xorKeys.forEach(key => {
      console.log(`  - ${key.name}: ${key.value}`);
    });
    console.log();

    console.log('Decoded Values Found:', analysis.decodedValues.length);
    analysis.decodedValues.forEach(val => {
      console.log(`  - ${val.name}: ${val.value}`);
    });
    console.log();

    console.log('Window Variables:');
    for (const [key, value] of Object.entries(analysis.windowVars)) {
      console.log(`  - ${key}: ${value}`);
    }
    console.log();

    console.log('Decoder Trace Events:', analysis.decoderTrace.length);
    if (analysis.decoderTrace.length > 0) {
      console.log('First 10 trace events:');
      analysis.decoderTrace.slice(0, 10).forEach((trace, i) => {
        console.log(`  ${i + 1}.`, JSON.stringify(trace));
      });
    }
    console.log();

    // Now let's manually trigger the decoder and watch it
    console.log('='.repeat(80));
    console.log('MANUAL DECODER EXECUTION');
    console.log('='.repeat(80));
    console.log();

    const manualDecode = await page.evaluate(() => {
      // Get the hidden div content
      const div = document.getElementById('ux8qjPHC66');
      if (!div) return { error: 'Div not found' };

      const encodedContent = div.textContent;
      
      // Enable tracking
      window.trackingXOR = true;
      window.decoderTrace = [];

      // Try to find and call the decoder
      let decoded = null;
      
      // Check if there's a global decoder function
      if (typeof window.decode === 'function') {
        decoded = window.decode(encodedContent);
      } else if (typeof window.ux8qjPHC66 === 'string') {
        decoded = window.ux8qjPHC66;
      }

      return {
        encodedLength: encodedContent.length,
        encodedPreview: encodedContent.substring(0, 100),
        decoded: decoded ? decoded.substring(0, 500) : null,
        decoderTrace: window.decoderTrace.slice(0, 50)
      };
    });

    console.log('Manual Decode Results:');
    console.log('  Encoded Length:', manualDecode.encodedLength);
    console.log('  Encoded Preview:', manualDecode.encodedPreview);
    console.log('  Decoded:', manualDecode.decoded);
    console.log('  Trace Events:', manualDecode.decoderTrace?.length || 0);
    console.log();

    // Keep browser open for manual inspection
    console.log('='.repeat(80));
    console.log('Browser will stay open for 60 seconds for manual inspection...');
    console.log('Check the DevTools to see the decoder in action!');
    console.log('='.repeat(80));
    
    await new Promise(resolve => setTimeout(resolve, 60000));

  } finally {
    await browser.close();
  }
}

analyzeNewFormat().catch(console.error);
