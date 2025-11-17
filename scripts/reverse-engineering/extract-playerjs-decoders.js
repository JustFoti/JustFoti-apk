/**
 * PlayerJS Decoder Extraction Script
 * 
 * This script analyzes all 11 PlayerJS decoder functions extracted from prorcp pages
 * to identify XOR key patterns, encoding/decoding algorithms, and key generation logic.
 * 
 * Purpose: Extract XOR keys and decoding patterns through static analysis
 * Usage: node scripts/reverse-engineering/extract-playerjs-decoders.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ANALYSIS_DIR = path.join(__dirname, '../../reverse-engineering-output/analysis');
const OUTPUT_FILE = path.join(ANALYSIS_DIR, 'extracted-decoder-keys.json');

/**
 * Load all PlayerJS decoder files
 */
function loadDecoderFiles() {
  const decoderFiles = [];
  
  for (let i = 1; i <= 11; i++) {
    const analysisFile = path.join(ANALYSIS_DIR, 'playerjs-decoder-analysis.json');
    const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
    
    const decoderInfo = analysis.decoderFunctions.find(d => d.index === i);
    if (decoderInfo) {
      const filePath = path.join(ANALYSIS_DIR, decoderInfo.file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      decoderFiles.push({
        index: i,
        name: decoderInfo.name,
        file: decoderInfo.file,
        content: content,
        size: decoderInfo.size
      });
    }
  }
  
  return decoderFiles;
}

/**
 * Analyze decoder for XOR operations
 */
function analyzeXorPatterns(decoder) {
  const patterns = {
    hasXor: false,
    xorOperations: [],
    potentialKeys: [],
    keyGeneration: null
  };
  
  // Check for XOR operator (^)
  const xorMatches = decoder.content.match(/[a-zA-Z0-9_]+\s*\^\s*[a-zA-Z0-9_]+/g);
  if (xorMatches) {
    patterns.hasXor = true;
    patterns.xorOperations = xorMatches;
  }
  
  // Look for charCodeAt operations (common in XOR decryption)
  const charCodeMatches = decoder.content.match(/\.charCodeAt\([^)]*\)/g);
  if (charCodeMatches) {
    patterns.charCodeOperations = charCodeMatches;
  }
  
  // Look for string literals that might be keys
  const stringLiterals = decoder.content.match(/"[^"]{4,}"|'[^']{4,}'/g);
  if (stringLiterals) {
    patterns.potentialKeys = stringLiterals.map(s => s.slice(1, -1));
  }
  
  return patterns;
}

/**
 * Analyze decoder for base64 operations
 */
function analyzeBase64Patterns(decoder) {
  const patterns = {
    hasAtob: decoder.content.includes('atob'),
    hasBtoa: decoder.content.includes('btoa'),
    hasBase64: false
  };
  
  patterns.hasBase64 = patterns.hasAtob || patterns.hasBtoa;
  
  return patterns;
}

/**
 * Analyze decoder for hex operations
 */
function analyzeHexPatterns(decoder) {
  const patterns = {
    hasHexConversion: false,
    hexOperations: []
  };
  
  // Look for hex conversion patterns
  const hexMatches = decoder.content.match(/\.toString\(16\)|parseInt\([^,]+,\s*16\)/g);
  if (hexMatches) {
    patterns.hasHexConversion = true;
    patterns.hexOperations = hexMatches;
  }
  
  return patterns;
}

/**
 * Analyze decoder for string manipulation
 */
function analyzeStringManipulation(decoder) {
  const patterns = {
    hasReverse: decoder.content.includes('.reverse()'),
    hasSplit: decoder.content.includes('.split('),
    hasJoin: decoder.content.includes('.join('),
    hasSubstring: decoder.content.includes('.substring(') || decoder.content.includes('.substr('),
    hasReplace: decoder.content.includes('.replace('),
    hasCharCodeAt: decoder.content.includes('.charCodeAt('),
    hasFromCharCode: decoder.content.includes('fromCharCode')
  };
  
  return patterns;
}

/**
 * Identify decoder type based on patterns
 */
