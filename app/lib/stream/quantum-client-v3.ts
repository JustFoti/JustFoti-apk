/**
 * QUANTUM SHIELD V3 CLIENT - PARANOID MODE
 * 
 * This client must:
 * 1. Submit fingerprint
 * 2. Pass 3 different challenges
 * 3. Complete proof-of-work
 * 4. Collect and submit behavioral data
 * 5. Generate time-limited tokens for each request
 */

'use client';

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:8787';

interface SessionStatus {
  hasFingerprint: boolean;
  challengesPassed: number;
  challengesRequired: number;
  powCompleted: boolean;
  mouseEntropy: number;
  entropyRequired: number;
  behavioralSamples: number;
  samplesRequired: number;
  trustScore: number;
  trustRequired: number;
  violations: number;
  maxViolations: number;
  canAccessStream: boolean;
}

interface Challenge {
  id: string;
  type: 'canvas_precise' | 'audio_fingerprint' | 'webgl_compute' | 'pow_hash' | 'timing_proof';
  params: Record<string, unknown>;
  nonce: string;
  expiresAt: number;
}

interface Session {
  sessionId: string;
  status: SessionStatus;
  challenge: Challenge | null;
}

import { 
  getBehavioralData, 
  initGlobalBehavioralTracking 
} from '@/lib/utils/global-behavioral-tracker';

let currentSession: Session | null = null;

// Auto-initialize global tracking when module loads (client-side only)
if (typeof window !== 'undefined') {
  initGlobalBehavioralTracking();
}

/**
 * Collect browser fingerprint
 */
async function collectFingerprint(): Promise<Record<string, unknown>> {
  // Canvas fingerprint
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 50;
  const ctx = canvas.getContext('2d');
  let canvasFp = '';
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Quantum Shield V3', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Paranoid Mode', 4, 17);
    canvasFp = canvas.toDataURL();
  }

  // WebGL fingerprint
  let webglFp = '';
  const glCanvas = document.createElement('canvas');
  const gl = glCanvas.getContext('webgl');
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      webglFp = `${gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)}|${gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`;
    }
  }

  // Audio fingerprint
  let audioFp = 0;
  try {
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const analyser = audioCtx.createAnalyser();
    const gain = audioCtx.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.value = 10000;
    gain.gain.value = 0;
    
    oscillator.connect(analyser);
    analyser.connect(gain);
    gain.connect(audioCtx.destination);
    
    oscillator.start(0);
    
    const dataArray = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(dataArray);
    audioFp = dataArray.reduce((a, b) => a + b, 0);
    
    oscillator.stop();
    audioCtx.close();
  } catch {}

  // Font detection
  const testFonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Comic Sans MS'];
  const detectedFonts: string[] = [];
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  
  const span = document.createElement('span');
  span.style.position = 'absolute';
  span.style.left = '-9999px';
  span.style.fontSize = testSize;
  span.innerText = testString;
  document.body.appendChild(span);

  const baseWidths: Record<string, number> = {};
  baseFonts.forEach(font => {
    span.style.fontFamily = font;
    baseWidths[font] = span.offsetWidth;
  });

  testFonts.forEach(font => {
    let detected = false;
    baseFonts.forEach(baseFont => {
      span.style.fontFamily = `'${font}', ${baseFont}`;
      if (span.offsetWidth !== baseWidths[baseFont]) {
        detected = true;
      }
    });
    if (detected) detectedFonts.push(font);
  });

  document.body.removeChild(span);

  return {
    canvas: canvasFp,
    webgl: webglFp,
    audio: audioFp,
    fonts: detectedFonts,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || 0,
  };
}

// No rate limit delays during initialization - only on stream requests

/**
 * Initialize session with Quantum Shield V3
 */
