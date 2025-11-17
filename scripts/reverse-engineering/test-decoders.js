/**
 * Sample Page Test Script
 * 
 * This script tests the decoder system against all sample pages from
 * reverse-engineering-output/pages/ directory. It extracts encoded strings,
 * attempts decoding, validates URLs, and generates a comprehensive success
 * rate report with metrics.
 * 
 * Requirements: 6.3, 6.4, 6.5
 * 
 * Run with: bun run scripts/reverse-engineering/test-decoders.js
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import the decoder
import { decodeSync } from '../../app/lib/decoders/index.ts';
import { isValidM3u8Url } from '../../app/lib/decoders/utils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extract encoded strings from HTML content
 * Looks for hidden div elements that contain obfuscated data
 */
function extractEncodedStrings(htmlContent, filename) {
  const encodedStrings = [];
  
  // Use regex to find divs with display:none that contain long content
  // Pattern: <div ... style="display:none">CONTENT</div>
  const divPattern = /<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>([^<]+)<\/div>/gi;
  
  let match;
  while ((match = divPattern.exec(htmlContent)) !== null) {
    const content = match[1].trim();
    
    // Skip empty divs or divs with very short content
    if (content.length < 50) {
      continue;
    }
    
    // Skip divs that look like they contain HTML or JSON
    if (content.startsWith('<') || content.startsWith('{') || content.startsWith('[')) {
      continue;
    }
    
    // Extract div id if present
    const idMatch = match[0].match(/id="([^"]+)"/);
    const id = idMatch ? idMatch[1] : 'unknown';
    
    encodedStrings.push({
      id,
      content,
      source: filename
    });
  }
  
  return encodedStrings;
}

/**
 * Test decoder against a single encoded string
 */
function testDecode(encodedString, source) {
  const startTime = Date.now();
  
  try {
    const result = decodeSync(encodedString, { enableDiagnostics: false });
    const decodeTime = Date.now() - startTime;
    
    return {
      success: result.success,
      urls: result.urls || [],
      validUrls: (result.urls || []).filter(isValidM3u8Url),
      error: result.error,
      pattern: result.pattern,
      decoderUsed: result.decoderUsed,
      decodeTime,
      attemptedDecoders: result.metadata?.attemptedDecoders || [],
      source
    };
  } catch (error) {
    const decodeTime = Date.now() - startTime;
    return {
      success: false,
      urls: [],
      validUrls: [],
      error: error.message,
      pattern: 'unknown',
      decoderUsed: 'none',
      decodeTime,
      attemptedDecoders: [],
      source
    };
  }
}

/**
 * Generate success rate report
 */
function generateReport(results) {
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;
  const successRate = totalTests > 0 ? (successfulTests / totalTests * 100).toFixed(2) : 0;
  
  // Group by pattern
  const byPattern = {};
  const bySource = {};
  
  for (const result of results) {
    const pattern = result.pattern || 'unknown';
    if (!byPattern[pattern]) {
      byPattern[pattern] = { total: 0, success: 0, failed: 0 };
    }
    byPattern[pattern].total++;
    if (result.success) {
      byPattern[pattern].success++;
    } else {
      byPattern[pattern].failed++;
    }
    
    const source = result.source;
    if (!bySource[source]) {
      bySource[source] = { total: 0, success: 0, failed: 0, results: [] };
    }
    bySource[source].total++;
    if (result.success) {
      bySource[source].success++;
    } else {
      bySource[source].failed++;
    }
    bySource[source].results.push(result);
  }
  
  // Calculate average decode time
  const avgDecodeTime = results.length > 0
    ? (results.reduce((sum, r) => sum + r.decodeTime, 0) / results.length).toFixed(2)
    : 0;
  
  // Find slowest decodes
  const slowestDecodes = results
    .sort((a, b) => b.decodeTime - a.decodeTime)
    .slice(0, 5);
  
  return {
    summary: {
      totalTests,
      successfulTests,
      failedTests,
      successRate: `${successRate}%`,
      avgDecodeTime: `${avgDecodeTime}ms`
    },
    byPattern,
    bySource,
    slowestDecodes: slowestDecodes.map(r => ({
      source: r.source,
      decodeTime: `${r.decodeTime}ms`,
      pattern: r.pattern,
      success: r.success
    })),
    failedTests: results
      .filter(r => !r.success)
      .map(r => ({
        source: r.source,
        error: r.error,
        pattern: r.pattern,
        attemptedDecoders: r.attemptedDecoders
      }))
  };
}

/**
 * Main test function
 */
