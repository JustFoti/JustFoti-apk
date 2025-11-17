/**
 * ============================================================================
 * DEVELOPMENT-ONLY TOOL - Decoder Validation with Puppeteer
 * ============================================================================
 * 
 * This script validates our static decoders against live prorcp pages using
 * Puppeteer to get "ground truth" decoded values. It compares static decoder
 * outputs with actual decoded values from the live page to ensure accuracy.
 * 
 * ⚠️  WARNING: This is a DEVELOPMENT/DEBUG tool only!
 * ⚠️  DO NOT use Puppeteer in production code - it's too heavy for edge runtime
 * ⚠️  Production code must use static decoders only (see app/lib/decoders/)
 * 
 * Requirements: 6.3
 * 
 * Run with: bun run scripts/reverse-engineering/validate-decoders.js
 * 
 * Optional arguments:
 *   --url <url>     Validate a specific prorcp URL
 *   --live          Test against live prorcp pages (requires network)
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
      source: filename
    });
  }
  
  return encodedStrings;
}

/**
 * Use Puppeteer to get the "ground truth" decoded value from a live page
 */
async function getGroundTruthFromPage(pageUrl, browser) {
  console.log(`  [Puppeteer] Loading live page: ${pageUrl}`);
  
  const page = await browser.newPage();
  
  try {
    // Set up console log capture
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // Navigate to the page
    await page.goto(pageUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for JavaScript to execute and decode
    await page.waitForTimeout(3000);
    
    // Extract decoded values from the page
    const decodedData = await page.evaluate(() => {
      const results = {
        urls: [],
        playerSources: [],
        windowVars: {}
      };
      
      // Check for common player objects and their sources
      const playerObjects = ['player', 'playerInstance', 'jwplayer', 'videojs', 'Playerjs'];
      for (const objName of playerObjects) {
        if (window[objName]) {
          try {
            const obj = window[objName];
            
            // Try to get sources from various methods
            if (typeof obj.getSource === 'function') {
              results.playerSources.push(obj.getSource());
            }
            if (typeof obj.getSources === 'function') {
              results.playerSources.push(...obj.getSources());
            }
            if (obj.source) {
              results.playerSources.push(obj.source);
            }
            if (obj.sources) {
              results.playerSources.push(...obj.sources);
            }
            if (obj.file) {
              results.urls.push(obj.file);
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }
      
      // Look for any window variables that contain URLs
      for (const key of Object.keys(window)) {
        const value = window[key];
        if (typeof value === 'string') {
          if (value.includes('.m3u8') || value.includes('http')) {
            results.windowVars[key] = value;
            results.urls.push(value);
          }
        }
      }
      
      // Check for video/source elements
      const videoElements = document.querySelectorAll('video, source');
      videoElements.forEach(el => {
        const src = el.getAttribute('src') || el.src;
        if (src && src.includes('http')) {
          results.urls.push(src);
        }
      });
      
      // Deduplicate URLs
      results.urls = [...new Set(results.urls)];
      
      return results;
    });
    
    // Also check network requests for m3u8 files
    const networkRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('.m3u8') || url.includes('stream')) {
        networkRequests.push(url);
      }
    });
    
    // Filter console logs for URLs
    const urlsFromConsole = consoleLogs
      .filter(log => log.text.includes('http') || log.text.includes('.m3u8'))
      .map(log => log.text);
    
    // Combine all found URLs
    const allUrls = [
      ...decodedData.urls,
      ...urlsFromConsole,
      ...networkRequests
    ].filter(url => typeof url === 'string' && url.includes('http'));
    
    // Deduplicate and filter valid m3u8 URLs
    const uniqueUrls = [...new Set(allUrls)];
    const validM3u8Urls = uniqueUrls.filter(isValidM3u8Url);
    
    return {
      success: validM3u8Urls.length > 0,
      urls: validM3u8Urls,
      allUrls: uniqueUrls,
      playerSources: decodedData.playerSources,
      windowVars: decodedData.windowVars,
      consoleLogs: urlsFromConsole
    };
    
  } catch (error) {
    console.log(`  [Puppeteer] Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      urls: []
    };
  } finally {
    await page.close();
  }
}

/**
 * Validate static decoder against ground truth
 */
function validateDecoder(staticResult, groundTruth, encodedString) {
  const validation = {
    encodedString: encodedString.substring(0, 100) + '...',
    staticDecoder: {
      success: staticResult.success,
      pattern: staticResult.pattern,
      decoderUsed: staticResult.decoderUsed,
      urlCount: staticResult.urls?.length || 0,
      urls: staticResult.urls || [],
      error: staticResult.error,
      decodeTime: staticResult.metadata?.decodeTime || 0
    },
    groundTruth: {
      success: groundTruth.success,
      urlCount: groundTruth.urls?.length || 0,
      urls: groundTruth.urls || [],
      error: groundTruth.error
    },
    validation: {
      passed: false,
      urlsMatch: false,
      partialMatch: false,
      issues: []
    }
  };
  
  // Validate results
  if (!staticResult.success && !groundTruth.success) {
    validation.validation.passed = true;
    validation.validation.issues.push('Both failed - no ground truth available to validate against');
  } else if (!staticResult.success && groundTruth.success) {
    validation.validation.passed = false;
    validation.validation.issues.push('Static decoder failed but ground truth succeeded - DECODER NEEDS FIX');
  } else if (staticResult.success && !groundTruth.success) {
    validation.validation.passed = true;
    validation.validation.issues.push('Static decoder succeeded but no ground truth - assuming correct');
  } else {
    // Both succeeded - compare URLs
    const staticUrls = staticResult.urls || [];
    const truthUrls = groundTruth.urls || [];
    
    // Check for exact matches
    const exactMatches = staticUrls.filter(sUrl => 
      truthUrls.some(tUrl => sUrl === tUrl)
    );
    
    // Check for partial matches (domain/path similarity)
    const partialMatches = staticUrls.filter(sUrl => 
      truthUrls.some(tUrl => {
        try {
          const sUrlObj = new URL(sUrl);
          const tUrlObj = new URL(tUrl);
          return sUrlObj.hostname === tUrlObj.hostname && 
                 sUrlObj.pathname.includes(tUrlObj.pathname.split('/').pop());
        } catch {
          return false;
        }
      })
    );
    
    validation.validation.urlsMatch = exactMatches.length > 0;
    validation.validation.partialMatch = partialMatches.length > 0;
    validation.validation.passed = validation.validation.urlsMatch || validation.validation.partialMatch;
    
    if (exactMatches.length > 0) {
      validation.validation.issues.push(`${exactMatches.length} exact URL match(es) found - VALIDATED`);
    } else if (partialMatches.length > 0) {
      validation.validation.issues.push(`${partialMatches.length} partial URL match(es) found - LIKELY CORRECT`);
    } else {
      validation.validation.issues.push('No URL matches found - VALIDATION FAILED');
      validation.validation.issues.push(`Static found: ${staticUrls.join(', ')}`);
      validation.validation.issues.push(`Ground truth: ${truthUrls.join(', ')}`);
    }
  }
  
  return validation;
}

/**
 * Generate validation report
 */
function generateReport(validations) {
  const total = validations.length;
  const passed = validations.filter(v => v.validation.validation.passed).length;
  const failed = total - passed;
  const urlMatches = validations.filter(v => v.validation.validation.urlsMatch).length;
  const partialMatches = validations.filter(v => v.validation.validation.partialMatch).length;
  
  const report = {
    summary: {
      totalValidations: total,
      passed,
      failed,
      passRate: `${((passed / total) * 100).toFixed(2)}%`,
      exactUrlMatches: urlMatches,
      partialUrlMatches: partialMatches
    },
    validations: validations.map(v => ({
      source: v.source,
      divId: v.divId,
      validation: v.validation
    })),
    failedValidations: validations
      .filter(v => !v.validation.validation.passed)
      .map(v => ({
        source: v.source,
        divId: v.divId,
        staticResult: v.validation.staticDecoder,
        groundTruth: v.validation.groundTruth,
        issues: v.validation.validation.issues
      })),
    recommendations: []
  };
  
  // Generate recommendations
  if (failed > 0) {
    report.recommendations.push(
      `${failed} validation(s) failed. Review failed cases to improve static decoder accuracy.`
    );
  }
  
  if (urlMatches < passed) {
    report.recommendations.push(
      `${passed - urlMatches} validations passed with partial matches only. Verify these are correct.`
    );
  }
  
  if (passed === total) {
    report.recommendations.push(
      'All validations passed! Static decoders are working correctly.'
    );
  }
  
  return report;
}

/**
 * Main validation function
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Decoder Validation Tool with Puppeteer (DEVELOPMENT TOOL)');
  console.log('='.repeat(80));
  console.log();
  console.log('⚠️  This tool uses Puppeteer for validation - DO NOT use in production!');
  console.log('⚠️  Production code must use static decoders only.');
  console.log();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const specificUrl = args.includes('--url') ? args[args.indexOf('--url') + 1] : null;
  const testLive = args.includes('--live');
  
  if (specificUrl) {
    console.log(`Testing specific URL: ${specificUrl}`);
    console.log();
  } else if (testLive) {
    console.log('⚠️  Live testing mode - will attempt to load actual prorcp pages');
    console.log('⚠️  This requires network access and pages may have changed');
    console.log();
  } else {
    console.log('Testing against saved sample pages (offline mode)');
    console.log('Use --live flag to test against live pages');
    console.log();
  }
  
  const pagesDir = join(__dirname, '../../reverse-engineering-output/pages');
  
  if (!existsSync(pagesDir)) {
    console.error(`Error: Pages directory not found: ${pagesDir}`);
    process.exit(1);
  }
  
  // Launch browser once for all tests
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const allValidations = [];
    
    if (specificUrl) {
      // Test specific URL
      console.log('Testing specific URL...');
      
      const page = await browser.newPage();
      await page.goto(specificUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      const htmlContent = await page.content();
      await page.close();
      
      const encodedStrings = extractEncodedStrings(htmlContent, specificUrl);
      
      for (const encoded of encodedStrings) {
        console.log(`Testing div#${encoded.id}`);
        
        const staticResult = decodeSync(encoded.content, { enableDiagnostics: true });
        const groundTruth = await getGroundTruthFromPage(specificUrl, browser);
        const validation = validateDecoder(staticResult, groundTruth, encoded.content);
        
        allValidations.push({
          source: specificUrl,
          divId: encoded.id,
          validation
        });
        
        console.log(`  Static: ${staticResult.success ? '✓' : '✗'} | Ground Truth: ${groundTruth.success ? '✓' : '✗'} | Valid: ${validation.validation.passed ? '✓' : '✗'}`);
        console.log();
      }
    } else {
      // Test all sample pages
      const files = readdirSync(pagesDir).filter(f => f.endsWith('.html'));
      console.log(`Found ${files.length} sample pages`);
      console.log();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`[${i + 1}/${files.length}] Validating: ${file}`);
        
        const filePath = join(pagesDir, file);
        const htmlContent = readFileSync(filePath, 'utf-8');
        const encodedStrings = extractEncodedStrings(htmlContent, file);
        
        console.log(`  Found ${encodedStrings.length} encoded string(s)`);
        
        if (encodedStrings.length === 0) {
          console.log(`  Skipping (no encoded strings found)`);
          console.log();
          continue;
        }
        
        for (const encoded of encodedStrings) {
          console.log(`  Testing div#${encoded.id}`);
          
          // Test with static decoder
          const staticResult = decodeSync(encoded.content, { enableDiagnostics: true });
          
          // Get ground truth
          let groundTruth;
          if (testLive) {
            // Extract prorcp URL from filename and test live
            const urlMatch = file.match(/prorcp-([^.]+)\.html/);
            if (urlMatch) {
              const hash = urlMatch[1];
              const liveUrl = `https://cloudnestra.com/prorcp/${hash}`;
              groundTruth = await getGroundTruthFromPage(liveUrl, browser);
            } else {
              groundTruth = { success: false, error: 'Could not extract prorcp URL from filename' };
            }
          } else {
            // Use saved page
            groundTruth = await getGroundTruthFromPage(`file://${filePath}`, browser);
          }
          
          // Validate
          const validation = validateDecoder(staticResult, groundTruth, encoded.content);
          
          allValidations.push({
            source: file,
            divId: encoded.id,
            validation
          });
          
          console.log(`    Static: ${staticResult.success ? '✓' : '✗'} | Ground Truth: ${groundTruth.success ? '✓' : '✗'} | Valid: ${validation.validation.passed ? '✓' : '✗'}`);
          
          if (validation.validation.issues.length > 0) {
            validation.validation.issues.forEach(issue => {
              console.log(`      - ${issue}`);
            });
          }
        }
        
        console.log();
      }
    }
    
    // Generate report
    console.log('='.repeat(80));
    console.log('Validation Report');
    console.log('='.repeat(80));
    console.log();
    
    const report = generateReport(allValidations);
    
    console.log('Summary:');
    console.log(`  Total Validations: ${report.summary.totalValidations}`);
    console.log(`  Passed: ${report.summary.passed}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Pass Rate: ${report.summary.passRate}`);
    console.log(`  Exact URL Matches: ${report.summary.exactUrlMatches}`);
    console.log(`  Partial URL Matches: ${report.summary.partialUrlMatches}`);
    console.log();
    
    if (report.recommendations.length > 0) {
      console.log('Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
      console.log();
    }
    
    if (report.failedValidations.length > 0) {
      console.log('Failed Validations:');
      report.failedValidations.forEach((fv, i) => {
        console.log(`  ${i + 1}. ${fv.source} (div#${fv.divId})`);
        fv.issues.forEach(issue => {
          console.log(`     - ${issue}`);
        });
      });
      console.log();
    }
    
    // Save report
    const reportPath = join(__dirname, '../../reverse-engineering-output/analysis/decoder-validation-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Full report saved to: ${reportPath}`);
    console.log();
    
    console.log('='.repeat(80));
    console.log('Validation Complete');
    console.log('='.repeat(80));
    
  } finally {
    await browser.close();
  }
}

// Run the validation
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
