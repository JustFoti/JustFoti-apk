/**
 * GPU Fingerprinting via WebGL Shader Timing
 * 
 * Novel bot detection based on the principle that:
 * 1. Real GPUs have unique, consistent timing signatures
 * 2. Headless browsers use software rendering (different timing)
 * 3. Virtual machines have detectable GPU emulation patterns
 * 4. You can't fake GPU timing without having that exact GPU
 * 
 * This creates a hardware-based fingerprint that's nearly impossible to spoof.
 */

export interface GPUFingerprintResult {
  isRealGPU: boolean;
  confidence: number;
  fingerprint: string;
  vendor: string;
  renderer: string;
  anomalies: string[];
  timingSignature: number[];
  isSoftwareRenderer: boolean;
  isVirtualMachine: boolean;
}

/**
 * Generate GPU fingerprint using WebGL
 */
export async function generateGPUFingerprint(): Promise<GPUFingerprintResult> {
  const anomalies: string[] = [];
  
  if (typeof window === 'undefined') {
    return {
      isRealGPU: false,
      confidence: 0,
      fingerprint: 'server-side',
      vendor: 'unknown',
      renderer: 'unknown',
      anomalies: ['server-side-execution'],
      timingSignature: [],
      isSoftwareRenderer: true,
      isVirtualMachine: false,
    };
  }
  
  // Create canvas and get WebGL context
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (!gl) {
    return {
      isRealGPU: false,
      confidence: 80,
      fingerprint: 'no-webgl',
      vendor: 'unknown',
      renderer: 'unknown',
      anomalies: ['webgl-not-available'],
      timingSignature: [],
      isSoftwareRenderer: true,
      isVirtualMachine: false,
    };
  }
  
  const glContext = gl as WebGLRenderingContext;
  
  // Get GPU info
  const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
  let vendor = 'unknown';
  let renderer = 'unknown';
  
  if (debugInfo) {
    vendor = glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
    renderer = glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
  }
  
  // Check for software renderers
  const softwareRenderers = [
    'swiftshader',
    'llvmpipe',
    'softpipe',
    'software',
    'mesa',
    'microsoft basic render',
    'vmware',
    'virtualbox',
    'parallels',
  ];
  
  const rendererLower = renderer.toLowerCase();
  const isSoftwareRenderer = softwareRenderers.some(sr => rendererLower.includes(sr));
  
  if (isSoftwareRenderer) {
    anomalies.push('software-renderer-detected');
  }
  
  // Check for VM indicators
  const vmIndicators = ['vmware', 'virtualbox', 'parallels', 'hyper-v', 'qemu', 'xen'];
  const isVirtualMachine = vmIndicators.some(vm => rendererLower.includes(vm));
  
  if (isVirtualMachine) {
    anomalies.push('virtual-machine-detected');
  }
  
  // Perform timing-based fingerprinting
  const timingSignature = await measureGPUTiming(glContext);
  
  // Check for timing anomalies
  const timingAnalysis = analyzeTimingSignature(timingSignature);
  if (timingAnalysis.anomalies.length > 0) {
    anomalies.push(...timingAnalysis.anomalies);
  }
  
  // Generate fingerprint hash
  const fingerprintData = [
    vendor,
    renderer,
    glContext.getParameter(glContext.VERSION),
    glContext.getParameter(glContext.SHADING_LANGUAGE_VERSION),
    glContext.getParameter(glContext.MAX_TEXTURE_SIZE),
    glContext.getParameter(glContext.MAX_VERTEX_ATTRIBS),
    glContext.getParameter(glContext.MAX_VERTEX_UNIFORM_VECTORS),
    glContext.getParameter(glContext.MAX_FRAGMENT_UNIFORM_VECTORS),
    ...timingSignature.map(t => Math.round(t * 100)),
  ].join('|');
  
  const fingerprint = await hashString(fingerprintData);
  
  // Calculate confidence
  let confidence = 50;
  
  if (isSoftwareRenderer) confidence -= 30;
  if (isVirtualMachine) confidence -= 20;
  if (timingAnalysis.isConsistent) confidence += 20;
  if (timingAnalysis.hasNaturalVariance) confidence += 15;
  if (vendor !== 'unknown' && renderer !== 'unknown') confidence += 15;
  if (anomalies.length === 0) confidence += 10;
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  // Cleanup
  const loseContext = glContext.getExtension('WEBGL_lose_context');
  if (loseContext) {
    loseContext.loseContext();
  }
  
  return {
    isRealGPU: !isSoftwareRenderer && !isVirtualMachine && confidence >= 50,
    confidence,
    fingerprint,
    vendor,
    renderer,
    anomalies,
    timingSignature,
    isSoftwareRenderer,
    isVirtualMachine,
  };
}

/**
 * Measure GPU timing by running specific shader operations
 */
async function measureGPUTiming(gl: WebGLRenderingContext): Promise<number[]> {
  const timings: number[] = [];
  
  try {
    // Create shader program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, `
      attribute vec4 position;
      void main() {
        gl_Position = position;
      }
    `);
    
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform float time;
      void main() {
        float r = sin(time * 0.1) * 0.5 + 0.5;
        float g = cos(time * 0.2) * 0.5 + 0.5;
        float b = sin(time * 0.3 + 1.0) * 0.5 + 0.5;
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `);
    
    if (!vertexShader || !fragmentShader) {
      return timings;
    }
    
    const program = gl.createProgram();
    if (!program) return timings;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return timings;
    }
    
    gl.useProgram(program);
    
    // Create buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    const timeLocation = gl.getUniformLocation(program, 'time');
    
    // Run multiple timing tests
    for (let test = 0; test < 5; test++) {
      const iterations = 100;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        gl.uniform1f(timeLocation, i * 0.1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      
      // Force GPU to finish
      gl.finish();
      
      const end = performance.now();
      timings.push((end - start) / iterations);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Cleanup
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteBuffer(buffer);
    
  } catch (e) {
    console.error('GPU timing measurement failed:', e);
  }
  
  return timings;
}

/**
 * Create a WebGL shader
 */
function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

/**
 * Analyze timing signature for anomalies
 */
function analyzeTimingSignature(timings: number[]): {
  isConsistent: boolean;
  hasNaturalVariance: boolean;
  anomalies: string[];
} {
  const anomalies: string[] = [];
  
  if (timings.length < 3) {
    return { isConsistent: false, hasNaturalVariance: false, anomalies: ['insufficient-timing-data'] };
  }
  
  const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
  const variance = timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timings.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;
  
  // Real GPUs have consistent but not perfectly uniform timing
  const isConsistent = cv < 0.3; // Less than 30% variation
  const hasNaturalVariance = cv > 0.01 && cv < 0.2; // 1-20% natural variance
  
  // Check for suspiciously uniform timing (software renderer)
  if (cv < 0.005) {
    anomalies.push('suspiciously-uniform-timing');
  }
  
  // Check for very slow timing (software renderer)
  if (mean > 5) { // More than 5ms per frame
    anomalies.push('slow-rendering');
  }
  
  // Check for very fast timing (might be skipping actual rendering)
  if (mean < 0.01) {
    anomalies.push('suspiciously-fast-timing');
  }
  
  return { isConsistent, hasNaturalVariance, anomalies };
}

/**
 * Hash a string using SubtleCrypto
 */
async function hashString(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  }
  
  // Fallback simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export default generateGPUFingerprint;
