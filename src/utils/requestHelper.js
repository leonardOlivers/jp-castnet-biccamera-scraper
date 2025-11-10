onst axios = require('axios');

function sleep(ms) {
return new Promise(res => setTimeout(res, ms));
}

/**
* Fetch a page with retries and throttling.
* Respects userAgent, timeoutMs, delayMs. Retries on network/5xx.
*/
async function getPage(url, settings, logger, attempt = 1) {
const {
userAgent = 'Mozilla/5.0 (compatible; BitbashScraper/1.0)',
timeoutMs = 20000,
delayMs = 400
} = settings || {};

// polite delay between requests
if (delayMs > 0) await sleep(delayMs);

try {
const res = await axios.get(url, {
timeout: timeoutMs,
headers: {
'User-Agent': userAgent,
'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Language': 'ja,en;q=0.9',
'Cache-Control': 'no-cache'
},
// follow redirects by default; axios does that
maxRedirects: 5,
validateStatus: (s) => s >= 200 && s < 400
});

if (!res?.data) {
logger.warn?.(`Empty body for ${url} (status: ${res?.status})`);
return '';
}
return String(res.data);
} catch (err) {
const retriable = isRetriable(err);
const maxAttempts = 3;
logger.warn?.(`Request failed [attempt ${attempt}/${maxAttempts}] ${url}: ${err.code || err.message}`);
if (retriable && attempt < maxAttempts) {
await sleep(500 * attempt);
return getPage(url, settings, logger, attempt + 1);
}
if (err.response) {
logger.error?.(`HTTP ${err.response.status} for ${url}`);
}
return '';
}
}

function isRetriable(err) {
if (!err) return false;
if (err.code && ['ECONNABORTED', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN', 'ETIMEDOUT'].includes(err.code)) return true;
const status = err?.response?.status;
return status >= 500 || status === 429;
}

module.exports = { getPage, sleep };