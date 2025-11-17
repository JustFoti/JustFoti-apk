/**
 * Script Analyzer
 * 
 * Analyzes and deobfuscates JavaScript from RCP pages to extract decoder logic.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Script analysis result
 */
export interface ScriptAnalysis {
  /** Script URL or identifier */
  source: string;
  
  /** Raw script content */
  raw: string;
  
  /** Deobfuscated content (if applicable) */
  deobfuscated?: string;
  
  /** Detected patterns */
  patterns: {
    /** Has eval() calls */
    hasEval: boolean;
    
    /** Has obfuscation */
    hasObfuscation: boolean;
    
    /** Has decoder functions */
    hasDecoderFunctions: boolean;
    
    /** Has XOR operations */
    hasXOR: boolean;
    
    /** Has Base64 operations */
    hasBase64: boolean;
    
    /** Has hex operations */
    hasHex: boolean;
  };
  
  /** Extracted decoder functions */
  decoderFunctions: ExtractedFunction[];
  
  /** Extracted constants */
  constants: ExtractedConstant[];
}

/**
 * Extracted function
 */
export interface ExtractedFunction {
  /** Function name */
  name: string;
  
  /** Function body */
  body: string;
  
  /** Parameters */
  params: string[];
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Detected type */
  type: 'decoder' | 'helper' | 'unknown';
}

/**
 * Extracted constant
 */
export interface ExtractedConstant {
  /** Constant name */
  name: string;
  
  /** Value */
  value: string;
  
  /** Type */
  type: 'string' | 'number' | 'array' | 'object';
}

/**
 * Script Analyzer
 */
export class ScriptAnalyzer {
  /**
   * Analyze a script
   */
  analyze(script: string, source: string = 'unknown'): ScriptAnalysis {
    const patterns = this.detectPatterns(script);
    const deobfuscated = patterns.hasObfuscation
      ? this.deobfuscate(script)
      : undefined;
    
    const contentToAnalyze = deobfuscated || script;
    const decoderFunctions = this.extractDecoderFunctions(contentToAnalyze);
    const constants = this.extractConstants(contentToAnalyze);

    return {
      source,
      raw: script,
      deobfuscated,
      patterns,
      decoderFunctions,
      constants,
    };
  }

