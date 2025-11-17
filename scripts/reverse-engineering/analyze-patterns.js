/**
 * Pattern Analysis Script
 * 
 * This script analyzes all sample pages from reverse-engineering-output/pages/
 * to extract encoded strings from hidden divs, categorize them by character
 * composition and structure, and generate a pattern fingerprint report.
 * 
 * Purpose: Identify all obfuscation patterns used across prorcp pages
 * Usage: node scripts/reverse-engineering/analyze-patterns.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PAGES_DIR = path.join(__dirname, '../../reverse-engineering-output/pages');
const ANALYSIS_DIR = path.join(__dirname, '../../reverse-engineering-output/analysis');
const OUTPUT_FILE = path.join(ANALYSIS_DIR, 'pattern-fingerprints.json');

/**
 * Load all sample page files
 */
function loadSamplePages() {
  const pages = [];
  const files = fs.readdirSync(PAGES_DIR);
  
  files.forEach(file => {
    if (file.endsWith('.html')) {
      const filePath = path.join(PAGES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      pages.push({
        filename: file,
        path: filePath,
        content: content
      });
    }
  });
  
  return pages;
}

/**
 * Extract hidden div elements from HTML
 */
function extractHiddenDivs(html) {
  const divs = [];
  
  // Pattern 1: <div id="..." style="display:none;">...</div>
  const pattern1 = /<div\s+id="([^"]+)"\s+style="display:none;">([^<]+)<\/div>/gi;
  let match;
  
  while ((match = pattern1.exec(html)) !== null) {
    divs.push({
      id: match[1],
      content: match[2],
      pattern: 'display:none'
    });
  }
  
  // Pattern 2: <div style="display:none;" id="...">...</div>
  const pattern2 = /<div\s+style="display:none;"\s+id="([^"]+)">([^<]+)<\/div>/gi;
  
  while ((match = pattern2.exec(html)) !== null) {
    divs.push({
      id: match[1],
      content: match[2],
      pattern: 'display:none'
    });
  }
  
  return divs;
}

/**
 * Analyze character composition of encoded string
 */
function analyzeCharacterComposition(str) {
  const composition = {
    length: str.length,
    hasColon: str.includes(':'),
    hasPlus: str.includes('+'),
    hasSlash: str.includes('/'),
    hasEquals: str.includes('='),
    hasHexOnly: /^[0-9a-fA-F]+$/.test(str),
    hasBase64Only: /^[A-Za-z0-9+/=]+$/.test(str),
    hasExtendedChars: /[g-z]/.test(str),
    hasNumbers: /\d/.test(str),
    hasUpperCase: /[A-Z]/.test(str),
    hasLowerCase: /[a-z]/.test(str)
  };
  
  // Character frequency
  const charCounts = {};
  for (let char of str) {
    charCounts[char] = (charCounts[char] || 0) + 1;
  }
  
  composition.uniqueChars = Object.keys(charCounts).length;
  composition.mostCommonChars = Object.entries(charCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([char, count]) => ({ char, count }));
  
  return composition;
}

/**
 * Detect pattern type based on characteristics
 */
function detectPatternType(composition, content) {
  const patterns = [];
  
  // OLD Format: Contains colons AND extended chars (g-z)
  if (composition.hasColon && composition.hasExtendedChars) {
    patterns.push('OLD_FORMAT');
  }
  
  // NEW Format: Pure base64 (no colons)
  if (composition.hasBase64Only && !composition.hasColon) {
    patterns.push('NEW_FORMAT');
  }
  
  // Hex only
  if (composition.hasHexOnly && !composition.hasColon) {
    patterns.push('HEX_ONLY');
  }
  
  // Mixed format
  if (composition.hasColon && composition.hasBase64Only) {
    patterns.push('MIXED_BASE64_COLON');
  }
  
  // Unknown if no patterns matched
  if (patterns.length === 0) {
    patterns.push('UNKNOWN');
  }
  
  return patterns;
}

/**
 * Generate pattern fingerprint
 */
function generateFingerprint(composition, patterns) {
  const fingerprint = {
    type: patterns[0], // Primary pattern
    alternateTypes: patterns.slice(1),
    characteristics: {
      length: composition.length,
      hasColon: composition.hasColon,
      hasBase64Chars: composition.hasBase64Only,
      hasExtendedChars: composition.hasExtendedChars,
      uniqueCharCount: composition.uniqueChars
    },
    signature: `${patterns[0]}_L${composition.length}_U${composition.uniqueChars}`
  };
  
  return fingerprint;
}

/**
 * Analyze structure patterns
 */