function identifyDecoderType(decoder, analysis) {
  const types = [];
  
  if (analysis.xor.hasXor) {
    types.push('XOR');
  }
  
  if (analysis.base64.hasBase64) {
    types.push('Base64');
  }
  
  if (analysis.hex.hasHexConversion) {
    types.push('Hex');
  }
  
  if (analysis.string.hasReverse) {
    types.push('Reverse');
  }
  
  if (analysis.string.hasCharCodeAt && analysis.string.hasFromCharCode) {
    types.push('CharCode');
  }
  
  return types.length > 0 ? types : ['Utility'];
}

/**
 * Extract function signature and parameters
 */
function extractFunctionSignature(decoder) {
  const match = decoder.content.match(/function\s+(\w+)\s*\(([^)]*)\)/);
  if (match) {
    return {
      name: match[1],
      parameters: match[2].split(',').map(p => p.trim()).filter(p => p)
    };
  }
  return null;
}

/**
 * Main analysis function
 */
function analyzeDecoders() {
  console.log('Loading PlayerJS decoder files...');
  const decoders = loadDecoderFiles();
  console.log(`Loaded ${decoders.length} decoder files\n`);
  
  const results = {
    timestamp: new Date().toISOString(),
    totalDecoders: decoders.length,
    decoders: [],
    summary: {
      xorDecoders: 0,
      base64Decoders: 0,
      hexDecoders: 0,
      extractedKeys: []
    }
  };
  
  // Analyze each decoder
  decoders.forEach(decoder => {
    console.log(`Analyzing decoder ${decoder.index}: ${decoder.name}`);
    
    const xorAnalysis = analyzeXorPatterns(decoder);
    const base64Analysis = analyzeBase64Patterns(decoder);
    const hexAnalysis = analyzeHexPatterns(decoder);
    const stringAnalysis = analyzeStringManipulation(decoder);
    const signature = extractFunctionSignature(decoder);
    
    const analysis = {
      xor: xorAnalysis,
      base64: base64Analysis,
      hex: hexAnalysis,
      string: stringAnalysis
    };
    
    const types = identifyDecoderType(decoder, analysis);
    
    const result = {
      index: decoder.index,
      name: decoder.name,
      file: decoder.file,
      size: decoder.size,
      signature: signature,
      types: types,
      analysis: analysis,
      code: decoder.content
    };
    
    results.decoders.push(result);
    
    // Update summary
    if (xorAnalysis.hasXor) {
      results.summary.xorDecoders++;
      if (xorAnalysis.potentialKeys.length > 0) {
        results.summary.extractedKeys.push(...xorAnalysis.potentialKeys);
      }
    }
    if (base64Analysis.hasBase64) results.summary.base64Decoders++;
    if (hexAnalysis.hasHexConversion) results.summary.hexDecoders++;
    
    console.log(`  Types: ${types.join(', ')}`);
    console.log(`  XOR: ${xorAnalysis.hasXor ? 'Yes' : 'No'}`);
    console.log(`  Base64: ${base64Analysis.hasBase64 ? 'Yes' : 'No'}`);
    console.log(`  Hex: ${hexAnalysis.hasHexConversion ? 'Yes' : 'No'}`);
    console.log('');
  });
  
  // Remove duplicate keys
  results.summary.extractedKeys = [...new Set(results.summary.extractedKeys)];
  
  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\nAnalysis complete!`);
  console.log(`Results saved to: ${OUTPUT_FILE}`);
  console.log(`\nSummary:`);
  console.log(`  Total decoders: ${results.totalDecoders}`);
  console.log(`  XOR decoders: ${results.summary.xorDecoders}`);
  console.log(`  Base64 decoders: ${results.summary.base64Decoders}`);
  console.log(`  Hex decoders: ${results.summary.hexDecoders}`);
  console.log(`  Extracted keys: ${results.summary.extractedKeys.length}`);
  
  return results;
}

// Run analysis
if (require.main === module) {
  try {
    analyzeDecoders();
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

module.exports = { analyzeDecoders };
