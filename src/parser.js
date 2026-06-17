(function initParser(globalScope) {
  const NOON_HOST_RE = /(^|\.)noon\.(com|ae|sa|egypt|cdn)$/i;
  const PRODUCT_CARD_SELECTORS = [
    '[data-qa*="product"]',
    '[data-testid*="product"]',
    '[class*="productContainer"]',
    '[class*="ProductBox"]',
    '[class*="productBox"]',
    '[class*="ProductCard"]',
    '[class*="product-card"]',
    'a[href*="/p/"]',
    'a[href*="/uae-en/"]',
    'a[href*="/saudi-en/"]',
    'a[href*="/egypt-en/"]'
  ];
  const AMOUNT_RE = /([0-9]+(?:[, ][0-9]{3})*(?:\.[0-9]{1,2})?)/;
  const PRICE_RE = /\b(?:AED|SAR|EGP|KWD|OMR|BHD|QAR|د\.إ|ر\.س|฿)?\s*([0-9]+(?:[, ][0-9]{3})*(?:\.[0-9]{1,2})?)\b/i;
  const CURRENCY_RE = /\b(AED|SAR|EGP|KWD|OMR|BHD|QAR)\b|د\.إ|ر\.س|฿/i;

  function isNoonHost(hostname) {
    return NOON_HOST_RE.test(String(hostname || ""));
  }

  function normalizeWhitespace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeKeyText(value) {
    return normalizeWhitespace(value)
      .toLowerCase()
      .replace(/&amp;/g, "&")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function parseCompactNumber(value) {
    const normalized = String(value || "").replace(/,/g, "").trim();
    const match = normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*([kKmM])?/);
    if (!match) {
      return undefined;
    }

    const base = Number(match[1]);
    if (!Number.isFinite(base)) {
      return undefined;
    }

    const suffix = (match[2] || "").toLowerCase();
    if (suffix === "k") {
      return Math.round(base * 1000);
    }
    if (suffix === "m") {
      return Math.round(base * 1000000);
    }
    return Math.round(base);
  }

  function parseSalesText(value) {
    const text = normalizeWhitespace(value);
    if (!text) {
      return undefined;
    }

    const salesPattern = /([0-9][0-9,]*(?:\.[0-9]+)?\s*[kKmM]?)\s*\+?\s*(?:sold|sales|ordered|orders|bought|تم البيع|مباع)/i;
    const salesMatch = text.match(salesPattern);
    if (salesMatch) {
      return parseCompactNumber(salesMatch[1]);
    }

    const loosePattern = /^([0-9][0-9,]*(?:\.[0-9]+)?\s*[kKmM]?)\+?$/i;
    const looseMatch = text.match(loosePattern);
    if (looseMatch) {
      return parseCompactNumber(looseMatch[1]);
    }

    return undefined;
  }

  function parsePriceText(value) {
    const text = normalizeWhitespace(value);
    if (!text) {
      return {};
    }

    const currencyMatch = text.match(CURRENCY_RE);
    let priceMatch;
    if (currencyMatch) {
      const afterCurrency = text.slice(currencyMatch.index + currencyMatch[0].length);
      priceMatch = afterCurrency.match(AMOUNT_RE);
    }
    if (!priceMatch) {
      priceMatch = text.match(PRICE_RE);
    }
    if (!priceMatch) {
      return {};
    }

    const amount = Number(priceMatch[1].replace(/[ ,]/g, ""));
    if (!Number.isFinite(amount)) {
      return {};
    }

    return {
      price: amount,
      currency: currencyMatch && currencyMatch[1] ? currencyMatch[1].toUpperCase() : undefined
    };
  }

  function parseRatingText(value) {
    const text = normalizeWhitespace(value);
    const match = text.match(/\b([0-5](?:\.[0-9])?)\b/);
    if (!match) {
      return undefined;
    }

    const rating = Number(match[1]);
    if (!Number.isFinite(rating) || rating > 5) {
      return undefined;
    }
    return rating;
  }

  function parseReviewCountText(value) {
    const text = normalizeWhitespace(value);
    const reviewMatch = text.match(/([0-9][0-9,]*(?:\.[0-9]+)?\s*[kKmM]?)\s*(?:reviews?|ratings?|评价|\))/i);
    if (reviewMatch) {
      return parseCompactNumber(reviewMatch[1]);
    }

    const adjacentRatingPattern = /\b[0-5](?:\.[0-9])?\b(?:\s*[★☆⭐✭✩]){0,5}\s+([0-9][0-9,]*(?:\.[0-9]+)?\s*[kKmM]?)(?=\s*(?:ratings?|reviews?|AED|SAR|EGP|KWD|OMR|BHD|QAR|د\.إ|ر\.س|$))/gi;
    let adjacentMatch;
    while ((adjacentMatch = adjacentRatingPattern.exec(text)) !== null) {
      const count = parseCompactNumber(adjacentMatch[1]);
      if (Number.isFinite(count)) {
        return count;
      }
    }

    const looseAdjacentRatingPattern = /\b[0-5](?:\.[0-9])?\b(?:\s*[★☆⭐✭✩]){0,5}\s+([1-9][0-9]{0,5})(?!\s*(?:years?|yrs?|year|%|off|discount|AED|SAR|EGP|KWD|OMR|BHD|QAR)\b)/gi;
    let looseAdjacentMatch;
    while ((looseAdjacentMatch = looseAdjacentRatingPattern.exec(text)) !== null) {
      const count = parseCompactNumber(looseAdjacentMatch[1]);
      if (Number.isFinite(count)) {
        return count;
      }
    }
    return undefined;
  }

  function getSalesSignal(product) {
    if (Number.isFinite(product.salesCount)) {
      return {
        count: product.salesCount,
        text: product.salesText || `${product.salesCount}`,
        source: "sold"
      };
    }
    if (Number.isFinite(product.reviewCount)) {
      return {
        count: product.reviewCount,
        text: `${product.reviewCount} Ratings`,
        source: "ratings"
      };
    }
    return {
      count: undefined,
      text: "",
      source: "missing"
    };
  }

  function absoluteUrl(href, baseUrl) {
    if (!href) {
      return "";
    }
    try {
      return new URL(href, baseUrl || globalScope.location.href).toString();
    } catch (_error) {
      return href;
    }
  }

  function getElementText(element) {
    return normalizeWhitespace(element ? element.textContent : "");
  }

  function firstText(root, selectors) {
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      const text = getElementText(element);
      if (text) {
        return text;
      }
    }
    return "";
  }

  function findBestTitle(card, link) {
    const byAttr = link && (link.getAttribute("title") || link.getAttribute("aria-label"));
    if (byAttr) {
      return normalizeWhitespace(byAttr);
    }

    const title = firstText(card, [
      '[data-qa*="title"]',
      '[data-testid*="title"]',
      '[class*="title"]',
      '[class*="name"]',
      'h2',
      'h3'
    ]);
    if (title) {
      return title;
    }

    const image = card.querySelector("img[alt]");
    const alt = image ? image.getAttribute("alt") : "";
    if (alt) {
      return normalizeWhitespace(alt);
    }

    return normalizeWhitespace((link && link.textContent) || "");
  }

  function findSales(card) {
    const candidates = [
      firstText(card, ['[data-qa*="sold"]', '[data-testid*="sold"]', '[class*="sold"]', '[class*="sales"]']),
      getElementText(card)
    ];

    for (const candidate of candidates) {
      const salesCount = parseSalesText(candidate);
      if (salesCount !== undefined) {
        const match = normalizeWhitespace(candidate).match(/([0-9][0-9,]*(?:\.[0-9]+)?\s*[kKmM]?\+?\s*(?:sold|sales|ordered|orders|bought|تم البيع|مباع)?)/i);
        return {
          salesText: match ? normalizeWhitespace(match[1]) : normalizeWhitespace(candidate),
          salesCount
        };
      }
    }

    return {};
  }

  function findDetailTitle(documentObject) {
    const title = firstText(documentObject, [
      'h1',
      '[data-qa*="title"]',
      '[data-testid*="title"]',
      '[class*="title"]'
    ]);
    if (title) {
      return title;
    }
    return normalizeWhitespace(documentObject.title || "").replace(/\s*\|\s*noon.*$/i, "");
  }

  function extractDetailProduct(documentObject, baseUrl) {
    const locationHref = baseUrl || documentObject.location && documentObject.location.href || "";
    if (!/\/p\/?/i.test(locationHref)) {
      return undefined;
    }

    const sourceRoot = documentObject.body || documentObject.documentElement || documentObject;
    const title = findDetailTitle(documentObject);
    if (!title) {
      return undefined;
    }

    const image = sourceRoot.querySelector('img[alt], img[src]');
    const priceInfo = findPrice(sourceRoot);
    const salesInfo = findSales(sourceRoot);
    const rating = findRating(sourceRoot) || parseRatingText(getElementText(sourceRoot));
    const reviewCount = findReviewCount(sourceRoot);
    const product = {
      id: "product-1",
      title,
      url: locationHref,
      imageUrl: image ? absoluteUrl(image.getAttribute("src") || image.getAttribute("data-src") || "", baseUrl) || undefined : undefined,
      price: priceInfo.price,
      currency: priceInfo.currency,
      originalPrice: findOriginalPrice(sourceRoot),
      discountText: findDiscount(sourceRoot) || undefined,
      salesText: salesInfo.salesText,
      salesCount: salesInfo.salesCount,
      rating,
      reviewCount,
      pagePosition: 1,
      sourceElement: sourceRoot
    };
    const salesSignal = getSalesSignal(product);
    product.salesSignalCount = salesSignal.count;
    product.salesSignalText = salesSignal.text;
    product.salesSignalSource = salesSignal.source;
    return product;
  }

  function findPrice(card) {
    const priceText = firstText(card, [
      '[data-qa*="price"]',
      '[data-testid*="price"]',
      '[class*="price"]',
      '[class*="Price"]'
    ]) || getElementText(card);

    return parsePriceText(priceText);
  }

  function findOriginalPrice(card) {
    const text = firstText(card, [
      '[data-qa*="old"]',
      '[data-testid*="old"]',
      '[class*="old"]',
      '[class*="was"]',
      'del',
      's'
    ]);
    return parsePriceText(text).price;
  }

  function findDiscount(card) {
    return firstText(card, [
      '[data-qa*="discount"]',
      '[data-testid*="discount"]',
      '[class*="discount"]',
      '[class*="Discount"]'
    ]);
  }

  function findRating(card) {
    const ratingText = firstText(card, [
      '[data-qa*="rating"]',
      '[data-testid*="rating"]',
      '[class*="rating"]',
      '[class*="Rating"]'
    ]);
    return parseRatingText(ratingText);
  }

  function parseStandaloneCountText(value) {
    const text = normalizeWhitespace(value);
    const match = text.match(/^([1-9][0-9]{0,5})(?:\s*(?:ratings?|reviews?))?$/i);
    if (!match) {
      return undefined;
    }
    return parseCompactNumber(match[1]);
  }

  function siblingText(element, direction) {
    if (!element) {
      return "";
    }
    const sibling = direction === "previous" ? element.previousElementSibling : element.nextElementSibling;
    return getElementText(sibling);
  }

  function parentText(element) {
    return getElementText(element && element.parentElement);
  }

  function findAdjacentReviewCount(card) {
    if (!card.querySelectorAll) {
      return undefined;
    }

    const ratingNodes = Array.from(card.querySelectorAll('[data-qa*="rating"], [data-testid*="rating"], [class*="rating"], [class*="Rating"]'));
    for (const node of ratingNodes) {
      const nodeText = getElementText(node);
      if (parseRatingText(nodeText) === undefined) {
        continue;
      }

      const candidates = [
        parentText(node),
        siblingText(node, "next"),
        siblingText(node, "previous"),
        getElementText(node.parentElement && node.parentElement.nextElementSibling),
        getElementText(node.parentElement && node.parentElement.previousElementSibling)
      ];

      for (const candidate of candidates) {
        const reviewCount = parseReviewCountText(candidate);
        if (reviewCount !== undefined) {
          return reviewCount;
        }
        const standaloneCount = parseStandaloneCountText(candidate);
        if (standaloneCount !== undefined) {
          return standaloneCount;
        }
      }
    }
    return undefined;
  }

  function findReviewCount(card) {
    const candidates = [
      firstText(card, ['[data-qa*="review"]', '[data-testid*="review"]', '[class*="review"]']),
      firstText(card, ['[data-qa*="rating"]', '[data-testid*="rating"]', '[class*="rating"]']),
      getElementText(card)
    ];

    for (const candidate of candidates) {
      const reviewCount = parseReviewCountText(candidate);
      if (reviewCount !== undefined) {
        return reviewCount;
      }
    }
    return findAdjacentReviewCount(card);
  }

  function findProductCards(documentRef) {
    const documentObject = documentRef || globalScope.document;
    const cards = [];
    const seen = new Set();

    for (const selector of PRODUCT_CARD_SELECTORS) {
      const nodes = Array.from(documentObject.querySelectorAll(selector));
      for (const node of nodes) {
        const card = node.matches("a") ? node.closest("article, li, div, section") || node : node;
        if (!card || seen.has(card)) {
          continue;
        }

        const link = card.matches("a[href]") ? card : card.querySelector('a[href]');
        const href = link ? link.getAttribute("href") : "";
        const text = getElementText(card);
        const hasProductSignal = href || text.match(/\b(AED|SAR|EGP|sold|rating|reviews?)\b/i);
        if (!hasProductSignal || text.length < 5) {
          continue;
        }

        seen.add(card);
        cards.push(card);
      }
    }

    return cards;
  }

  function canonicalProductKey(url, title) {
    if (url) {
      try {
        const parsed = new URL(url, globalScope.location && globalScope.location.href);
        const skuMatch = parsed.pathname.match(/\/([A-Z0-9]{8,})\/p\/?/i);
        if (skuMatch) {
          return `sku:${skuMatch[1].toUpperCase()}`;
        }
        return `url:${parsed.origin}${parsed.pathname}`.toLowerCase();
      } catch (_error) {
        return `url:${String(url).split("?")[0]}`.toLowerCase();
      }
    }
    return `title:${normalizeWhitespace(title).toLowerCase()}`;
  }

  function productIdentityKeys(product) {
    const keys = new Set();
    const canonical = canonicalProductKey(product.url, product.title);
    if (canonical) {
      keys.add(canonical);
    }

    const normalizedTitle = normalizeKeyText(product.title);
    if (normalizedTitle && normalizedTitle.length >= 12) {
      keys.add(`title:${normalizedTitle}`);
      if (Number.isFinite(product.price)) {
        keys.add(`title-price:${normalizedTitle}|${product.price}`);
      }
    }

    if (product.imageUrl) {
      try {
        const imageUrl = new URL(product.imageUrl, globalScope.location && globalScope.location.href);
        keys.add(`image:${imageUrl.origin}${imageUrl.pathname}`.toLowerCase());
      } catch (_error) {
        keys.add(`image:${String(product.imageUrl).split("?")[0]}`.toLowerCase());
      }
    }

    return Array.from(keys);
  }

  function mergeProduct(existing, incoming) {
    for (const [key, value] of Object.entries(incoming)) {
      if ((existing[key] === undefined || existing[key] === "" || existing[key] === null) && value !== undefined && value !== "") {
        existing[key] = value;
      }
    }
    if (!Number.isFinite(existing.reviewCount) && Number.isFinite(incoming.reviewCount)) {
      existing.reviewCount = incoming.reviewCount;
    }
    if (!Number.isFinite(existing.salesSignalCount) && Number.isFinite(incoming.salesSignalCount)) {
      existing.salesSignalCount = incoming.salesSignalCount;
      existing.salesSignalText = incoming.salesSignalText;
      existing.salesSignalSource = incoming.salesSignalSource;
    }
    if (!Number.isFinite(existing.price) && Number.isFinite(incoming.price)) {
      existing.price = incoming.price;
      existing.currency = incoming.currency;
    }
    return existing;
  }

  function addUniqueProduct(products, keyIndex, product) {
    const keys = productIdentityKeys(product);
    const existing = keys.map((key) => keyIndex.get(key)).find(Boolean);
    if (existing) {
      mergeProduct(existing, product);
      for (const key of keys) {
        keyIndex.set(key, existing);
      }
      return existing;
    }

    product.id = `product-${products.length + 1}`;
    product.pagePosition = products.length + 1;
    products.push(product);
    for (const key of keys) {
      keyIndex.set(key, product);
    }
    return product;
  }

  function extractProducts(documentRef, baseUrl) {
    const documentObject = documentRef || globalScope.document;
    const cards = findProductCards(documentObject);
    const products = [];
    const keyIndex = new Map();
    const detailProduct = extractDetailProduct(documentObject, baseUrl);

    if (detailProduct) {
      addUniqueProduct(products, keyIndex, detailProduct);
    }

    cards.forEach((card) => {
      const link = card.matches("a[href]") ? card : card.querySelector('a[href]');
      const url = absoluteUrl(link ? link.getAttribute("href") : "", baseUrl || documentObject.location && documentObject.location.href);
      const title = findBestTitle(card, link);
      const image = card.querySelector("img");
      const imageUrl = image ? absoluteUrl(image.getAttribute("src") || image.getAttribute("data-src") || "", baseUrl) : "";
      const priceInfo = findPrice(card);
      const salesInfo = findSales(card);
      const rating = findRating(card);
      const reviewCount = findReviewCount(card);
      const originalPrice = findOriginalPrice(card);
      const discountText = findDiscount(card);
      if (!title) {
        return;
      }
      const product = {
        id: "",
        title,
        url,
        imageUrl: imageUrl || undefined,
        price: priceInfo.price,
        currency: priceInfo.currency,
        originalPrice,
        discountText: discountText || undefined,
        salesText: salesInfo.salesText,
        salesCount: salesInfo.salesCount,
        rating,
        reviewCount,
        pagePosition: 0,
        sourceElement: card
      };
      const salesSignal = getSalesSignal(product);
      product.salesSignalCount = salesSignal.count;
      product.salesSignalText = salesSignal.text;
      product.salesSignalSource = salesSignal.source;
      addUniqueProduct(products, keyIndex, product);
    });

    return products;
  }

  function sortProducts(products, sortMode) {
    const mode = sortMode || "heat_desc";
    const copy = [...products];
    const missingLast = (field, direction) => (a, b) => {
      const av = a[field];
      const bv = b[field];
      const aMissing = av === undefined || av === null;
      const bMissing = bv === undefined || bv === null;
      if (aMissing && bMissing) {
        return a.pagePosition - b.pagePosition;
      }
      if (aMissing) {
        return 1;
      }
      if (bMissing) {
        return -1;
      }
      return direction === "asc" ? av - bv : bv - av;
    };

    if (mode === "price_asc") {
      return copy.sort(missingLast("price", "asc"));
    }
    if (mode === "price_desc") {
      return copy.sort(missingLast("price", "desc"));
    }
    if (mode === "rating_desc") {
      return copy.sort(missingLast("rating", "desc"));
    }
    if (mode === "sales_desc") {
      return copy.sort(missingLast("salesSignalCount", "desc"));
    }
    if (mode === "page_order") {
      return copy.sort((a, b) => a.pagePosition - b.pagePosition);
    }
    return copy.sort(missingLast("reviewCount", "desc"));
  }

  function summarizeProducts(products) {
    const prices = products.map((item) => item.price).filter((price) => Number.isFinite(price));
    const salesCounts = products.map((item) => item.salesSignalCount).filter((sales) => Number.isFinite(sales));
    const totalPrice = prices.reduce((sum, price) => sum + price, 0);

    return {
      totalProducts: products.length,
      productsWithSales: salesCounts.length,
      highestSales: salesCounts.length ? Math.max(...salesCounts) : undefined,
      averagePrice: prices.length ? totalPrice / prices.length : undefined
    };
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) {
      return "";
    }
    return new Intl.NumberFormat("en-US").format(value);
  }

  function formatMoney(product) {
    if (!Number.isFinite(product.price)) {
      return "";
    }
    const amount = Number(product.price).toFixed(product.price % 1 === 0 ? 0 : 2);
    return product.currency ? `${product.currency} ${amount}` : amount;
  }

  function toCsvValue(value) {
    const text = String(value === undefined || value === null ? "" : value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function buildExportRows(products) {
    return products.map((product, index) => ({
      rank: index + 1,
      title: product.title,
      sales: product.salesSignalCount === undefined ? "未识别" : product.salesSignalCount,
      salesSource: product.salesSignalSource === "ratings" ? "Ratings" : product.salesSignalSource === "sold" ? "Sold" : "",
      price: formatMoney(product),
      rating: product.rating === undefined ? "" : product.rating,
      reviewCount: product.reviewCount === undefined ? "" : product.reviewCount,
      url: product.url
    }));
  }

  function toTsv(products) {
    const headers = ["排名", "商品名称", "销量", "销量来源", "价格", "评分", "评论数", "商品链接"];
    const rows = buildExportRows(products).map((row) => [
      row.rank,
      row.title,
      row.sales,
      row.salesSource,
      row.price,
      row.rating,
      row.reviewCount,
      row.url
    ]);
    return [headers, ...rows].map((row) => row.join("\t")).join("\n");
  }

  function toCsv(products) {
    const headers = ["排名", "商品名称", "销量", "销量来源", "价格", "评分", "评论数", "商品链接"];
    const rows = buildExportRows(products).map((row) => [
      row.rank,
      row.title,
      row.sales,
      row.salesSource,
      row.price,
      row.rating,
      row.reviewCount,
      row.url
    ]);
    return [headers, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");
  }

  const api = {
    isNoonHost,
    normalizeWhitespace,
    normalizeKeyText,
    parseCompactNumber,
    parseSalesText,
    parsePriceText,
    parseRatingText,
    parseReviewCountText,
    parseStandaloneCountText,
    getSalesSignal,
    extractDetailProduct,
    canonicalProductKey,
    productIdentityKeys,
    addUniqueProduct,
    extractProducts,
    sortProducts,
    summarizeProducts,
    formatNumber,
    formatMoney,
    toTsv,
    toCsv
  };

  globalScope.NoonOpsParser = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