  /**
   * Detect patterns in script
   */
  private detectPatterns(script: string) {
    return {
      hasEval: /eval\s*\(/.test(script),
      hasObfuscation: this.isObfuscated(script),
      hasDecoderFunctions: this.hasDecoderPatterns(script),
      hasXOR: /\^|\bxor\b/i.test(script),
      hasBase64: /atob|btoa|base64/i.test(script),
      hasHex: /0x[0-9a-f]+|parseInt.*16/i.test(script),
    };
  }

  /**
   * Check if script is obfuscated
   */
  private isObfuscated(script: string): boolean {
    // Check for common obfuscation patterns
    const patterns = [
      /var _0x[a-f0-9]+/,  // Hex variable names
      /function\(_0x[a-f0-9]+,_0x[a-f0-9]+\)/,  // Obfuscated function params
      /\['\\x[0-9a-f]{2}'\]/,  // Hex string access
      /eval\(function\(p,a,c,k,e,d\)/,  // Packer obfuscation
    ];

    return patterns.some(pattern => pattern.test(script));
  }

  /**
   * Check if script has decoder patterns
   */
  private hasDecoderPatterns(script: string): boolean {
    const patterns = [
      /function\s+\w+\s*\([^)]*\)\s*\{[^}]*decode/i,
      /function\s+\w+\s*\([^)]*\)\s*\{[^}]*decrypt/i,
      /function\s+\w+\s*\([^)]*\)\s*\{[^}]*fromCharCode/i,
      /function\s+\w+\s*\([^)]*\)\s*\{[^}]*atob/i,
    ];

    return patterns.some(pattern => pattern.test(script));
  }

  /**
   * Deobfuscate script
   */
  private deobfuscate(script: string): string {
    let result = script;

    // Try to unpack if it's packed
    if (/eval\(function\(p,a,c,k,e,d\)/.test(script)) {
      result = this.unpackPacker(script);
    }

    // Beautify
    result = this.beautify(result);

    return result;
  }

  /**
   * Unpack Dean Edwards' Packer
   */
  private unpackPacker(script: string): string {
    try {
      // Extract the packed function
      const match = script.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\((.*?)\)\)/);
      if (!match) return script;

      // This is a simplified unpacker - in production, use a proper library
      // For now, return the original
      return script;
    } catch {
      return script;
    }
  }

  /**
   * Beautify JavaScript
   */
  private beautify(script: string): string {
    // Simple beautification - add newlines and indentation
    let result = script;
    
    // Add newlines after semicolons
    result = result.replace(/;/g, ';\n');
    
    // Add newlines after braces
    result = result.replace(/\{/g, '{\n');
    result = result.replace(/\}/g, '\n}\n');
    
    // Basic indentation
    const lines = result.split('\n');
    let indent = 0;
    const indented = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('}')) indent = Math.max(0, indent - 1);
      const indentedLine = '  '.repeat(indent) + trimmed;
      if (trimmed.endsWith('{')) indent++;
      return indentedLine;
    });

    return indented.join('\n');
  }

  /**
   * Extract decoder functions
   */
  private extractDecoderFunctions(script: string): ExtractedFunction[] {
    const functions: ExtractedFunction[] = [];

    // Pattern 1: Named functions
    const namedFunctionRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\}/g;
    let match;

    while ((match = namedFunctionRegex.exec(script)) !== null) {
      const [, name, params, body] = match;
      const confidence = this.calculateDecoderConfidence(body);
      
      if (confidence > 0.3) {
        functions.push({
          name,
          params: params.split(',').map(p => p.trim()).filter(Boolean),
          body,
          confidence,
          type: confidence > 0.6 ? 'decoder' : 'helper',
        });
      }
    }

    // Pattern 2: Arrow functions assigned to variables
    const arrowFunctionRegex = /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{([\s\S]*?)\n\}/g;
    
    while ((match = arrowFunctionRegex.exec(script)) !== null) {
      const [, name, params, body] = match;
      const confidence = this.calculateDecoderConfidence(body);
      
      if (confidence > 0.3) {
        functions.push({
          name,
          params: params.split(',').map(p => p.trim()).filter(Boolean),
          body,
          confidence,
          type: confidence > 0.6 ? 'decoder' : 'helper',
        });
      }
    }

    return functions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate confidence that a function is a decoder
   */
  private calculateDecoderConfidence(body: string): number {
    let score = 0;

    // Check for decoder keywords
    if (/decode|decrypt|deobfuscate/i.test(body)) score += 0.3;
    if (/atob|btoa/i.test(body)) score += 0.2;
    if (/fromCharCode/i.test(body)) score += 0.2;
    if (/parseInt.*16/i.test(body)) score += 0.1;
    if (/\^|\bxor\b/i.test(body)) score += 0.2;
    if (/split|join|reverse/i.test(body)) score += 0.1;
    if (/charCodeAt/i.test(body)) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Extract constants
   */
  private extractConstants(script: string): ExtractedConstant[] {
    const constants: ExtractedConstant[] = [];

    // String constants
    const stringRegex = /(?:const|let|var)\s+(\w+)\s*=\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = stringRegex.exec(script)) !== null) {
      constants.push({
        name: match[1],
        value: match[2],
        type: 'string',
      });
    }

    // Number constants
    const numberRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(\d+)/g;
    
    while ((match = numberRegex.exec(script)) !== null) {
      constants.push({
        name: match[1],
        value: match[2],
        type: 'number',
      });
    }

    return constants;
  }

  /**
   * Save analysis to file
   */
  saveAnalysis(analysis: ScriptAnalysis, outputDir: string): void {
    const timestamp = Date.now();
    const safeSource = analysis.source.replace(/[^a-z0-9]/gi, '-');
    
    // Save raw script
    fs.writeFileSync(
      path.join(outputDir, `${safeSource}-${timestamp}-raw.js`),
      analysis.raw
    );

    // Save deobfuscated if available
    if (analysis.deobfuscated) {
      fs.writeFileSync(
        path.join(outputDir, `${safeSource}-${timestamp}-deobfuscated.js`),
        analysis.deobfuscated
      );
    }

    // Save analysis JSON
    fs.writeFileSync(
      path.join(outputDir, `${safeSource}-${timestamp}-analysis.json`),
      JSON.stringify(analysis, null, 2)
    );

    // Save extracted functions
    if (analysis.decoderFunctions.length > 0) {
      const functionsContent = analysis.decoderFunctions
        .map(fn => `// ${fn.name} (confidence: ${fn.confidence.toFixed(2)})\nfunction ${fn.name}(${fn.params.join(', ')}) {\n${fn.body}\n}\n`)
        .join('\n\n');
      
      fs.writeFileSync(
        path.join(outputDir, `${safeSource}-${timestamp}-functions.js`),
        functionsContent
      );
    }
  }

  /**
   * Generate analysis report
   */
  generateReport(analysis: ScriptAnalysis): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push(`SCRIPT ANALYSIS: ${analysis.source}`);
    lines.push('='.repeat(80));
    lines.push('');

    lines.push('Patterns Detected:');
    lines.push(`  Has Eval: ${analysis.patterns.hasEval}`);
    lines.push(`  Has Obfuscation: ${analysis.patterns.hasObfuscation}`);
    lines.push(`  Has Decoder Functions: ${analysis.patterns.hasDecoderFunctions}`);
    lines.push(`  Has XOR: ${analysis.patterns.hasXOR}`);
    lines.push(`  Has Base64: ${analysis.patterns.hasBase64}`);
    lines.push(`  Has Hex: ${analysis.patterns.hasHex}`);
    lines.push('');

    if (analysis.decoderFunctions.length > 0) {
      lines.push(`Decoder Functions Found: ${analysis.decoderFunctions.length}`);
      lines.push('-'.repeat(80));
      
      for (const fn of analysis.decoderFunctions) {
        lines.push(`  ${fn.name} (${fn.type}, confidence: ${fn.confidence.toFixed(2)})`);
        lines.push(`    Params: ${fn.params.join(', ')}`);
      }
      lines.push('');
    }

    if (analysis.constants.length > 0) {
      lines.push(`Constants Found: ${analysis.constants.length}`);
      lines.push('-'.repeat(80));
      
      for (const constant of analysis.constants.slice(0, 10)) {
        lines.push(`  ${constant.name} (${constant.type}): ${constant.value.substring(0, 50)}`);
      }
      lines.push('');
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}

/**
 * Global analyzer instance
 */
export const scriptAnalyzer = new ScriptAnalyzer();
