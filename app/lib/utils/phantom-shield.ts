/**
 * Phantom Shield - Advanced Bot Detection System
 * 
 * A novel, multi-layered bot detection system that combines:
 * 1. Temporal Entropy Analysis - Timing patterns that bots can't fake
 * 2. GPU Fingerprinting - Hardware signatures that can't be spoofed
 * 3. Honeypot Traps - Impossible states that only bots trigger
 * 4. Behavioral Biometrics - Human movement patterns
 * 
 * The key insight: Instead of trying to detect bots directly,
 * we detect the ABSENCE of human characteristics.
 */

import { TemporalEntropyAnalyzer, getEntropyAnalyzer, type EntropyResult } from './temporal-entropy';
import { generateGPUFingerprint, type GPUFingerprintResult } from './gpu-fingerprint';
import {
  createMouseMovementTrap,
  createTimingTrap,
  createSequenceTrap,
  getHoneypotState,
  type HoneypotState,
} from './honeypot-traps';

export interface PhantomShieldResult {
  isHuman: boolean;
  confidence: number; // 0-100, higher = more confident it's human
  verdict: 'human' | 'bot' | 'suspicious' | 'unknown';
  
  // Individual analysis results
  entropy: EntropyResult | null;
  gpu: GPUFingerprintResult | null;
  honeypot: HoneypotState;
  
  // Detailed breakdown
  scores: {
    temporal: number;
    hardware: number;
    behavioral: number;
    honeypot: number;
  };
  
  // All detected anomalies
  anomalies: string[];
  
  // Unique session fingerprint
  fingerprint: string;
  
  // Timestamp
  analyzedAt: number;
}

class PhantomShield {
  private entropyAnalyzer: TemporalEntropyAnalyzer;
  private mouseTracker: ReturnType<typeof createMouseMovementTrap> | null = null;
  private sequenceTracker: ReturnType<typeof createSequenceTrap> | null = null;
  private pageLoadTiming: ReturnType<typeof createTimingTrap> | null = null;
  private isInitialized = false;
  private gpuResult: GPUFingerprintResult | null = null;
  
  constructor() {
    this.entropyAnalyzer = getEntropyAnalyzer();
  }
  
