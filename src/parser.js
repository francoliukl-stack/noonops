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
  const PRICE_RE = /\b(?:AED|SAR|EGP|KWD|OMR|BHD|QAR)?\s*([0-9]+(?:[, ][0-9]{3})*(?:\.[0-9]{1,2})?)\b/i;
  const CURRENCY_RE = /\b(AED|SAR|EGP|KWD|OMR|BHD|QAR)\b/i;

  function isNoonHost(hostname) {
    return NOON_HOST_RE.test(String(hostname || ""));
  }

  function normalizeWhitespace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
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
    const priceMatch = text.match(PRICE_RE);
    if (!priceMatch) {
      return {};
    }

    const amount = Number(priceMatch[1].replace(/[ ,]/g, ""));
    if (!Number.isFinite(amount)) {
      return {};
    }

    return {
      price: amount,
      currency: currencyMatch ? currencyMatch[1].toUpperCase() : undefined
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
    const reviewMatch = text.match(/([0-9][0-9,]*(?:\.[0-9]+)?\s*[kKmM]?)\s*(?:reviews?|ratings?|\))/i);
    if (reviewMatch) {
      return parseCompactNumber(reviewMatch[1]);
    }
    return undefined;
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

  function findReviewCount(card) {
    const text = firstText(card, [
      '[data-qa*="review"]',
      '[data-testid*="review"]',
      '[class*="review"]',
      '[class*="rating"]'
    ]) || getElementText(card);
    return parseReviewCountText(text);
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

  function extractProducts(documentRef, baseUrl) {
    const documentObject = documentRef || globalScope.document;
    const cards = findProductCards(documentObject);
    const products = [];
    const seenKeys = new Set();

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
      const key = url || `${title}-${products.length}`;

      if (!title || seenKeys.has(key)) {
        return;
      }

      seenKeys.add(key);
      products.push({
        id: `product-${products.length + 1}`,
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
        pagePosition: products.length + 1
      });
    });

    return products;
  }

  function sortProducts(products, sortMode) {
    const mode = sortMode || "sales_desc";
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
    if (mode === "page_order") {
      return copy.sort((a, b) => a.pagePosition - b.pagePosition);
    }
    return copy.sort(missingLast("salesCount", "desc"));
  }

  function summarizeProducts(products) {
    const prices = products.map((item) => item.price).filter((price) => Number.isFinite(price));
    const salesCounts = products.map((item) => item.salesCount).filter((sales) => Number.isFinite(sales));
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
      sales: product.salesCount === undefined ? "未识别" : product.salesCount,
      price: formatMoney(product),
      rating: product.rating === undefined ? "" : product.rating,
      reviewCount: product.reviewCount === undefined ? "" : product.reviewCount,
      url: product.url
    }));
  }

  function toTsv(products) {
    const headers = ["排名", "商品名称", "销量", "价格", "评分", "评论数", "商品链接"];
    const rows = buildExportRows(products).map((row) => [
      row.rank,
      row.title,
      row.sales,
      row.price,
      row.rating,
      row.reviewCount,
      row.url
    ]);
    return [headers, ...rows].map((row) => row.join("\t")).join("\n");
  }

  function toCsv(products) {
    const headers = ["排名", "商品名称", "销量", "价格", "评分", "评论数", "商品链接"];
    const rows = buildExportRows(products).map((row) => [
      row.rank,
      row.title,
      row.sales,
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
    parseCompactNumber,
    parseSalesText,
    parsePriceText,
    parseRatingText,
    parseReviewCountText,
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
