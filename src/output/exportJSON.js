onst fs = require('fs');

async function exportToJSON(data, filePath, logger) {
try {
const payload = JSON.stringify(data, null, 2);
await fs.promises.writeFile(filePath, payload, 'utf-8');
} catch (err) {
logger?.error?.(`Failed to write ${filePath}: ${err.message}`);
throw err;
}
}

module.exports = { exportToJSON };