export async function initQuantumSessionV3(): Promise<Session> {
  console.log('[QSv3] Initializing session...');

  // Ensure global behavioral tracking is running
  initGlobalBehavioralTracking();
  
  // Log current behavioral data status
  const currentData = getBehavioralData();
  console.log(`[QSv3] Current behavioral data: ${currentData.mouseSamples} mouse samples, entropy: ${currentData.mouseEntropy.toFixed(3)}`);

  // Initialize session
  const initResponse = await fetch(`${PROXY_URL}/v3/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!initResponse.ok) {
    throw new Error(`Init failed: ${initResponse.status}`);
  }

  const initData = await initResponse.json();
  currentSession = {
    sessionId: initData.sessionId,
    status: initData.status,
    challenge: initData.challenge,
  };

  console.log('[QSv3] Session created:', currentSession.sessionId);

  // Submit fingerprint immediately
  console.log('[QSv3] Collecting fingerprint...');
  const fingerprint = await collectFingerprint();

  const fpResponse = await fetch(`${PROXY_URL}/v3/fingerprint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: currentSession.sessionId,
      fingerprint,
    }),
  });

  if (!fpResponse.ok) {
    const error = await fpResponse.json();
    console.error('[QSv3] Fingerprint rejected:', error);
    throw new Error(`Fingerprint rejected: ${error.message}`);
  }

  const fpData = await fpResponse.json();
  currentSession.status = fpData.status;
  console.log('[QSv3] Fingerprint accepted');

  // Solve challenges (no delays)
  while (currentSession.challenge) {
    console.log('[QSv3] Solving challenge:', currentSession.challenge.type);
    await solveChallenge(currentSession.challenge);
  }

  // Complete proof of work
  if (!currentSession.status.powCompleted) {
    console.log('[QSv3] Starting proof of work...');
    await completeProofOfWork();
  }

  // Submit behavioral data
  console.log('[QSv3] Submitting behavioral data...');
  await submitBehavioralData();

  console.log('[QSv3] Session ready!');
  console.log('[QSv3] Final status:', currentSession.status);

  return currentSession;
}

/**
 * Solve a challenge
 */
