/**
 * Honeypot Traps - Impossible State Detection
 * 
 * Creates traps that are impossible for legitimate users to trigger
 * but easy for bots/scrapers to fall into.
 * 
 * Techniques:
 * 1. Hidden form fields (CSS hidden, not display:none which bots detect)
 * 2. Invisible links that only exist in DOM
 * 3. Timing traps (actions too fast to be human)
 * 4. Sequence traps (impossible navigation patterns)
 * 5. JavaScript-only accessible content
 */

export interface TrapResult {
  triggered: boolean;
  trapType: string;
  confidence: number;
  details: string;
  timestamp: number;
}

export interface HoneypotState {
  trapsTriggered: TrapResult[];
  isBot: boolean;
  confidence: number;
}

// Store for tracking trap triggers
const trapState: HoneypotState = {
  trapsTriggered: [],
  isBot: false,
  confidence: 0,
};

/**
 * Generate a unique trap ID
 */
function generateTrapId(): string {
  return `trap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Record a trap trigger
 */
function recordTrap(trapType: string, details: string, confidence: number): void {
  trapState.trapsTriggered.push({
    triggered: true,
    trapType,
    confidence,
    details,
    timestamp: Date.now(),
  });
  
  // Update overall bot confidence
  trapState.confidence = Math.min(100, trapState.confidence + confidence);
  trapState.isBot = trapState.confidence >= 50;
  
  console.warn(`[Honeypot] Trap triggered: ${trapType}`, details);
}

/**
 * Create a hidden form field trap
 * Bots often fill all form fields, humans can't see/interact with hidden ones
 */
export function createHiddenFieldTrap(formId: string): {
  fieldName: string;
  checkTrap: () => boolean;
} {
  const fieldName = `_hp_${generateTrapId()}`;
  
  // The field should be hidden via CSS positioning, not display:none
  // Bots often check for display:none but miss position-based hiding
  const style = `
    position: absolute;
    left: -9999px;
    top: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
    tab-index: -1;
  `;
  
  if (typeof document !== 'undefined') {
    const form = document.getElementById(formId);
    if (form) {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = fieldName;
      input.id = fieldName;
      input.setAttribute('style', style);
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('tabindex', '-1');
      input.setAttribute('aria-hidden', 'true');
      form.appendChild(input);
    }
  }
  
  return {
    fieldName,
    checkTrap: () => {
      if (typeof document === 'undefined') return false;
      const field = document.getElementById(fieldName) as HTMLInputElement;
      if (field && field.value && field.value.length > 0) {
        recordTrap('hidden-field', `Field ${fieldName} was filled with: ${field.value}`, 80);
        return true;
      }
      return false;
    },
  };
}

/**
 * Create an invisible link trap
 * Links that exist in DOM but are invisible - bots following all links will hit these
 */
export function createInvisibleLinkTrap(): string {
  const trapPath = `/api/trap/${generateTrapId()}`;
  
  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = trapPath;
    link.textContent = 'Click here for free content'; // Enticing text for bots
    link.setAttribute('style', `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 1px;
      height: 1px;
      overflow: hidden;
      opacity: 0;
    `);
    link.setAttribute('aria-hidden', 'true');
    link.setAttribute('tabindex', '-1');
    document.body.appendChild(link);
  }
  
  return trapPath;
}

/**
 * Create a timing trap
 * Actions that happen faster than humanly possible
 */
export function createTimingTrap(actionName: string, minHumanTimeMs: number = 100): {
  start: () => void;
  check: () => boolean;
} {
  let startTime: number | null = null;
  
  return {
    start: () => {
      startTime = performance.now();
    },
    check: () => {
      if (startTime === null) return false;
      
      const elapsed = performance.now() - startTime;
      if (elapsed < minHumanTimeMs) {
        recordTrap('timing', `Action "${actionName}" completed in ${elapsed.toFixed(2)}ms (min: ${minHumanTimeMs}ms)`, 70);
        return true;
      }
      return false;
    },
  };
}

/**
 * Create a sequence trap
 * Detect impossible navigation sequences
 */
export function createSequenceTrap(): {
  recordStep: (step: string) => void;
  checkSequence: () => boolean;
} {
  const steps: { step: string; timestamp: number }[] = [];
  
  // Define impossible sequences
  const impossibleSequences = [
    // Can't go to checkout without viewing a product
    ['home', 'checkout'],
    // Can't submit form without loading it
    ['submit_form'],
    // Can't access admin without login
    ['admin'],
    // Accessing pages in wrong order
    ['step3', 'step1'],
  ];
  
  return {
    recordStep: (step: string) => {
      steps.push({ step, timestamp: Date.now() });
      
      // Keep only last 20 steps
      if (steps.length > 20) {
        steps.shift();
      }
    },
    checkSequence: () => {
      const stepNames = steps.map(s => s.step);
      
      for (const impossible of impossibleSequences) {
        // Check if the impossible sequence exists in order
        let matchIndex = 0;
        for (const step of stepNames) {
          if (step === impossible[matchIndex]) {
            matchIndex++;
            if (matchIndex === impossible.length) {
              recordTrap('sequence', `Impossible sequence detected: ${impossible.join(' → ')}`, 90);
              return true;
            }
          }
        }
      }
      
      // Check for impossibly fast navigation
      for (let i = 1; i < steps.length; i++) {
        const timeDiff = steps[i].timestamp - steps[i - 1].timestamp;
        if (timeDiff < 50) { // Less than 50ms between page loads
          recordTrap('sequence-timing', `Navigation too fast: ${timeDiff}ms between ${steps[i - 1].step} and ${steps[i].step}`, 75);
          return true;
        }
      }
      
      return false;
    },
  };
}

/**
 * Create a JavaScript execution trap
 * Content that only appears after JS execution - bots that don't execute JS won't see it
 */
export function createJSExecutionTrap(): {
  token: string;
  verify: (providedToken: string) => boolean;
} {
  // Generate a token that's only available after JS execution
  const baseToken = generateTrapId();
  
  // The "real" token requires JS computation
  const computedToken = typeof window !== 'undefined'
    ? btoa(baseToken + window.navigator.userAgent.length + screen.width)
    : baseToken;
  
  return {
    token: computedToken,
    verify: (providedToken: string) => {
      if (providedToken !== computedToken) {
        recordTrap('js-execution', 'Invalid JS-computed token provided', 85);
        return false;
      }
      return true;
    },
  };
}

/**
 * Create a mouse movement trap
 * Detect if mouse ever moved (bots often don't simulate mouse movement)
 */
export function createMouseMovementTrap(): {
  hasMouseMoved: () => boolean;
  getMovementCount: () => number;
} {
  let moveCount = 0;
  let lastX = -1;
  let lastY = -1;
  
  if (typeof document !== 'undefined') {
    document.addEventListener('mousemove', (e) => {
      // Only count significant movements (> 5px)
      if (lastX >= 0 && lastY >= 0) {
        const distance = Math.sqrt(Math.pow(e.clientX - lastX, 2) + Math.pow(e.clientY - lastY, 2));
        if (distance > 5) {
          moveCount++;
        }
      }
      lastX = e.clientX;
      lastY = e.clientY;
    }, { passive: true });
  }
  
  return {
    hasMouseMoved: () => moveCount > 0,
    getMovementCount: () => moveCount,
  };
}

/**
 * Create a click position trap
 * Bots often click at exact center or exact coordinates
 */
export function createClickPositionTrap(elementId: string): {
  checkClick: (x: number, y: number) => boolean;
} {
  return {
    checkClick: (x: number, y: number) => {
      if (typeof document === 'undefined') return false;
      
      const element = document.getElementById(elementId);
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Check if click is exactly at center (suspicious)
      if (Math.abs(x - centerX) < 1 && Math.abs(y - centerY) < 1) {
        recordTrap('click-position', `Click at exact center of ${elementId}`, 60);
        return true;
      }
      
      // Check if click coordinates are round numbers (suspicious)
      if (x === Math.round(x) && y === Math.round(y) && x % 10 === 0 && y % 10 === 0) {
        recordTrap('click-position', `Click at suspiciously round coordinates: ${x}, ${y}`, 40);
        return true;
      }
      
      return false;
    },
  };
}

/**
 * Get current honeypot state
 */
export function getHoneypotState(): HoneypotState {
  return { ...trapState };
}

/**
 * Reset honeypot state
 */
export function resetHoneypotState(): void {
  trapState.trapsTriggered = [];
  trapState.isBot = false;
  trapState.confidence = 0;
}

/**
 * Check if any traps have been triggered
 */
export function hasTriggeredTraps(): boolean {
  return trapState.trapsTriggered.length > 0;
}

export default {
  createHiddenFieldTrap,
  createInvisibleLinkTrap,
  createTimingTrap,
  createSequenceTrap,
  createJSExecutionTrap,
  createMouseMovementTrap,
  createClickPositionTrap,
  getHoneypotState,
  resetHoneypotState,
  hasTriggeredTraps,
};
