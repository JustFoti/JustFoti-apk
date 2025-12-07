/**
 * FORTRESS CLIENT - Bulletproof Stream Protection
 * 
 * This client handles:
 * 1. Session initialization with the proxy
 * 2. Proof-of-work solving (runs in Web Worker for performance)
 * 3. Request chaining (each request references the previous)
 * 4. Automatic token generation for each stream request
 * 
 * Leechers would need to:
 * - Run this JavaScript (which only works on your domain due to CORS on /init)
 * - Solve PoW puzzles (costs CPU time)
 * - Maintain request chains (can't parallelize)
 * - Match your IP (impossible if proxying)
 */

interface FortressSession {
  sessionId: string;
  challenge: string;
  difficulty: number;
  chainHash: string;
  expiresAt: number;
}

interface ProxyToken {
  s: string;   // Session ID
  t: number;   // Timestamp
  u: string;   // URL hash
  c: string;   // Chain hash
  p: string;   // Proof of work solution
  n: number;   // Nonce
}

const PROXY_BASE_URL = process.env.NEXT_PUBLIC_FORTRESS_PROXY_URL || 'https://media-proxy.vynx.workers.dev';

let currentSession: FortressSession | null = null;
let powWorker: Worker | null = null;

/**
 * Initialize a fortress session
 */
export async function initFortressSession(): Promise<FortressSession> {
  const response = await fetch(`${PROXY_BASE_URL}/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Session init failed: ${response.status}`);
  }

  const data = await response.json();
  
  currentSession = {
    sessionId: data.sessionId,
    challenge: data.challenge,
    difficulty: data.difficulty,
    chainHash: data.chainHash,
    expiresAt: Date.now() + (data.expiresIn * 1000),
  };

  return currentSession;
}

/**
 * Get a new challenge (after each request)
 */
async function refreshChallenge(): Promise<void> {
  if (!currentSession) {
    await initFortressSession();
    return;
  }

  const response = await fetch(`${PROXY_BASE_URL}/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: currentSession.sessionId,
      lastChainHash: currentSession.chainHash,
    }),
  });

  if (!response.ok) {
    // Session invalid, reinitialize
    currentSession = null;
    await initFortressSession();
    return;
  }

  const data = await response.json();
  currentSession.challenge = data.challenge;
  currentSession.difficulty = data.difficulty;
  currentSession.chainHash = data.chainHash;
}

/**
 * Solve proof of work puzzle
 * This is intentionally CPU-intensive to prevent mass leeching
 */
async function solveProofOfWork(challenge: string, difficulty: number): Promise<{ solution: string; nonce: number }> {
  const requiredPrefix = '0'.repeat(difficulty);
  let nonce = 0;
  
  // Use Web Worker if available for better performance
  if (typeof Worker !== 'undefined' && !powWorker) {
    try {
      powWorker = createPowWorker();
    } catch {
      // Fall back to main thread
    }
  }

  if (powWorker) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PoW timeout'));
      }, 30000);

      powWorker!.onmessage = (e) => {
        clearTimeout(timeout);
        resolve(e.data);
      };

      powWorker!.postMessage({ challenge, difficulty });
    });
  }

  // Main thread fallback
  while (true) {
    const hash = await hashString(challenge + nonce);
    if (hash.startsWith(requiredPrefix)) {
      return { solution: hash, nonce };
    }
    nonce++;
    
    // Yield to prevent blocking
    if (nonce % 1000 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
    
    // Safety limit
    if (nonce > 10000000) {
      throw new Error('PoW failed - too many attempts');
    }
  }
}

/**
 * Create a Web Worker for PoW solving
 */
function createPowWorker(): Worker {
  const workerCode = `
    async function hashString(str) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    self.onmessage = async (e) => {
      const { challenge, difficulty } = e.data;
      const requiredPrefix = '0'.repeat(difficulty);
      let nonce = 0;
      
      while (true) {
        const hash = await hashString(challenge + nonce);
        if (hash.startsWith(requiredPrefix)) {
          self.postMessage({ solution: hash, nonce });
          return;
        }
        nonce++;
        
        if (nonce > 10000000) {
          self.postMessage({ error: 'Failed' });
          return;
        }
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

/**
 * Hash a string using SHA-256
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a secure proxy URL for a stream
 */
export async function getFortressStreamUrl(originalUrl: string): Promise<string> {
  // Ensure we have a session
  if (!currentSession || Date.now() > currentSession.expiresAt) {
    await initFortressSession();
  }

  if (!currentSession) {
    throw new Error('Failed to initialize session');
  }

  // Solve proof of work
  const { nonce } = await solveProofOfWork(
    currentSession.challenge,
    currentSession.difficulty
  );

  // Create token
  const urlHash = (await hashString(originalUrl)).substring(0, 16);
  
  const token: ProxyToken = {
    s: currentSession.sessionId,
    t: Date.now(),
    u: urlHash,
    c: currentSession.chainHash,
    p: '', // Not needed in token, server recalculates
    n: nonce,
  };

  const tokenStr = btoa(JSON.stringify(token));

  // Build URL
  const proxyUrl = `${PROXY_BASE_URL}/?url=${encodeURIComponent(originalUrl)}&token=${tokenStr}`;

  return proxyUrl;
}

/**
 * Fetch a stream through the fortress proxy
 * Handles chain hash updates automatically
 */
export async function fetchFortressStream(originalUrl: string): Promise<Response> {
  const proxyUrl = await getFortressStreamUrl(originalUrl);
  
  const response = await fetch(proxyUrl);
  
  // Update chain hash from response
  const newChainHash = response.headers.get('X-Chain-Hash');
  if (newChainHash && currentSession) {
    currentSession.chainHash = newChainHash;
    // Get new challenge for next request
    await refreshChallenge();
  }

  return response;
}

/**
 * Create an HLS.js compatible loader that uses fortress protection
 */
export function createFortressLoader() {
  return class FortressLoader {
    async load(
      context: { url: string },
      _config: unknown,
      callbacks: {
        onSuccess: (response: { data: ArrayBuffer; url: string }, stats: object, context: object) => void;
        onError: (error: { code: number; text: string }, context: object, response: null) => void;
      }
    ) {
      try {
        const response = await fetchFortressStream(context.url);
        
        if (!response.ok) {
          callbacks.onError(
            { code: response.status, text: response.statusText },
            context,
            null
          );
          return;
        }

        const data = await response.arrayBuffer();
        
        callbacks.onSuccess(
          { data, url: context.url },
          { trequest: performance.now(), tfirst: performance.now(), tload: performance.now() },
          context
        );
      } catch (error) {
        callbacks.onError(
          { code: 0, text: error instanceof Error ? error.message : 'Unknown error' },
          context,
          null
        );
      }
    }

    abort() {
      // Can't abort fetch, but we can ignore the result
    }

    destroy() {
      // Cleanup
    }
  };
}

/**
 * React hook for fortress-protected streams
 */
export function useFortressStream() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initFortressSession()
      .then(() => setIsReady(true))
      .catch(e => setError(e.message));
  }, []);

  return {
    isReady,
    error,
    getStreamUrl: getFortressStreamUrl,
    fetchStream: fetchFortressStream,
    createLoader: createFortressLoader,
  };
}

// Need to import these for the hook
import { useState, useEffect } from 'react';
