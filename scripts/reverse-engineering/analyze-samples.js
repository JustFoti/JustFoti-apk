/**
 * ============================================================================
 * DEVELOPMENT-ONLY TOOL - Sample Page Analyzer with Puppeteer
 * ============================================================================
 * 
 * This script uses Puppeteer to load prorcp pages and extract decoded values
 * from window objects. It compares these "ground truth" values with our static
 * decoder results to validate decoder accuracy and identify issues.
 * 
 * ⚠️  WARNING: This is a DEVELOPMENT/DEBUG tool only!
 * ⚠️  DO NOT use Puppeteer in production code - it's too heavy for edge runtime
 * ⚠️  Production code must use static decoders only (see app/lib/decoders/)
 * 
 * Requirements: 4.6
 * 
 * Run with: bun run scripts/reverse-engineering/analyze-samples.js
 * 
 * ============================================================================
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

// Import the static decoder for comparison
import { decodeSync } from '../../app/lib/decoders/index.ts';
import { isValidM3u8Url } from '../../app/lib/decoders/utils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extract encoded strings from HTML content
 */
function extractEncodedStrings(htmlContent, filename) {
  const encodedStrings = [];
  
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
    
    // Extract div id and data-i attribute if present
    const idMatch = match[0].match(/id="([^"]+)"/);
    const dataIMatch = match[0].match(/data-i="([^"]+)"/);
    const id = idMatch ? idMatch[1] : 'unknown';
    const dataI = dataIMatch ? dataIMatch[1] : null;
    
    encodedStrings.push({
      id,
      dataI,
      content,
      source: filename,
      divHtml: match[0]
    });
  }
  
  return encodedStrings;
}

/**
 * Use Puppeteer to load a page and extract decoded values from window objects
 */
