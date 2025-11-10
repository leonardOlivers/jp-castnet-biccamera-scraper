onst cheerio = require('cheerio');

/**
 * Parse a Biccamera listing (category/search) page.
 * Tries multiple selector strategies to be resilient to layout changes.
 */
function parseListingPage(html, pageUrl, logger) {
  const $ = cheerio.load(html);
  const results = [];

  // Strategy 1: Common product card container (example class names)
  const candidates = [
    '.bcs_item',              // BicCamera style
    '.product',               // generic
    '.c-product-card',        // generic
    'li.product',             // generic
    '.bcs_unit',              // another bic style
    '.productList__item'      // generic
  ];

  let cards = [];
  for (const sel of candidates) {
    cards = $(sel);
    if (cards.length > 0) {
      logger.debug?.(`Using selector "${sel}" with ${cards.length} cards`);
      break;
    }
  }

  if (cards.length === 0) {
    // Fallback: try list items with product anchors
    $('a[href*="/bc/item/"]').each((_, a) => {
      const $a = $(a);
      const product_url = absoluteUrl(pageUrl, $a.attr('href'));
      const product_name = cleanText($a.text());
      if (product_url && product_name) {
        results.push({ product_name, product_url });
      }
    });
    return results;
  }

  cards.each((_, el) => {
    const $el = $(el);

    // name
    let name =
      textOrAttr($el.find('.bcs_item_title, .product__title, .title, h2, h3').first()) ||
      textOrAttr($el.find('a').first());

    name = cleanText(name);

    // url
    let href =
      $el.find('a[href*="/bc/item/"]').attr('href') ||
      $el.find('a[href]').first().attr('href');

    const product_url = absoluteUrl(pageUrl, href);

    // price (strip non-digits, keep JPY text separately)
    let price =
      textOrAttr($el.find('.bcs_item_price, .price, .product__price, [data-test="price"]').first());
    price = cleanText(price);
    if (price && /\d/.test(price)) {
      price = price.replace(/[^\d]/g, '') + ' JPY';
    } else {
      price = null;
    }

    // availability
    let availability =
      textOrAttr($el.find('.stock, .availability, .status, [data-test="availability"]').first());
    availability = cleanText(availability) || null;

    // image
    const image_url =
      absoluteUrl(pageUrl, $el.find('img').attr('data-src') || $el.find('img').attr('src')) || null;

    // brand & category are harder from listing; leave null (enrich later)
    const item = {
      product_name: name || null,
      product_url: product_url || null,
      price,
      availability,
      category: null,
      brand: null,
      rating: null,
      review_count: null,
      image_url,
      specifications: null
    };

    if (item.product_name || item.product_url) {
      results.push(item);
    }
  });

  return results;
}

/**
 * Parse a Biccamera product detail page for richer fields.
 */
function parseProductPage(html, url, logger) {
  const $ = cheerio.load(html);

  const product_name =
    cleanText(
      textOrAttr($('h1, .product-title, .bcs_item_title, [itemprop="name"]').first())
    ) || null;

  let price =
    cleanText(
      textOrAttr($('.price, .bcs_item_price, [itemprop="price"]').first())
    ) || null;

  if (price && /\d/.test(price)) {
    price = price.replace(/[^\d]/g, '') + ' JPY';
  } else {
    price = null;
  }

  const availability =
    cleanText(
      textOrAttr($('.stock, .availability, .status, [itemprop="availability"]').first())
    ) || null;

  const brand =
    cleanText(
      textOrAttr($('[itemprop="brand"], .brand, .maker').first())
    ) || null;

  const category =
    cleanText(
      textOrAttr($('.breadcrumb li:last, nav.breadcrumb li:last, [itemtype*="Breadcrumb"] a:last').first())
    ) || null;

  // rating & review count
  let rating = null;
  let review_count = null;
  const ratingNode = $('[itemprop="ratingValue"], .rating__value').first();
  if (ratingNode.length) {
    const r = parseFloat((ratingNode.text() || ratingNode.attr('content') || '').trim());
    if (!Number.isNaN(r)) rating = r;
  }
  const countNode = $('[itemprop="reviewCount"], .review__count').first();
  if (countNode.length) {
    const c = parseInt((countNode.text() || countNode.attr('content') || '').replace(/[^\d]/g, ''), 10);
    if (!Number.isNaN(c)) review_count = c;
  }

  // image
  const image_url = absoluteUrl(url, $('img#mainImg, .main-image img, [itemprop="image"]').attr('src')
    || $('img#mainImg, .main-image img, [itemprop="image"]').attr('data-src')) || null;

  // specs table
  let specifications = null;
  const specs = [];
  const specSelectors = [
    '.spec, .specs, .spec-table, table.spec, table.specs',
    'table:contains("仕様"), table:contains("スペック")'
  ];
  for (const sel of specSelectors) {
    $(sel).find('tr').each((_, tr) => {
      const $tr = $(tr);
      const k = cleanText($tr.find('th, td').first().text());
      const v = cleanText($tr.find('td').last().text());
      if (k && v) specs.push(`${k}: ${v}`);
    });
    if (specs.length) break;
  }
  if (specs.length) specifications = specs.join(', ');

  return {
    product_name,
    price,
    availability,
    brand,
    category,
    rating,
    review_count,
    image_url,
    specifications
  };
}

function cleanText(v) {
  if (!v) return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

function textOrAttr(node) {
  if (!node || node.length === 0) return '';
  return node.text?.() || node.attr?.('content') || node.attr?.('title') || node.attr?.('alt') || '';
}

function absoluteUrl(base, href) {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

module.exports = { parseListingPage, parseProductPage };