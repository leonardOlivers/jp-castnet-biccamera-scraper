onst fs = require('fs');
const path = require('path');
const { once } = require('events');

const logger = require('./utils/logger');
const { crawlCategory } = require('./crawler/biccameraCrawler');
const { saveAll } = require('./output/saveResults');

const SETTINGS_PATH = path.join(__dirname, 'config', 'settings.json');
const DATA_DIR = path.join(__dirname, '..', 'data');
const INPUT_PATH = path.join(DATA_DIR, 'input_urls.txt');

async function readSettings() {
const raw = await fs.promises.readFile(SETTINGS_PATH, 'utf-8');
const parsed = JSON.parse(raw);
// basic validation & defaults
return {
userAgent: parsed.userAgent || 'Mozilla/5.0 (compatible; BitbashScraper/1.0)',
concurrency: Number(parsed.concurrency || 3),
delayMs: Number(parsed.delayMs || 500),
maxPages: Number(parsed.maxPages || 3),
timeoutMs: Number(parsed.timeoutMs || 20000),
outputDir: parsed.outputDir || path.join(__dirname, '..', 'data'),
logLevel: parsed.logLevel || 'info'
};
}

async function readInputUrls() {
try {
const raw = await fs.promises.readFile(INPUT_PATH, 'utf-8');
return raw
.split(/\r?\n/)
.map(s => s.trim())
.filter(s => s && !s.startsWith('#'));
} catch (err) {
logger.error(`Failed to read input URLs from ${INPUT_PATH}: ${err.message}`);
return [];
}
}

async function main() {
const settings = await readSettings();
logger.setLevel(settings.logLevel);

logger.info('JP Castnet Biccamera Scraper - starting');
logger.debug(`Settings: ${JSON.stringify(settings)}`);

const urls = await readInputUrls();
if (urls.length === 0) {
logger.warn('No input URLs provided. Add category/product URLs to data/input_urls.txt');
return;
}

const allResults = [];
for (const url of urls) {
logger.info(`Crawling category: ${url}`);
try {
const results = await crawlCategory(url, settings, logger);
allResults.push(...results);
logger.info(`Collected ${results.length} items from: ${url}`);
} catch (err) {
logger.error(`Failed to crawl "${url}": ${err.stack || err.message}`);
}
}

await saveAll(allResults, settings.outputDir, logger);

logger.info(`Done. Total items: ${allResults.length}`);
}

if (require.main === module) {
main().catch(err => {
logger.error(`Fatal error: ${err.stack || err.message}`);
// give logger time to flush (for some transports)
setImmediate(() => process.exit(1));
});

// ensure stdout drains before exit when piped
(async () => {
process.stdout.on('error', () => {});
await once(process, 'beforeExit');
})();
}