async function solveChallenge(challenge: Challenge): Promise<void> {
  if (!currentSession) throw new Error('No session');

  const startTime = performance.now();
  let response: unknown;

  switch (challenge.type) {
    case 'canvas_precise':
      response = await solveCanvasPrecise(challenge.params);
      break;
    case 'audio_fingerprint':
      response = await solveAudioFingerprint(challenge.params);
      break;
    case 'webgl_compute':
      response = await solveWebGLCompute(challenge.params);
      break;
    case 'pow_hash':
      response = await solvePowHash(challenge.params);
      break;
    case 'timing_proof':
      response = await solveTimingProof(challenge.params);
      break;
  }

  const timing = performance.now() - startTime;

  // Compute proof hash
  const proofHash = await hashString(
    `${currentSession.sessionId}${challenge.id}${challenge.nonce}${JSON.stringify(response)}`
  );

  const result = await fetch(`${PROXY_URL}/v3/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: currentSession.sessionId,
      challengeId: challenge.id,
      response,
      timing,
      nonce: challenge.nonce,
      proofHash,
    }),
  });

  const data = await result.json();

  if (!result.ok) {
    console.error('[QSv3] Challenge failed:', data);
    if (data.newChallenge) {
      currentSession.challenge = data.newChallenge;
    }
    throw new Error(`Challenge failed: ${data.message}`);
  }

  currentSession.status = data.status;
  currentSession.challenge = data.nextChallenge || null;

  // Store PoW challenge info if provided (when all challenges are passed)
  if (data.powChallenge) {
    (currentSession as any).powChallenge = data.powChallenge;
    console.log('[QSv3] PoW challenge received:', data.powChallenge.challengeString.substring(0, 20) + '...');
  }

  console.log('[QSv3] Challenge passed! Trust:', currentSession.status.trustScore);
}

async function solveCanvasPrecise(params: Record<string, unknown>): Promise<{ dataUrl: string; dimensions: { width: number; height: number } }> {
  const width = params.width as number;
  const height = params.height as number;
  const operations = params.operations as Array<{ op: string; value?: string; args?: unknown[] }>;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');

  // Execute all operations immediately (no delays)
  for (const op of operations) {
    switch (op.op) {
      case 'fillStyle':
        ctx.fillStyle = op.value!;
        break;
      case 'fillRect':
        ctx.fillRect(...(op.args as [number, number, number, number]));
        break;
      case 'beginPath':
        ctx.beginPath();
        break;
      case 'arc':
        ctx.arc(...(op.args as [number, number, number, number, number]));
        break;
      case 'fill':
        ctx.fill();
        break;
      case 'font':
        ctx.font = op.value!;
        break;
      case 'fillText':
        ctx.fillText(...(op.args as [string, number, number]));
        break;
    }
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    dimensions: { width, height },
  };
}

async function solveAudioFingerprint(params: Record<string, unknown>): Promise<{ frequencyData: number[]; sampleRate: number }> {
  const frequencies = params.frequencies as number[];
  const duration = params.duration as number;
  const oscillatorType = params.oscillatorType as OscillatorType;

  const audioCtx = new AudioContext();
  const frequencyData: number[] = [];

  for (const freq of frequencies) {
    const oscillator = audioCtx.createOscillator();
    const analyser = audioCtx.createAnalyser();
    const gain = audioCtx.createGain();

    oscillator.type = oscillatorType;
    oscillator.frequency.value = freq;
    // SILENT: Set gain to 0 so no sound plays
    gain.gain.value = 0;

    oscillator.connect(analyser);
    analyser.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start();
    await new Promise((r) => setTimeout(r, duration));

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    frequencyData.push(dataArray.reduce((a, b) => a + b, 0));

    oscillator.stop();
  }

  const sampleRate = audioCtx.sampleRate;
  audioCtx.close();

  return { frequencyData, sampleRate };
}

async function solveWebGLCompute(params: Record<string, unknown>): Promise<{ compiled: boolean; timing: number; output: string }> {
  const vertexShader = params.vertexShader as string;
  const fragmentShader = params.fragmentShader as string;
  const iterations = params.iterations as number;

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return { compiled: false, timing: 0, output: 'no-webgl' };

  const startTime = performance.now();

  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) return { compiled: false, timing: 0, output: 'shader-creation-failed' };

  gl.shaderSource(vs, vertexShader);
  gl.shaderSource(fs, fragmentShader);
  gl.compileShader(vs);
  gl.compileShader(fs);

  const vsCompiled = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
  const fsCompiled = gl.getShaderParameter(fs, gl.COMPILE_STATUS);

  // Do actual work
  for (let i = 0; i < iterations; i++) {
    gl.getParameter(gl.VERSION);
  }

  const timing = performance.now() - startTime;

  return {
    compiled: vsCompiled && fsCompiled,
    timing,
    output: `v:${vsCompiled},f:${fsCompiled},i:${iterations}`,
  };
}

async function solvePowHash(params: Record<string, unknown>): Promise<{ nonce: number; hash: string }> {
  const prefix = params.prefix as string;
  const difficulty = params.difficulty as number;
  const requiredPrefix = '0'.repeat(difficulty);

  let nonce = 0;
  let hash = '';

  console.log(`[QSv3] Starting PoW with difficulty ${difficulty}...`);
  const startTime = performance.now();

  while (true) {
    hash = await hashString(`${prefix}:${nonce}`);
    if (hash.startsWith(requiredPrefix)) {
      break;
    }
    nonce++;
    
    // Log progress every 10000 iterations
    if (nonce % 10000 === 0) {
      console.log(`[QSv3] PoW progress: ${nonce} hashes...`);
    }
  }

  const elapsed = performance.now() - startTime;
  console.log(`[QSv3] PoW complete! Nonce: ${nonce}, Time: ${elapsed.toFixed(0)}ms`);

  return { nonce, hash };
}

async function solveTimingProof(params: Record<string, unknown>): Promise<{ timing: number; result: number }> {
  const operations = params.operations as number;
  
  const startTime = performance.now();
  let result = 0;
  
  for (let i = 0; i < operations; i++) {
    result += Math.sin(i) * Math.cos(i);
  }
  
  const timing = performance.now() - startTime;
  
  return { timing, result };
}

/**
 * Complete proof of work
 */
async function completeProofOfWork(): Promise<void> {
  if (!currentSession) throw new Error('No session');

  // Get the PoW challenge from the session (set when all challenges passed)
  let powChallenge = (currentSession as any).powChallenge;
  
  // If no PoW challenge stored, fetch status to get it
  if (!powChallenge) {
    console.log('[QSv3] No PoW challenge cached, fetching from status...');
    const statusResponse = await fetch(`${PROXY_URL}/v3/status?sid=${currentSession.sessionId}`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      if (statusData.powChallenge) {
        powChallenge = statusData.powChallenge;
        (currentSession as any).powChallenge = powChallenge;
      }
    }
  }

  if (!powChallenge) {
    console.warn('[QSv3] No PoW challenge available - skipping PoW');
    return;
  }

  const challengeString = powChallenge.challengeString;
  const difficulty = powChallenge.difficulty;

  console.log('[QSv3] Computing proof of work...');
  console.log(`[QSv3] Challenge: ${challengeString.substring(0, 30)}...`);
  console.log(`[QSv3] Difficulty: ${difficulty} leading zeros`);

  const requiredPrefix = '0'.repeat(difficulty);

  let nonce = 0;
  let hash = '';
  const startTime = performance.now();

  while (true) {
    hash = await hashString(`${challengeString}:${nonce}`);
    if (hash.startsWith(requiredPrefix)) {
      break;
    }
    nonce++;

    if (nonce % 10000 === 0) {
      console.log(`[QSv3] PoW: ${nonce} hashes...`);
    }

    // Safety limit
    if (nonce > 10000000) {
      throw new Error('PoW taking too long');
    }
  }

  console.log(`[QSv3] PoW found! Nonce: ${nonce}, Time: ${(performance.now() - startTime).toFixed(0)}ms`);
  console.log(`[QSv3] Hash: ${hash}`);

  const powResponse = await fetch(`${PROXY_URL}/v3/pow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: currentSession.sessionId,
      nonce,
      hash,
    }),
  });

  if (!powResponse.ok) {
    const error = await powResponse.json();
    console.error('[QSv3] PoW rejected:', error);
    // Don't throw - continue anyway
  } else {
    const data = await powResponse.json();
    currentSession.status = data.status;
    console.log('[QSv3] PoW accepted!');
  }
}

