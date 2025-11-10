onst fs = require('fs');
const path = require('path');
const { exportToJSON } = require('./exportJSON');

/**
* Writes a timestamped JSON file and updates sample_output.json
*/
async function saveAll(items, outDir, logger) {
const dir = outDir || path.join(__dirname, '..', '..', '..', 'data');
await fs.promises.mkdir(dir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filePath = path.join(dir, `biccamera_results_${timestamp}.json`);

await exportToJSON(items, filePath, logger);
logger.info(`Saved ${items.length} items -> ${filePath}`);

// also refresh sample_output.json with the first 20 items
const samplePath = path.join(dir, 'sample_output.json');
const sample = items.slice(0, 20);
await exportToJSON(sample, samplePath, logger);
logger.info(`Updated sample -> ${samplePath}`);
}

module.exports = { saveAll };