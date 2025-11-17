/**
 * Automated Testing and Reverse Engineering Tool
 * 
 * Automatically tests shows/movies, extracts scripts, deobfuscates them,
 * and discovers new decoder methods.
 */

import * as fs from 'fs';
import * as path from 'path';
import { testFramework, TestCase, createTestCaseFromExtraction } from './test-framework';
import { scriptAnalyzer, ScriptAnalysis } from './script-analyzer';
import { registry } from '../registry';
import { DecodeInput, DecodeResult } from '../types';

/**
 * Extraction result from a live page
 */
export interface ExtractionResult {
  /** Test case ID */
  id: string;
  
  /** Title */
  title: string;
  
  /** Type */
  type: 'movie' | 'tv';
  
  /** TMDB ID */
  tmdbId: number;
  
  /** Season/Episode */
  season?: number;
  episode?: number;
  
  /** Extracted data */
  encoded: string;
  divId?: string;
  dataI?: string;
  
  /** Page HTML */
  html: string;
  
  /** Scripts found */
  scripts: {
    url: string;
    content: string;
    inline: boolean;
  }[];
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Discovery result - new decoder method found
 */
export interface DiscoveryResult {
  /** Method ID */
  id: string;
  
  /** Method name */
  name: string;
  
  /** Source script */
  sourceScript: string;
  
  /** Function body */
  functionBody: string;
  
  /** Test cases that work with this method */
  workingTestCases: string[];
  
  /** Confidence score */
  confidence: number;
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Automated Test and Reverse Engineering Tool
 */
export class AutoTest {
  private outputDir: string;
  private extractionsDir: string;
  private scriptsDir: string;
  private discoveriesDir: string;

  constructor(baseDir: string = './decoder-analysis') {
    this.outputDir = baseDir;
    this.extractionsDir = path.join(baseDir, 'extractions');
    this.scriptsDir = path.join(baseDir, 'scripts');
    this.discoveriesDir = path.join(baseDir, 'discoveries');

    // Create directories
    this.ensureDirectories();
  }