// No waiting for behavioral data - submit whatever we have

/**
 * Submit behavioral data from global tracker
 */
async function submitBehavioralData(): Promise<void> {
  if (!currentSession) throw new Error('No session');

  // Get data from global tracker (collected since page load!)
  const globalData = getBehavioralData();
  
  console.log(`[QSv3] Submitting behavioral data from global tracker:`);
  console.log(`  - Mouse samples: ${globalData.mouseSamples}`);
  console.log(`  - Scroll samples: ${globalData.scrollSamples}`);
  console.log(`  - Mouse entropy: ${globalData.mouseEntropy.toFixed(3)}`);

  const response = await fetch(`${PROXY_URL}/v3/behavioral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: currentSession.sessionId,
      mousePositions: globalData.mousePositions,
      scrollEvents: globalData.scrollEvents,
      keystrokes: globalData.keystrokeIntervals,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[QSv3] Behavioral data rejected:', error);
    // Don't throw - continue anyway
  } else {
    const data = await response.json();
    currentSession.status = data.status;
    console.log(`[QSv3] Behavioral data accepted. Server entropy: ${data.entropy?.toFixed(3)}`);
  }
}

/**
 * Get a secure stream URL with time-limited token
 */
export async function getQuantumStreamUrlV3(originalUrl: string): Promise<string> {
  if (!currentSession) {
    await initQuantumSessionV3();
  }
  if (!currentSession) throw new Error('Session not initialized');

  // Check if we can access streams
  if (!currentSession.status.canAccessStream) {
    throw new Error(`Cannot access stream: ${JSON.stringify(currentSession.status)}`);
  }

  const timestamp = Date.now();
  
  // Generate token (must match server algorithm)
  const token = await generateToken(currentSession.sessionId, originalUrl, timestamp);
  
  // Generate signature
  const signature = await generateSignature(currentSession.sessionId, originalUrl, timestamp);

  const params = new URLSearchParams({
    url: originalUrl,
    sid: currentSession.sessionId,
    token,
    ts: timestamp.toString(),
    sig: signature,
  });

  return `${PROXY_URL}/v3/stream?${params.toString()}`;
}

async function generateToken(sessionId: string, url: string, timestamp: number): Promise<string> {
  // This should match the server's token generation
  // In production, you'd use a shared secret or the server would provide the token
  const data = `${sessionId}:fp:${url}:${timestamp}:client-secret`;
  return (await hashString(data)).substring(0, 32);
}

async function generateSignature(sessionId: string, url: string, timestamp: number): Promise<string> {
  const data = `sig:${sessionId}:${url}:${timestamp}:client-secret`;
  return (await hashString(data)).substring(0, 16);
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetch stream through Quantum Shield V3
 */
export async function fetchQuantumStreamV3(originalUrl: string): Promise<Response> {
  const url = await getQuantumStreamUrlV3(originalUrl);
  
  // Include fingerprint header for extra verification
  const response = await fetch(url, {
    headers: {
      'X-Fingerprint': currentSession?.status ? 'present' : '',
    },
  });

  return response;
}

/**
 * Get current session status
 */
export function getSessionStatusV3(): SessionStatus | null {
  return currentSession?.status || null;
}

/**
 * Check if session is ready for streaming
 */
export function isReadyForStreamingV3(): boolean {
  return currentSession?.status?.canAccessStream || false;
}

/**
 * React hook for Quantum Shield V3
 */
export function useQuantumStreamV3() {
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);

  const initialize = useCallback(async () => {
    if (isInitializing || isReady) return;
    
    setIsInitializing(true);
    setError(null);

    try {
      const session = await initQuantumSessionV3();
      setStatus(session.status);
      setIsReady(session.status.canAccessStream);
      
      if (!session.status.canAccessStream) {
        setError('Session initialized but cannot access streams yet');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, isReady]);

  const getStreamUrl = useCallback(async (url: string) => {
    if (!isReady) {
      throw new Error('Session not ready');
    }
    return getQuantumStreamUrlV3(url);
  }, [isReady]);

  const fetchStream = useCallback(async (url: string) => {
    if (!isReady) {
      throw new Error('Session not ready');
    }
    return fetchQuantumStreamV3(url);
  }, [isReady]);

  return {
    isReady,
    isInitializing,
    error,
    status,
    initialize,
    getStreamUrl,
    fetchStream,
  };
}

// Import React hooks
import { useState, useCallback } from 'react';
