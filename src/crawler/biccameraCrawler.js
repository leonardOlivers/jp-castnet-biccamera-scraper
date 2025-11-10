onst path = require('path');
const { URL } = require('url');
const { getPage } = require('../utils/requestHelper');
const { parseListingPage, parseProductPage } = require('./parser');

/**
* Attempts to build a page URL for pagination.
* If the URL already has a query part, appends &p=PAGE, otherwise ?p=PAGE.
*/
function buildPageUrl(baseUrl, page) {
try {
const u = new URL(baseUrl);
// common BicCamera param for page is p=2; if already there, override
if (u.searchParams.has('p')) u.searchParams.set('p', String(page));
else u.searchParams.append('p', String(page));
return u.toString();
} catch {
// fallback: naive concatenation
return baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'p=' + page;
}
}

/**
* Crawl a category (listing) URL across multiple pages, optionally visiting product pages
* to enrich details if needed.
*/
async function crawlCategory(listingUrl, settings, logger) {
const results = [];
const maxPages = Math.max(1, settings.maxPages || 1);

for (let page = 1; page <= maxPages; page++) {
const pageUrl = page === 1 ? listingUrl : buildPageUrl(listingUrl, page);
logger.info(`Fetching listing page ${page}/${maxPages}: ${pageUrl}`);

const html = await getPage(pageUrl, settings, logger);
if (!html) {
logger.warn(`Empty response for ${pageUrl}, stopping pagination for this category.`);
break;
}

const listing = parseListingPage(html, pageUrl, logger);
logger.info(`Found ${listing.length} products on listing page ${page}`);

// Optionally, enrich each item by visiting the product page for extra fields.
for (const item of listing) {
try {
if (item.product_url) {
const productHtml = await getPage(item.product_url, settings, logger);
if (productHtml) {
const details = parseProductPage(productHtml, item.product_url, logger);
results.push({ ...item, ...details });
} else {
results.push(item);
}
} else {
results.push(item);
}
} catch (err) {
logger.error(`Failed to enrich product ${item.product_url || item.product_name}: ${err.message}`);
results.push(item);
}
}

// If listing yielded nothing, assume we're done.
if (listing.length === 0) break;
}

return dedupeByUrl(results);
}

function dedupeByUrl(items) {
const seen = new Set();
const out = [];
for (const it of items) {
const key = it.product_url || it.product_name || JSON.stringify(it);
if (!seen.has(key)) {
seen.add(key);
out.push(it);
}
}
return out;
}

module.exports = { crawlCategory };