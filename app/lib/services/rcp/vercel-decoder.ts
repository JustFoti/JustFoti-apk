/**
 * Vercel-Compatible Self-Hosted Decoder
 * Fallback to old working method from test file
 */

import { readFileSync } from 'fs';
import { join } from 'path';

let DECODER_SCRIPT: string | null = null;

/**
 * Load the decoder script from deployed file
 */
function loadDecoderScript(): string {
  if (!DECODER_SCRIPT) {
    const decoderPath = join(process.cwd(), 'decoder-obfuscated.js');
    DECODER_SCRIPT = readFileSync(decoderPath, 'utf8');
    console.log('[Vercel Decoder] Loaded decoder script');
  }
  return DECODER_SCRIPT;
}

/**
 * Decode hidden div content using self-hosted decoder
 * Uses the working method from test-self-hosted-node.js
 * @param divContent - Encoded content from hidden div
 * @param dataI - data-i attribute value
 * @param divId - ID of the hidden div
 * @returns Decoded M3U8 URL
 */
export async function decode(
  divContent: string,
  dataI: string,
  divId: string
): Promise<string> {
  try {
    const decoderScript = loadDecoderScript();

    // Import JSDOM dynamically to avoid bundling issues
    const { JSDOM } = await import('jsdom');
    const vm = await import('vm');

    // Create DOM with just the body content
    const dom = new JSDOM(
      `<!DOCTYPE html><html><head></head><body data-i="${dataI}"><div id="${divId}" style="display:none;">${divContent}</div></body></html>`,
      {
        url: 'https://cloudnestra.com/prorcp/local',
        runScripts: 'outside-only'
      }
    );

    // Suppress console
    dom.window.console.log = () => {};
    dom.window.console.error = () => {};
    dom.window.console.warn = () => {};
    dom.window.console.info = () => {};
    dom.window.console.debug = () => {};

    // Execute decoder in the window context using eval (works in Next.js)
    try {
      // Create a function that executes in the window's context
      const script = `
        (function() {
          ${decoderScript}
        })();
      `;
      
      // Execute using the window's eval
      dom.window.eval(script);
    } catch (vmError) {
      console.log('[Vercel Decoder] VM method failed, trying direct eval');
      // Fallback: execute directly
      const func = new Function('window', 'document', decoderScript);
      func(dom.window, dom.window.document);
    }

    // Wait for decoder to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    // Extract result from window
    const result = (dom.window as any)[divId];

    if (result && typeof result === 'string') {
      console.log('[Vercel Decoder] Successfully decoded');
      return result;
    }

    throw new Error('No decoded value found in window object');
  } catch (error) {
    console.error('[Vercel Decoder] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Decoder failed: ${errorMessage}`);
  }
}