  /**
   * Initialize the shield - call this on page load
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.isInitialized = true;
    
    // Start page load timing
    this.pageLoadTiming = createTimingTrap('page-interaction', 500);
    this.pageLoadTiming.start();
    
    // Initialize mouse tracking
    this.mouseTracker = createMouseMovementTrap();
    
    // Initialize sequence tracking
    this.sequenceTracker = createSequenceTrap();
    this.sequenceTracker.recordStep('page-load');
    
    // Setup event listeners for entropy analysis
    this.setupEventListeners();
    
    // Get GPU fingerprint (async)
    this.gpuResult = await generateGPUFingerprint();
    
    console.log('[PhantomShield] Initialized');
  }
  
  /**
   * Setup event listeners for timing analysis
   */
  private setupEventListeners(): void {
    if (typeof document === 'undefined') return;
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      this.entropyAnalyzer.recordKeystroke(e.key, 'keydown');
    }, { passive: true });
    
    document.addEventListener('keyup', (e) => {
      this.entropyAnalyzer.recordKeystroke(e.key, 'keyup');
    }, { passive: true });
    
    // Mouse events (throttled)
    let lastMouseTime = 0;
    document.addEventListener('mousemove', (e) => {
      const now = performance.now();
      if (now - lastMouseTime > 16) { // ~60fps
        this.entropyAnalyzer.recordMouseMove(e.clientX, e.clientY);
        lastMouseTime = now;
      }
    }, { passive: true });
    
    // Click events
    document.addEventListener('click', (e) => {
      this.entropyAnalyzer.recordClick(e.clientX, e.clientY, e.button);
    }, { passive: true });
    
    // Scroll events (throttled)
    let lastScrollTime = 0;
    document.addEventListener('scroll', () => {
      const now = performance.now();
      if (now - lastScrollTime > 50) {
        this.entropyAnalyzer.recordScroll(window.scrollY);
        lastScrollTime = now;
      }
    }, { passive: true });
    
    // Touch events for mobile
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.entropyAnalyzer.recordEvent('touchstart', {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        });
      }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.entropyAnalyzer.recordEvent('touchmove', {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        });
      }
    }, { passive: true });
  }
  
  /**
   * Record a navigation step
   */
  recordNavigation(step: string): void {
    this.sequenceTracker?.recordStep(step);
  }
  
  /**
   * Perform full analysis
   */
  async analyze(): Promise<PhantomShieldResult> {
    const anomalies: string[] = [];
    const scores = {
      temporal: 50,
      hardware: 50,
      behavioral: 50,
      honeypot: 100, // Start at 100, decrease if traps triggered
    };
    
    // 1. Temporal Entropy Analysis
    const entropyResult = this.entropyAnalyzer.analyze();
    if (entropyResult.confidence > 0) {
      scores.temporal = entropyResult.isHuman ? 50 + entropyResult.confidence / 2 : 50 - entropyResult.confidence / 2;
      anomalies.push(...entropyResult.anomalies.map(a => `entropy:${a}`));
    }
    
    // 2. GPU Fingerprint Analysis
    if (this.gpuResult) {
      if (this.gpuResult.isSoftwareRenderer) {
        scores.hardware -= 30;
        anomalies.push('gpu:software-renderer');
      }
      if (this.gpuResult.isVirtualMachine) {
        scores.hardware -= 25;
        anomalies.push('gpu:virtual-machine');
      }
      if (this.gpuResult.isRealGPU) {
        scores.hardware += 20;
      }
      anomalies.push(...this.gpuResult.anomalies.map(a => `gpu:${a}`));
    } else {
      scores.hardware = 30; // No GPU info is suspicious
      anomalies.push('gpu:unavailable');
    }
    
    // 3. Behavioral Analysis
    if (this.mouseTracker) {
      const moveCount = this.mouseTracker.getMovementCount();
      if (moveCount === 0) {
        scores.behavioral -= 30;
        anomalies.push('behavior:no-mouse-movement');
      } else if (moveCount < 5) {
        scores.behavioral -= 15;
        anomalies.push('behavior:minimal-mouse-movement');
      } else if (moveCount > 20) {
        scores.behavioral += 15;
      }
    }
    
    // Check page interaction timing
    if (this.pageLoadTiming?.check()) {
      scores.behavioral -= 40;
      anomalies.push('behavior:too-fast-interaction');
    }
    
    // Check navigation sequence
    if (this.sequenceTracker?.checkSequence()) {
      scores.behavioral -= 50;
      anomalies.push('behavior:impossible-sequence');
    }
    
    // 4. Honeypot Analysis
    const honeypotState = getHoneypotState();
    if (honeypotState.trapsTriggered.length > 0) {
      scores.honeypot = Math.max(0, 100 - honeypotState.confidence);
      anomalies.push(...honeypotState.trapsTriggered.map(t => `honeypot:${t.trapType}`));
    }
    
    // Calculate overall confidence
    // Weighted average with honeypot having highest weight (it's definitive)
    const weights = {
      temporal: 0.25,
      hardware: 0.20,
      behavioral: 0.25,
      honeypot: 0.30,
    };
    
    const overallScore = 
      scores.temporal * weights.temporal +
      scores.hardware * weights.hardware +
      scores.behavioral * weights.behavioral +
      scores.honeypot * weights.honeypot;
    
    // Determine verdict
    let verdict: PhantomShieldResult['verdict'];
    if (honeypotState.trapsTriggered.length > 0) {
      verdict = 'bot'; // Honeypot is definitive
    } else if (overallScore >= 70) {
      verdict = 'human';
    } else if (overallScore >= 45) {
      verdict = 'suspicious';
    } else if (overallScore >= 30) {
      verdict = 'bot';
    } else {
      verdict = 'unknown';
    }
    
    // Generate session fingerprint
    const fingerprint = await this.generateFingerprint();
    
    return {
      isHuman: verdict === 'human',
      confidence: Math.round(overallScore),
      verdict,
      entropy: entropyResult,
      gpu: this.gpuResult,
      honeypot: honeypotState,
      scores,
      anomalies,
      fingerprint,
      analyzedAt: Date.now(),
    };
  }
  
  /**
   * Quick check - faster but less accurate
   */
  quickCheck(): { isLikelyHuman: boolean; confidence: number } {
    const honeypot = getHoneypotState();
    
    // If honeypot triggered, definitely bot
    if (honeypot.trapsTriggered.length > 0) {
      return { isLikelyHuman: false, confidence: 90 };
    }
    
    // Check mouse movement
    const hasMouse = this.mouseTracker?.hasMouseMoved() ?? false;
    
    // Check event count
    const eventCount = this.entropyAnalyzer.getEventCount();
    
    // Quick scoring
    let score = 50;
    if (hasMouse) score += 20;
    if (eventCount > 10) score += 15;
    if (eventCount > 50) score += 10;
    if (this.gpuResult?.isRealGPU) score += 15;
    
    return {
      isLikelyHuman: score >= 60,
      confidence: Math.min(100, score),
    };
  }
  
  /**
   * Generate a unique fingerprint for this session
   */
  private async generateFingerprint(): Promise<string> {
    const components: string[] = [];
    
    // GPU fingerprint
    if (this.gpuResult?.fingerprint) {
      components.push(this.gpuResult.fingerprint);
    }
    
    // Entropy signature
    const entropy = this.entropyAnalyzer.analyze();
    components.push(`e${entropy.entropy.toFixed(2)}`);
    components.push(`cv${entropy.stats.coefficientOfVariation.toFixed(3)}`);
    
    // Browser characteristics
    if (typeof navigator !== 'undefined') {
      components.push(navigator.language || 'unknown');
      components.push(String(navigator.hardwareConcurrency || 0));
    }
    
    if (typeof screen !== 'undefined') {
      components.push(`${screen.width}x${screen.height}`);
    }
    
    // Hash the components
    const data = components.join('|');
    
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 'ps_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
    }
    
    // Fallback
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return 'ps_' + Math.abs(hash).toString(16).padStart(12, '0');
  }
  
  /**
   * Get current event count
   */
  getEventCount(): number {
    return this.entropyAnalyzer.getEventCount();
  }
  
  /**
   * Reset all tracking
   */
  reset(): void {
    this.entropyAnalyzer.clear();
    this.gpuResult = null;
    this.isInitialized = false;
  }
}

// Singleton instance
let shieldInstance: PhantomShield | null = null;

export function getPhantomShield(): PhantomShield {
  if (!shieldInstance) {
    shieldInstance = new PhantomShield();
  }
  return shieldInstance;
}

export default PhantomShield;