function main() {
  console.log('='.repeat(80));
  console.log('Decoder Test Suite - Sample Page Analysis');
  console.log('='.repeat(80));
  console.log();
  
  const pagesDir = join(__dirname, '../../reverse-engineering-output/pages');
  
  // Check if directory exists
  if (!existsSync(pagesDir)) {
    console.error(`Error: Pages directory not found: ${pagesDir}`);
    process.exit(1);
  }
  
  // Load all HTML files
  const files = readdirSync(pagesDir).filter(f => f.endsWith('.html'));
  
  console.log(`Found ${files.length} sample pages`);
  console.log();
  
  // Extract encoded strings from all pages
  const allEncodedStrings = [];
  
  for (const file of files) {
    const filePath = join(pagesDir, file);
    const htmlContent = readFileSync(filePath, 'utf-8');
    const encodedStrings = extractEncodedStrings(htmlContent, file);
    
    console.log(`${file}: Found ${encodedStrings.length} encoded string(s)`);
    allEncodedStrings.push(...encodedStrings);
  }
  
  console.log();
  console.log(`Total encoded strings to test: ${allEncodedStrings.length}`);
  console.log();
  console.log('-'.repeat(80));
  console.log('Testing decoders...');
  console.log('-'.repeat(80));
  console.log();
  
  // Test each encoded string
  const results = [];
  
  for (let i = 0; i < allEncodedStrings.length; i++) {
    const { id, content, source } = allEncodedStrings[i];
    
    console.log(`[${i + 1}/${allEncodedStrings.length}] Testing: ${source} (div#${id})`);
    
    const result = testDecode(content, source);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✓ Success: Found ${result.validUrls.length} valid URL(s)`);
      console.log(`  Pattern: ${result.pattern}`);
      console.log(`  Decode time: ${result.decodeTime}ms`);
    } else {
      console.log(`  ✗ Failed: ${result.error}`);
      console.log(`  Attempted decoders: ${result.attemptedDecoders.join(', ')}`);
    }
    console.log();
  }
  
  // Generate report
  console.log('='.repeat(80));
  console.log('Test Results Summary');
  console.log('='.repeat(80));
  console.log();
  
  const report = generateReport(results);
  
  console.log('Overall Statistics:');
  console.log(`  Total Tests: ${report.summary.totalTests}`);
  console.log(`  Successful: ${report.summary.successfulTests}`);
  console.log(`  Failed: ${report.summary.failedTests}`);
  console.log(`  Success Rate: ${report.summary.successRate}`);
  console.log(`  Average Decode Time: ${report.summary.avgDecodeTime}`);
  console.log();
  
  console.log('Results by Pattern:');
  for (const [pattern, stats] of Object.entries(report.byPattern)) {
    const patternSuccessRate = stats.total > 0
      ? ((stats.success / stats.total) * 100).toFixed(2)
      : 0;
    console.log(`  ${pattern}:`);
    console.log(`    Total: ${stats.total}`);
    console.log(`    Success: ${stats.success}`);
    console.log(`    Failed: ${stats.failed}`);
    console.log(`    Success Rate: ${patternSuccessRate}%`);
  }
  console.log();
  
  console.log('Results by Source File:');
  for (const [source, stats] of Object.entries(report.bySource)) {
    const sourceSuccessRate = stats.total > 0
      ? ((stats.success / stats.total) * 100).toFixed(2)
      : 0;
    console.log(`  ${source}: ${stats.success}/${stats.total} (${sourceSuccessRate}%)`);
  }
  console.log();
  
  if (report.slowestDecodes.length > 0) {
    console.log('Slowest Decodes:');
    report.slowestDecodes.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.source} - ${d.decodeTime} (${d.pattern})`);
    });
    console.log();
  }
  
  if (report.failedTests.length > 0) {
    console.log('Failed Tests:');
    report.failedTests.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.source}`);
      console.log(`     Error: ${f.error}`);
      console.log(`     Pattern: ${f.pattern}`);
      console.log(`     Attempted: ${f.attemptedDecoders.join(', ')}`);
    });
    console.log();
  }
  
  // Save report to file
  const reportPath = join(__dirname, '../../reverse-engineering-output/analysis/decoder-test-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Full report saved to: ${reportPath}`);
  console.log();
  
  // Check if requirements are met
  console.log('='.repeat(80));
  console.log('Requirements Validation');
  console.log('='.repeat(80));
  console.log();
  
  const overallSuccessRate = parseFloat(report.summary.successRate);
  const oldFormatStats = report.byPattern['old_format'] || report.byPattern['OLD_FORMAT'];
  const oldFormatSuccessRate = oldFormatStats
    ? (oldFormatStats.success / oldFormatStats.total) * 100
    : 0;
  
  console.log('Requirement 6.4: OLD format 100% success rate');
  if (oldFormatSuccessRate === 100) {
    console.log(`  ✓ PASS: ${oldFormatSuccessRate.toFixed(2)}%`);
  } else {
    console.log(`  ✗ FAIL: ${oldFormatSuccessRate.toFixed(2)}% (expected 100%)`);
  }
  console.log();
  
  console.log('Requirement 6.5: Overall 95%+ success rate');
  if (overallSuccessRate >= 95) {
    console.log(`  ✓ PASS: ${overallSuccessRate}%`);
  } else {
    console.log(`  ✗ FAIL: ${overallSuccessRate}% (expected >= 95%)`);
  }
  console.log();
  
  console.log('='.repeat(80));
  console.log('Test Complete');
  console.log('='.repeat(80));
}

// Run the tests
main();