  /**
   * Ensure output directories exist
   */
  private ensureDirectories(): void {
    for (const dir of [this.outputDir, this.extractionsDir, this.scriptsDir, this.discoveriesDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Extract data from a live page
   * 
   * This should be called with Puppeteer or similar to extract:
   * - Encoded string
   * - Div ID
   * - Page HTML
   * - All scripts
   */
  async extractFromPage(
    _url: string,
    _title: string,
    _type: 'movie' | 'tv',
    _tmdbId: number,
    _season?: number,
    _episode?: number
  ): Promise<ExtractionResult> {
    // This is a placeholder - implement with Puppeteer
    throw new Error('extractFromPage must be implemented with Puppeteer');
  }

  /**
   * Save extraction result
   */
  saveExtraction(extraction: ExtractionResult): void {
    const filename = `${extraction.id}-${extraction.timestamp}.json`;
    const filepath = path.join(this.extractionsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(extraction, null, 2));

    // Save HTML separately
    const htmlFilename = `${extraction.id}-${extraction.timestamp}.html`;
    fs.writeFileSync(
      path.join(this.extractionsDir, htmlFilename),
      extraction.html
    );

    // Save scripts
    for (let i = 0; i < extraction.scripts.length; i++) {
      const script = extraction.scripts[i];
      const scriptFilename = `${extraction.id}-${extraction.timestamp}-script-${i}.js`;
      fs.writeFileSync(
        path.join(this.scriptsDir, scriptFilename),
        `// Source: ${script.url}\n// Inline: ${script.inline}\n\n${script.content}`
      );
    }

    console.log(`[AutoTest] Saved extraction: ${extraction.id}`);
  }

  /**
   * Load extraction from file
   */
  loadExtraction(filename: string): ExtractionResult {
    const filepath = path.join(this.extractionsDir, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Load all extractions
   */
  loadAllExtractions(): ExtractionResult[] {
    const files = fs.readdirSync(this.extractionsDir)
      .filter(f => f.endsWith('.json'));
    
    return files.map(f => this.loadExtraction(f));
  }

  /**
   * Analyze all scripts from an extraction
   */
  analyzeExtraction(extraction: ExtractionResult): ScriptAnalysis[] {
    const analyses: ScriptAnalysis[] = [];

    for (const script of extraction.scripts) {
      const analysis = scriptAnalyzer.analyze(script.content, script.url);
      analyses.push(analysis);

      // Save analysis
      scriptAnalyzer.saveAnalysis(analysis, this.scriptsDir);
    }

    return analyses;
  }

  /**
   * Create test case from extraction
   */
  createTestCase(extraction: ExtractionResult): TestCase {
    return createTestCaseFromExtraction(
      extraction.id,
      extraction.title,
      extraction.type,
      extraction.tmdbId,
      extraction.encoded,
      extraction.divId,
      extraction.season,
      extraction.episode
    );
  }

  /**
   * Batch process extractions
   * 
   * 1. Load all extractions
   * 2. Create test cases
   * 3. Analyze scripts
   * 4. Run tests
   * 5. Generate report
   */
  async batchProcess(
    decodeFn: (input: DecodeInput) => Promise<DecodeResult>
  ): Promise<void> {
    console.log('[AutoTest] Starting batch processing...');

    // Load extractions
    const extractions = this.loadAllExtractions();
    console.log(`[AutoTest] Loaded ${extractions.length} extractions`);

    // Create test cases
    for (const extraction of extractions) {
      const testCase = this.createTestCase(extraction);
      testFramework.addTest(testCase);
    }

    // Analyze scripts
    console.log('[AutoTest] Analyzing scripts...');
    const allAnalyses: ScriptAnalysis[] = [];
    
    for (const extraction of extractions) {
      const analyses = this.analyzeExtraction(extraction);
      allAnalyses.push(...analyses);
    }

    // Generate script analysis report
    const scriptReport = this.generateScriptAnalysisReport(allAnalyses);
    fs.writeFileSync(
      path.join(this.outputDir, 'script-analysis-report.txt'),
      scriptReport
    );

    // Run tests
    console.log('[AutoTest] Running tests...');
    const testResults = await testFramework.runAll(decodeFn);

    // Generate test report
    const testReport = testFramework.generateReport(testResults);
    fs.writeFileSync(
      path.join(this.outputDir, 'test-report.txt'),
      testReport
    );

    // Export results
    fs.writeFileSync(
      path.join(this.outputDir, 'test-results.json'),
      testFramework.exportResults(testResults)
    );

    // Generate registry stats
    const registryStats = registry.exportStats();
    fs.writeFileSync(
      path.join(this.outputDir, 'registry-stats.json'),
      registryStats
    );

    console.log('[AutoTest] Batch processing complete!');
    console.log(`[AutoTest] Reports saved to: ${this.outputDir}`);
  }

  /**
   * Generate script analysis report
   */
  private generateScriptAnalysisReport(analyses: ScriptAnalysis[]): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('SCRIPT ANALYSIS REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Total Scripts Analyzed: ${analyses.length}`);
    lines.push('');

    // Pattern statistics
    const patternStats = {
      hasEval: 0,
      hasObfuscation: 0,
      hasDecoderFunctions: 0,
      hasXOR: 0,
      hasBase64: 0,
      hasHex: 0,
    };

    for (const analysis of analyses) {
      if (analysis.patterns.hasEval) patternStats.hasEval++;
      if (analysis.patterns.hasObfuscation) patternStats.hasObfuscation++;
      if (analysis.patterns.hasDecoderFunctions) patternStats.hasDecoderFunctions++;
      if (analysis.patterns.hasXOR) patternStats.hasXOR++;
      if (analysis.patterns.hasBase64) patternStats.hasBase64++;
      if (analysis.patterns.hasHex) patternStats.hasHex++;
    }

    lines.push('Pattern Statistics:');
    lines.push('-'.repeat(80));
    lines.push(`  Has Eval: ${patternStats.hasEval} (${(patternStats.hasEval / analyses.length * 100).toFixed(1)}%)`);
    lines.push(`  Has Obfuscation: ${patternStats.hasObfuscation} (${(patternStats.hasObfuscation / analyses.length * 100).toFixed(1)}%)`);
    lines.push(`  Has Decoder Functions: ${patternStats.hasDecoderFunctions} (${(patternStats.hasDecoderFunctions / analyses.length * 100).toFixed(1)}%)`);
    lines.push(`  Has XOR: ${patternStats.hasXOR} (${(patternStats.hasXOR / analyses.length * 100).toFixed(1)}%)`);
    lines.push(`  Has Base64: ${patternStats.hasBase64} (${(patternStats.hasBase64 / analyses.length * 100).toFixed(1)}%)`);
    lines.push(`  Has Hex: ${patternStats.hasHex} (${(patternStats.hasHex / analyses.length * 100).toFixed(1)}%)`);
    lines.push('');

    // Top decoder functions
    const allFunctions = analyses.flatMap(a => a.decoderFunctions);
    const topFunctions = allFunctions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20);

    if (topFunctions.length > 0) {
      lines.push('Top Decoder Functions:');
      lines.push('-'.repeat(80));
      
      for (const fn of topFunctions) {
        lines.push(`  ${fn.name} (confidence: ${fn.confidence.toFixed(2)}, type: ${fn.type})`);
      }
      lines.push('');
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Discover new decoder methods
   * 
   * Analyzes failed test cases and tries to extract working decoder logic
   */
  async discoverNewMethods(
    failedTestCases: TestCase[],
    _decodeFn: (input: DecodeInput) => Promise<DecodeResult>
  ): Promise<DiscoveryResult[]> {
    const discoveries: DiscoveryResult[] = [];

    console.log(`[AutoTest] Analyzing ${failedTestCases.length} failed test cases...`);

    // For each failed test case, try to find working decoder in scripts
    for (const testCase of failedTestCases) {
      // Load extraction
      const extraction = this.loadAllExtractions().find(e => e.id === testCase.id);
      if (!extraction) continue;

      // Analyze scripts
      const analyses = this.analyzeExtraction(extraction);

      // Try each decoder function
      for (const analysis of analyses) {
        for (const fn of analysis.decoderFunctions) {
          // Try to test this function
          // This would require executing the function in a sandbox
          // For now, just record high-confidence functions
          
          if (fn.confidence > 0.7) {
            const discovery: DiscoveryResult = {
              id: `discovered-${Date.now()}-${fn.name}`,
              name: fn.name,
              sourceScript: analysis.source,
              functionBody: fn.body,
              workingTestCases: [testCase.id],
              confidence: fn.confidence,
              timestamp: Date.now(),
            };

            discoveries.push(discovery);
          }
        }
      }
    }

    // Save discoveries
    for (const discovery of discoveries) {
      this.saveDiscovery(discovery);
    }

    return discoveries;
  }

  /**
   * Save discovery
   */
  private saveDiscovery(discovery: DiscoveryResult): void {
    const filename = `${discovery.id}.json`;
    const filepath = path.join(this.discoveriesDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(discovery, null, 2));

    // Save function separately
    const fnFilename = `${discovery.id}.js`;
    fs.writeFileSync(
      path.join(this.discoveriesDir, fnFilename),
      `// Discovered from: ${discovery.sourceScript}\n// Confidence: ${discovery.confidence}\n// Working test cases: ${discovery.workingTestCases.join(', ')}\n\nfunction ${discovery.name}() {\n${discovery.functionBody}\n}\n`
    );

    console.log(`[AutoTest] Saved discovery: ${discovery.id}`);
  }

  /**
   * Generate comprehensive report
   */
  generateComprehensiveReport(): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('COMPREHENSIVE DECODER ANALYSIS REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    // Extractions
    const extractions = this.loadAllExtractions();
    lines.push(`Total Extractions: ${extractions.length}`);
    lines.push(`  Movies: ${extractions.filter(e => e.type === 'movie').length}`);
    lines.push(`  TV Shows: ${extractions.filter(e => e.type === 'tv').length}`);
    lines.push('');

    // Registry stats
    const stats = registry.getAllStats();
    lines.push(`Registered Decoders: ${stats.length}`);
    lines.push('');

    // Top performers
    const topPerformers = registry.getTopPerformers(10);
    if (topPerformers.length > 0) {
      lines.push('Top Performing Decoders:');
      lines.push('-'.repeat(80));
      
      for (const stat of topPerformers) {
        lines.push(`  ${stat.id.padEnd(30)} Success Rate: ${(stat.successRate * 100).toFixed(1)}% (${stat.successes}/${stat.attempts})`);
      }
      lines.push('');
    }

    // Discoveries
    const discoveryFiles = fs.readdirSync(this.discoveriesDir)
      .filter(f => f.endsWith('.json'));
    
    lines.push(`New Methods Discovered: ${discoveryFiles.length}`);
    lines.push('');

    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}

/**
 * Global auto-test instance
 */
export const autoTest = new AutoTest();
