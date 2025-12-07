/**
 * usePhantomShield Hook
 * 
 * React hook for integrating the Phantom Shield bot detection system.
 * Automatically initializes on mount and provides analysis functions.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getPhantomShield, type PhantomShieldResult } from '../utils/phantom-shield';

interface UsePhantomShieldOptions {
  // Auto-analyze after this many events (default: 50)
  autoAnalyzeThreshold?: number;
  // Callback when bot is detected
  onBotDetected?: (result: PhantomShieldResult) => void;
  // Callback when analysis completes
  onAnalysis?: (result: PhantomShieldResult) => void;
  // Enable debug logging
  debug?: boolean;
}

interface UsePhantomShieldReturn {
  // Current analysis result (null until first analysis)
  result: PhantomShieldResult | null;
  // Is the shield initialized?
  isInitialized: boolean;
  // Is analysis in progress?
  isAnalyzing: boolean;
  // Current event count
  eventCount: number;
  // Trigger manual analysis
  analyze: () => Promise<PhantomShieldResult>;
  // Quick check (faster, less accurate)
  quickCheck: () => { isLikelyHuman: boolean; confidence: number };
  // Record a navigation step
  recordNavigation: (step: string) => void;
  // Reset all tracking
  reset: () => void;
}

export function usePhantomShield(options: UsePhantomShieldOptions = {}): UsePhantomShieldReturn {
  const {
    autoAnalyzeThreshold = 50,
    onBotDetected,
    onAnalysis,
    debug = false,
  } = options;
  
  const [result, setResult] = useState<PhantomShieldResult | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  
  const shieldRef = useRef(getPhantomShield());
  const hasAutoAnalyzedRef = useRef(false);
  const eventCountIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize shield on mount
  useEffect(() => {
    const shield = shieldRef.current;
    
    const init = async () => {
      await shield.initialize();
      setIsInitialized(true);
      
      if (debug) {
        console.log('[usePhantomShield] Initialized');
      }
    };
    
    init();
    
    // Poll event count
    eventCountIntervalRef.current = setInterval(() => {
      const count = shield.getEventCount();
      setEventCount(count);
      
      // Auto-analyze when threshold reached
      if (count >= autoAnalyzeThreshold && !hasAutoAnalyzedRef.current) {
        hasAutoAnalyzedRef.current = true;
        analyze();
      }
    }, 1000);
    
    return () => {
      if (eventCountIntervalRef.current) {
        clearInterval(eventCountIntervalRef.current);
      }
    };
  }, [autoAnalyzeThreshold, debug]);
  
  // Analyze function
  const analyze = useCallback(async (): Promise<PhantomShieldResult> => {
    const shield = shieldRef.current;
    setIsAnalyzing(true);
    
    try {
      const analysisResult = await shield.analyze();
      setResult(analysisResult);
      
      if (debug) {
        console.log('[usePhantomShield] Analysis result:', analysisResult);
      }
      
      // Callbacks
      onAnalysis?.(analysisResult);
      
      if (analysisResult.verdict === 'bot') {
        onBotDetected?.(analysisResult);
      }
      
      return analysisResult;
    } finally {
      setIsAnalyzing(false);
    }
  }, [debug, onAnalysis, onBotDetected]);
  
  // Quick check function
  const quickCheck = useCallback(() => {
    const shield = shieldRef.current;
    return shield.quickCheck();
  }, []);
  
  // Record navigation
  const recordNavigation = useCallback((step: string) => {
    const shield = shieldRef.current;
    shield.recordNavigation(step);
    
    if (debug) {
      console.log('[usePhantomShield] Navigation recorded:', step);
    }
  }, [debug]);
  
  // Reset function
  const reset = useCallback(() => {
    const shield = shieldRef.current;
    shield.reset();
    setResult(null);
    setEventCount(0);
    hasAutoAnalyzedRef.current = false;
    
    if (debug) {
      console.log('[usePhantomShield] Reset');
    }
  }, [debug]);
  
  return {
    result,
    isInitialized,
    isAnalyzing,
    eventCount,
    analyze,
    quickCheck,
    recordNavigation,
    reset,
  };
}

export default usePhantomShield;
