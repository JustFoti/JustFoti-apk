# Reverse Engineering Scripts

This directory contains development-only tools for analyzing and validating the prorcp decoder system.

⚠️ **WARNING**: These scripts use Puppeteer and are intended for **DEVELOPMENT/DEBUG ONLY**. Never use Puppeteer in production code - it's too heavy for edge runtime environments.

## Scripts

### 1. `analyze-patterns.js`
Analyzes all sample pages to discover obfuscation patterns.

**Usage:**
```bash
bun run scripts/reverse-engineering/analyze-patterns.js
```

**What it does:**
- Loads all sample HTML files from `reverse-engineering-output/pages/`
- Extracts hidden div elements
- Categorizes encoded strings by character composition
- Generates pattern fingerprints
- Outputs analysis report to `reverse-engineering-output/analysis/pattern-fingerprints.json`

### 2. `extract-playerjs-decoders.js`
Extracts and analyzes decoder functions from PlayerJS.

**Usage:**
```bash
bun run scripts/reverse-engineering/extract-playerjs-decoders.js
```

**What it does:**
- Parses PlayerJS code from `reverse-engineering-output/analysis/`
- Extracts all decoder functions (11 identified)
- Deobfuscates function logic
- Identifies XOR keys, ROT values, substitution tables
- Outputs extracted keys to `reverse-engineering-output/analysis/extracted-decoder-keys.json`

### 3. `test-decoders.js`
Tests the decoder system against all sample pages.

**Usage:**
```bash
bun run scripts/reverse-engineering/test-decoders.js
```

**What it does:**
- Loads all sample pages
- Extracts encoded strings from hidden divs
- Attempts decoding with static decoders
- Validates decoded URLs
- Generates comprehensive success rate report
- Outputs report to `reverse-engineering-output/analysis/decoder-test-report.json`

**Requirements validated:**
- Requirement 6.4: OLD format 100% success rate
- Requirement 6.5: Overall 95%+ success rate

### 4. `analyze-samples.js` ⚠️ Puppeteer
Analyzes sample pages using Puppeteer to extract decoded values from window objects.

**Usage:**
```bash
bun run scripts/reverse-engineering/analyze-samples.js
```

**What it does:**
- Uses Puppeteer to load sample pages
- Executes JavaScript to extract decoded values from window objects
- Compares Puppeteer results with static decoder results
- Identifies discrepancies and areas for improvement
- Generates analysis report for debugging
- Outputs report to `reverse-engineering-output/analysis/puppeteer-analysis-report.json`

**Requirements:** 4.6

### 5. `validate-decoders.js` ⚠️ Puppeteer
Validates static decoders against "ground truth" values from Puppeteer.

**Usage:**
```bash
# Test against saved sample pages (offline)
bun run scripts/reverse-engineering/validate-decoders.js

# Test against live prorcp pages (requires network)
bun run scripts/reverse-engineering/validate-decoders.js --live

# Test a specific URL
bun run scripts/reverse-engineering/validate-decoders.js --url https://cloudnestra.com/prorcp/HASH
```

**What it does:**
- Uses Puppeteer to get "ground truth" decoded values from pages
- Compares static decoder outputs with Puppeteer results
- Validates decoder accuracy
- Generates validation report with pass/fail status
- Outputs report to `reverse-engineering-output/analysis/decoder-validation-report.json`

**Requirements:** 6.3

## Output Files

All scripts generate reports in the `reverse-engineering-output/analysis/` directory:

- `pattern-fingerprints.json` - Pattern analysis results
- `extracted-decoder-keys.json` - XOR keys and decoder algorithms
- `decoder-test-report.json` - Static decoder test results
- `puppeteer-analysis-report.json` - Puppeteer analysis results
- `decoder-validation-report.json` - Decoder validation results

## Development Workflow

1. **Discover patterns**: Run `analyze-patterns.js` to identify obfuscation patterns
2. **Extract keys**: Run `extract-playerjs-decoders.js` to get XOR keys
3. **Test decoders**: Run `test-decoders.js` to validate static decoder accuracy
4. **Analyze with Puppeteer**: Run `analyze-samples.js` to compare with live execution
5. **Validate**: Run `validate-decoders.js` to ensure decoder correctness

## Production Code

The production decoder library is located at `app/lib/decoders/` and is fully edge-compatible:
- Uses only standard JavaScript and fetch APIs
- No Node.js-specific APIs
- No Puppeteer or headless browsers
- Deployable to Vercel Edge, Cloudflare Workers, etc.

See `app/lib/decoders/README.md` for production decoder documentation.
