#!/usr/bin/env node
/**
 * Decoder Testing CLI
 * 
 * Command-line interface for testing and reverse engineering decoders.
 * 
 * Usage:
 *   npm run decoder:test              - Run all tests
 *   npm run decoder:extract <url>     - Extract from a live page
 *   npm run decoder:analyze           - Analyze all scripts
 *   npm run decoder:discover          - Discover new methods
 *   npm run decoder:report            - Generate comprehensive report
 */

import { autoTest } from './auto-test';
import { testFramework } from './test-framework';
import { registry } from '../registry';
import { decode } from '../index';

/**
 * CLI Commands
 */
const commands = {
  /**
   * Run all tests
   */
  async test() {
    console.log('Running all decoder tests...\n');
    
    const results = await testFramework.runAll(decode);
    const report = testFramework.generateReport(results);
    
    console.log(report);
    
    // Save results
    autoTest.saveExtraction({
      id: 'test-run',
      title: 'Test Run',
      type: 'movie',
      tmdbId: 0,
      encoded: '',
      html: '',
      scripts: [],
      timestamp: Date.now(),
    });
  },

  /**
   * Extract from live page
   */
  async extract(url: string) {
    console.log(`Extracting from: ${url}\n`);
    
    // This requires Puppeteer implementation
    console.log('ERROR: Extract command requires Puppeteer implementation');
    console.log('Please implement extractFromPage in auto-test.ts');
  },

  /**
   * Analyze all scripts
   */
  async analyze() {
    console.log('Analyzing all scripts...\n');
    
    await autoTest.batchProcess(decode);
    
    console.log('\nAnalysis complete!');
  },

  /**
   * Discover new methods
   */
  async discover() {
    console.log('Discovering new decoder methods...\n');
    
    // Get failed test cases
    const results = await testFramework.runAll(decode);
    const failedTests = results.results
      .filter(r => !r.passed)
      .map(r => testFramework.getTest(r.testId))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
    
    console.log(`Found ${failedTests.length} failed test cases`);
    
    const discoveries = await autoTest.discoverNewMethods(failedTests, decode);
    
    console.log(`\nDiscovered ${discoveries.length} potential new methods`);
    
    for (const discovery of discoveries) {
      console.log(`  - ${discovery.name} (confidence: ${discovery.confidence.toFixed(2)})`);
    }
  },

  /**
   * Generate comprehensive report
   */
  async report() {
    console.log('Generating comprehensive report...\n');
    
    const report = autoTest.generateComprehensiveReport();
    console.log(report);
  },

  /**
   * Show registry stats
   */
  async stats() {
    console.log('Decoder Registry Statistics\n');
    console.log('='.repeat(80));
    
    const stats = registry.getAllStats();
    console.log(`Total Registered Decoders: ${stats.length}\n`);
    
    // Top performers
    const topPerformers = registry.getTopPerformers(10);
    console.log('Top Performers:');
    console.log('-'.repeat(80));
    
    for (const stat of topPerformers) {
      console.log(
        `  ${stat.id.padEnd(30)} ` +
        `${(stat.successRate * 100).toFixed(1)}% ` +
        `(${stat.successes}/${stat.attempts}) ` +
        `${stat.avgTime.toFixed(2)}ms`
      );
    }
    
    console.log('\n' + '='.repeat(80));
  },

  /**
   * Show help
   */
  async help() {
    console.log('Decoder Testing CLI\n');
    console.log('Commands:');
    console.log('  test              Run all tests');
    console.log('  extract <url>     Extract from a live page');
    console.log('  analyze           Analyze all scripts');
    console.log('  discover          Discover new methods');
    console.log('  report            Generate comprehensive report');
    console.log('  stats             Show registry statistics');
    console.log('  help              Show this help message');
  },
};

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const commandArgs = args.slice(1);

  if (command in commands) {
    try {
      await (commands as any)[command](...commandArgs);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Run "decoder help" for usage information');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { commands };