function analyzeStructure(content) {
  const structure = {
    segments: [],
    hasRepeatingPatterns: false,
    segmentCount: 0
  };
  
  // Check for colon-separated segments
  if (content.includes(':')) {
    structure.segments = content.split(':').filter(s => s.length > 0);
    structure.segmentCount = structure.segments.length;
    
    // Analyze each segment
    structure.segmentAnalysis = structure.segments.map(seg => ({
      length: seg.length,
      isBase64: /^[A-Za-z0-9+/=]+$/.test(seg),
      isHex: /^[0-9a-fA-F]+$/.test(seg),
      hasExtendedChars: /[g-z]/.test(seg)
    }));
  }
  
  // Check for repeating patterns (same substring appears multiple times)
  const substrings = new Set();
  for (let i = 0; i < content.length - 10; i++) {
    const substr = content.substring(i, i + 10);
    if (substrings.has(substr)) {
      structure.hasRepeatingPatterns = true;
      break;
    }
    substrings.add(substr);
  }
  
  return structure;
}

/**
 * Main analysis function
 */
function analyzePatterns() {
  console.log('Loading sample pages...');
  const pages = loadSamplePages();
  console.log(`Loaded ${pages.length} sample pages\n`);
  
  const results = {
    timestamp: new Date().toISOString(),
    totalPages: pages.length,
    pages: [],
    summary: {
      patternTypes: {},
      totalEncodedStrings: 0,
      averageLength: 0,
      lengthDistribution: {
        short: 0,    // < 100 chars
        medium: 0,   // 100-1000 chars
        long: 0,     // 1000-10000 chars
        veryLong: 0  // > 10000 chars
      }
    }
  };
  
  let totalLength = 0;
  
  // Analyze each page
  pages.forEach(page => {
    console.log(`Analyzing: ${page.filename}`);
    
    const hiddenDivs = extractHiddenDivs(page.content);
    console.log(`  Found ${hiddenDivs.length} hidden div(s)`);
    
    const pageResult = {
      filename: page.filename,
      hiddenDivs: [],
      patternTypes: new Set()
    };
    
    hiddenDivs.forEach(div => {
      const composition = analyzeCharacterComposition(div.content);
      const patterns = detectPatternType(composition, div.content);
      const fingerprint = generateFingerprint(composition, patterns);
      const structure = analyzeStructure(div.content);
      
      const divAnalysis = {
        id: div.id,
        length: div.content.length,
        composition: composition,
        patterns: patterns,
        fingerprint: fingerprint,
        structure: structure,
        sample: div.content.substring(0, 100) + (div.content.length > 100 ? '...' : '')
      };
      
      pageResult.hiddenDivs.push(divAnalysis);
      patterns.forEach(p => pageResult.patternTypes.add(p));
      
      // Update summary
      results.summary.totalEncodedStrings++;
      totalLength += div.content.length;
      
      patterns.forEach(p => {
        results.summary.patternTypes[p] = (results.summary.patternTypes[p] || 0) + 1;
      });
      
      // Length distribution
      if (div.content.length < 100) {
        results.summary.lengthDistribution.short++;
      } else if (div.content.length < 1000) {
        results.summary.lengthDistribution.medium++;
      } else if (div.content.length < 10000) {
        results.summary.lengthDistribution.long++;
      } else {
        results.summary.lengthDistribution.veryLong++;
      }
      
      console.log(`    Div: ${div.id}`);
      console.log(`      Pattern: ${patterns.join(', ')}`);
      console.log(`      Length: ${div.content.length}`);
    });
    
    pageResult.patternTypes = Array.from(pageResult.patternTypes);
    results.pages.push(pageResult);
    console.log('');
  });
  
  // Calculate average length
  if (results.summary.totalEncodedStrings > 0) {
    results.summary.averageLength = Math.round(totalLength / results.summary.totalEncodedStrings);
  }
  
  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`Analysis complete!`);
  console.log(`Results saved to: ${OUTPUT_FILE}`);
  console.log(`\nSummary:`);
  console.log(`  Total pages: ${results.totalPages}`);
  console.log(`  Total encoded strings: ${results.summary.totalEncodedStrings}`);
  console.log(`  Average length: ${results.summary.averageLength} chars`);
  console.log(`\nPattern distribution:`);
  Object.entries(results.summary.patternTypes).forEach(([pattern, count]) => {
    console.log(`  ${pattern}: ${count}`);
  });
  console.log(`\nLength distribution:`);
  console.log(`  Short (< 100): ${results.summary.lengthDistribution.short}`);
  console.log(`  Medium (100-1000): ${results.summary.lengthDistribution.medium}`);
  console.log(`  Long (1000-10000): ${results.summary.lengthDistribution.long}`);
  console.log(`  Very Long (> 10000): ${results.summary.lengthDistribution.veryLong}`);
  
  return results;
}

// Run analysis
if (require.main === module) {
  try {
    analyzePatterns();
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

module.exports = { analyzePatterns };