async function extractWithPuppeteer(htmlPath, encodedStrings) {
  console.log(`  [Puppeteer] Loading page: ${htmlPath}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Load the HTML file
    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait a bit for any JavaScript to execute
    await page.waitForTimeout(2000);
    
    // Try to extract decoded values from various window objects
    const results = await page.evaluate(() => {
      const extractedData = {
        windowKeys: Object.keys(window).filter(k => 
          k.includes('decoded') || 
          k.includes('stream') || 
          k.includes('url') ||
          k.includes('m3u8') ||
          k.includes('source')
        ),
        playerData: {},
        decodedValues: []
      };
      
      // Check for common player objects
      const playerObjects = ['player', 'playerInstance', 'jwplayer', 'videojs'];
      for (const obj of playerObjects) {
        if (window[obj]) {
          try {
            extractedData.playerData[obj] = JSON.stringify(window[obj]);
          } catch (e) {
            extractedData.playerData[obj] = '[Circular or non-serializable]';
          }
        }
      }
      
      // Look for any variables that might contain decoded URLs
      for (const key of Object.keys(window)) {
        const value = window[key];
        if (typeof value === 'string' && (
          value.includes('http') || 
          value.includes('.m3u8') ||
          value.includes('cloudnestra') ||
          value.includes('prorcp')
        )) {
          extractedData.decodedValues.push({
            key,
            value
          });
        }
      }
      
      return extractedData;
    });
    
    // Also check for any console logs that might contain decoded values
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('http') || text.includes('.m3u8')) {
        consoleLogs.push(text);
      }
    });
    
    return {
      success: true,
      windowKeys: results.windowKeys,
      playerData: results.playerData,
      decodedValues: results.decodedValues,
      consoleLogs
    };
    
  } catch (error) {
    console.log(`  [Puppeteer] Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

/**
 * Compare Puppeteer results with static decoder results
 */
function compareResults(puppeteerResult, staticResult, encodedString) {
  const comparison = {
    encodedString: encodedString.substring(0, 100) + '...',
    staticDecoder: {
      success: staticResult.success,
      pattern: staticResult.pattern,
      urlCount: staticResult.urls?.length || 0,
      urls: staticResult.urls || [],
      error: staticResult.error
    },
    puppeteer: {
      success: puppeteerResult.success,
      decodedValueCount: puppeteerResult.decodedValues?.length || 0,
      decodedValues: puppeteerResult.decodedValues || [],
      windowKeys: puppeteerResult.windowKeys || [],
      error: puppeteerResult.error
    },
    match: false,
    notes: []
  };
  
  // Check if any Puppeteer decoded values match static decoder URLs
  if (staticResult.success && puppeteerResult.success) {
    const staticUrls = staticResult.urls || [];
    const puppeteerUrls = puppeteerResult.decodedValues.map(v => v.value);
    
    for (const staticUrl of staticUrls) {
      const found = puppeteerUrls.some(pUrl => 
        pUrl.includes(staticUrl) || staticUrl.includes(pUrl)
      );
      if (found) {
        comparison.match = true;
        comparison.notes.push('Static decoder URL found in Puppeteer results');
        break;
      }
    }
    
    if (!comparison.match && staticUrls.length > 0 && puppeteerUrls.length > 0) {
      comparison.notes.push('Static decoder found URLs but they don\'t match Puppeteer results');
    }
  }
  
  // Add diagnostic notes
  if (!staticResult.success && !puppeteerResult.success) {
    comparison.notes.push('Both static decoder and Puppeteer failed');
  } else if (!staticResult.success && puppeteerResult.success) {
    comparison.notes.push('Static decoder failed but Puppeteer succeeded - decoder needs improvement');
  } else if (staticResult.success && !puppeteerResult.success) {
    comparison.notes.push('Static decoder succeeded but Puppeteer found no decoded values - may be correct');
  }
  
  return comparison;
}

/**
 * Generate analysis report
 */
function generateReport(results) {
  const totalSamples = results.length;
  const staticSuccesses = results.filter(r => r.comparison.staticDecoder.success).length;
  const puppeteerSuccesses = results.filter(r => r.comparison.puppeteer.success).length;
  const matches = results.filter(r => r.comparison.match).length;
  
  const report = {
    summary: {
      totalSamples,
      staticDecoderSuccesses: staticSuccesses,
      staticDecoderSuccessRate: `${((staticSuccesses / totalSamples) * 100).toFixed(2)}%`,
      puppeteerSuccesses,
      puppeteerSuccessRate: `${((puppeteerSuccesses / totalSamples) * 100).toFixed(2)}%`,
      matches,
      matchRate: `${((matches / totalSamples) * 100).toFixed(2)}%`
    },
    results: results.map(r => ({
      source: r.source,
      divId: r.divId,
      comparison: r.comparison
    })),
    recommendations: []
  };
  
  // Generate recommendations
  if (staticSuccesses < totalSamples) {
    report.recommendations.push(
      `Static decoder failed on ${totalSamples - staticSuccesses} samples. Review failed cases to improve decoder.`
    );
  }
  
  if (matches < staticSuccesses) {
    report.recommendations.push(
      `${staticSuccesses - matches} static decoder successes don't match Puppeteer results. Validate these cases manually.`
    );
  }
  
  if (puppeteerSuccesses > staticSuccesses) {
    report.recommendations.push(
      `Puppeteer found ${puppeteerSuccesses - staticSuccesses} more decoded values than static decoder. Investigate these cases.`
    );
  }
  
  return report;
}

/**
 * Main analysis function
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Sample Page Analyzer with Puppeteer (DEVELOPMENT TOOL)');
  console.log('='.repeat(80));
  console.log();
  console.log('⚠️  This tool uses Puppeteer for analysis - DO NOT use in production!');
  console.log('⚠️  Production code must use static decoders only.');
  console.log();
  
  const pagesDir = join(__dirname, '../../reverse-engineering-output/pages');
  
  if (!existsSync(pagesDir)) {
    console.error(`Error: Pages directory not found: ${pagesDir}`);
    process.exit(1);
  }
  
  // Load all HTML files
  const files = readdirSync(pagesDir).filter(f => f.endsWith('.html'));
  
  console.log(`Found ${files.length} sample pages`);
  console.log();
  
  const allResults = [];
  
  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`[${i + 1}/${files.length}] Analyzing: ${file}`);
    
    const filePath = join(pagesDir, file);
    const htmlContent = readFileSync(filePath, 'utf-8');
    const encodedStrings = extractEncodedStrings(htmlContent, file);
    
    console.log(`  Found ${encodedStrings.length} encoded string(s)`);
    
    if (encodedStrings.length === 0) {
      console.log(`  Skipping (no encoded strings found)`);
      console.log();
      continue;
    }
    
    // Extract with Puppeteer
    const puppeteerResult = await extractWithPuppeteer(filePath, encodedStrings);
    
    // Test with static decoder
    for (const encoded of encodedStrings) {
      console.log(`  Testing div#${encoded.id}`);
      
      const staticResult = decodeSync(encoded.content, { enableDiagnostics: false });
      
      console.log(`    Static decoder: ${staticResult.success ? '✓' : '✗'} (${staticResult.pattern || 'unknown'})`);
      console.log(`    Puppeteer: ${puppeteerResult.success ? '✓' : '✗'} (${puppeteerResult.decodedValues?.length || 0} values found)`);
      
      // Compare results
      const comparison = compareResults(puppeteerResult, staticResult, encoded.content);
      
      allResults.push({
        source: file,
        divId: encoded.id,
        dataI: encoded.dataI,
        comparison
      });
      
      if (comparison.notes.length > 0) {
        console.log(`    Notes: ${comparison.notes.join('; ')}`);
      }
    }
    
    console.log();
  }
  
  // Generate report
  console.log('='.repeat(80));
  console.log('Analysis Report');
  console.log('='.repeat(80));
  console.log();
  
  const report = generateReport(allResults);
  
  console.log('Summary:');
  console.log(`  Total Samples: ${report.summary.totalSamples}`);
  console.log(`  Static Decoder Successes: ${report.summary.staticDecoderSuccesses} (${report.summary.staticDecoderSuccessRate})`);
  console.log(`  Puppeteer Successes: ${report.summary.puppeteerSuccesses} (${report.summary.puppeteerSuccessRate})`);
  console.log(`  Matches: ${report.summary.matches} (${report.summary.matchRate})`);
  console.log();
  
  if (report.recommendations.length > 0) {
    console.log('Recommendations:');
    report.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
    console.log();
  }
  
  // Save report
  const reportPath = join(__dirname, '../../reverse-engineering-output/analysis/puppeteer-analysis-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Full report saved to: ${reportPath}`);
  console.log();
  
  console.log('='.repeat(80));
  console.log('Analysis Complete');
  console.log('='.repeat(80));
}

// Run the analysis
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
