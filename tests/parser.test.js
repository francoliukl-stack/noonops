const test = require("node:test");
const assert = require("node:assert/strict");
const parser = require("../src/parser.js");

function fakeNode(textContent, attrs = {}, selectorMap = {}, selectorAllMap = {}) {
  return {
    textContent,
    querySelector(selector) {
      return selectorMap[selector] || null;
    },
    querySelectorAll(selector) {
      return selectorAllMap[selector] || [];
    },
    getAttribute(name) {
      return attrs[name] || "";
    },
    matches() {
      return Boolean(attrs.matches);
    },
    closest() {
      return attrs.closest || null;
    }
  };
}

test("isNoonHost only accepts noon domains", () => {
  assert.equal(parser.isNoonHost("www.noon.com"), true);
  assert.equal(parser.isNoonHost("noon.com"), true);
  assert.equal(parser.isNoonHost("example.com"), false);
});

test("parseSalesText supports common sales formats", () => {
  assert.equal(parser.parseSalesText("100 sold"), 100);
  assert.equal(parser.parseSalesText("100+ sold"), 100);
  assert.equal(parser.parseSalesText("1.2K sold"), 1200);
  assert.equal(parser.parseSalesText("10k+"), 10000);
  assert.equal(parser.parseSalesText("860+ sold recently"), 860);
  assert.equal(parser.parseSalesText(""), undefined);
});

test("parseReviewCountText supports noon Ratings text", () => {
  assert.equal(parser.parseReviewCountText("40 Ratings"), 40);
  assert.equal(parser.parseReviewCountText("3.4 (62)"), 62);
  assert.equal(parser.parseReviewCountText("4.7 23 AED 129"), 23);
  assert.equal(parser.parseReviewCountText("4.7 ★★★★★ 23 | Best Seller"), 23);
});

test("sales signal uses sold first and ratings as fallback", () => {
  assert.deepEqual(parser.getSalesSignal({ salesCount: 860, salesText: "860+ sold recently", reviewCount: 40 }), {
    count: 860,
    text: "860+ sold recently",
    source: "sold"
  });
  assert.deepEqual(parser.getSalesSignal({ reviewCount: 40 }), {
    count: 40,
    text: "40 Ratings",
    source: "ratings"
  });
});

test("extractDetailProduct reads noon detail page sales from body text", () => {
  const body = fakeNode("3.8 40 Ratings AED 12.00 860+ sold recently", {}, {
    '[data-qa*="price"]': fakeNode("AED 12.00"),
    "img[alt], img[src]": fakeNode("", { src: "/image.jpg" })
  });
  const documentLike = fakeNode("", {}, {
    h1: fakeNode("Giant Glitter Dumpling")
  });
  documentLike.body = body;
  documentLike.location = {
    href: "https://www.noon.com/uae-en/giant-glitter-dumpling/Z488/p/"
  };
  documentLike.title = "Giant Glitter Dumpling | noon";

  const product = parser.extractDetailProduct(documentLike, documentLike.location.href);

  assert.equal(product.title, "Giant Glitter Dumpling");
  assert.equal(product.price, 12);
  assert.equal(product.salesCount, 860);
  assert.equal(product.reviewCount, 40);
  assert.equal(product.salesSignalCount, 860);
  assert.equal(product.salesSignalSource, "sold");
});

test("extractDetailProduct falls back to Ratings as sales signal", () => {
  const body = fakeNode("3.8 40 Ratings AED 12.00", {}, {
    '[data-qa*="price"]': fakeNode("AED 12.00")
  });
  const documentLike = fakeNode("", {}, {
    h1: fakeNode("Giant Glitter Dumpling")
  });
  documentLike.body = body;
  documentLike.location = {
    href: "https://www.noon.com/uae-en/giant-glitter-dumpling/Z488/p/"
  };

  const product = parser.extractDetailProduct(documentLike, documentLike.location.href);

  assert.equal(product.salesCount, undefined);
  assert.equal(product.reviewCount, 40);
  assert.equal(product.salesSignalCount, 40);
  assert.equal(product.salesSignalSource, "ratings");
});

test("extractDetailProduct reads adjacent detail page rating count when rating node omits label", () => {
  const body = fakeNode("Dreamhouse Playset Pool Party Doll House with 75 Pieces and 3 Story Slide 4.7 23 AED 129.00", {}, {
    '[data-qa*="price"]': fakeNode("AED 129.00"),
    '[class*="rating"]': fakeNode("4.7")
  });
  const documentLike = fakeNode("", {}, {
    h1: fakeNode("Dreamhouse Playset Pool Party Doll House")
  });
  documentLike.body = body;
  documentLike.location = {
    href: "https://www.noon.com/uae-en/dreamhouse-playset-pool-party-doll-house/Z779A06B254C62B0273EBZ/p/"
  };

  const product = parser.extractDetailProduct(documentLike, documentLike.location.href);

  assert.equal(product.reviewCount, 23);
  assert.equal(product.salesSignalCount, 23);
  assert.equal(product.salesSignalSource, "ratings");
});

test("extractProducts deduplicates detail page product card with the same SKU", () => {
  const cardLink = fakeNode("Dreamhouse Playset Pool Party Doll House", {
    href: "/uae-en/dreamhouse-playset-pool-party-doll-house/Z779A06B254C62B0273EBZ/p/?o=abc",
    matches: true
  });
  const card = fakeNode("Dreamhouse Playset Pool Party Doll House 4.7 23 AED 129", { matches: false }, {
    'a[href]': cardLink
  });
  cardLink.closest = () => card;
  const body = fakeNode("Dreamhouse Playset Pool Party Doll House 4.7 ★★★★★ 23 AED 129.00", {}, {
    '[data-qa*="price"]': fakeNode("AED 129.00")
  });
  const documentLike = fakeNode("", {}, {
    h1: fakeNode("Dreamhouse Playset Pool Party Doll House")
  }, {
    '[data-qa*="product"]': [],
    '[data-testid*="product"]': [],
    '[class*="productContainer"]': [],
    '[class*="ProductBox"]': [],
    '[class*="productBox"]': [],
    '[class*="ProductCard"]': [],
    '[class*="product-card"]': [],
    'a[href*="/p/"]': [cardLink],
    'a[href*="/uae-en/"]': [cardLink],
    'a[href*="/saudi-en/"]': [],
    'a[href*="/egypt-en/"]': []
  });
  documentLike.body = body;
  documentLike.location = {
    href: "https://www.noon.com/uae-en/dreamhouse-playset-pool-party-doll-house/Z779A06B254C62B0273EBZ/p/?o=z779"
  };

  const products = parser.extractProducts(documentLike, documentLike.location.href);

  assert.equal(products.length, 1);
  assert.equal(products[0].reviewCount, 23);
});

test("parsePriceText extracts currency and price", () => {
  assert.deepEqual(parser.parsePriceText("AED 129.50"), {
    price: 129.5,
    currency: "AED"
  });
  assert.deepEqual(parser.parsePriceText("SAR 1,299"), {
    price: 1299,
    currency: "SAR"
  });
});

test("default sort uses Ratings heat before sales signal", () => {
  const products = [
    { id: "a", title: "A", reviewCount: 40, salesSignalCount: 860, pagePosition: 1 },
    { id: "b", title: "B", reviewCount: 62, salesSignalCount: 100, pagePosition: 2 },
    { id: "c", title: "C", reviewCount: undefined, salesSignalCount: 1200, pagePosition: 3 }
  ];
  assert.deepEqual(parser.sortProducts(products).map((product) => product.id), ["b", "a", "c"]);
});

test("sales sort puts missing sales last", () => {
  const products = [
    { id: "a", title: "A", salesSignalCount: undefined, pagePosition: 1 },
    { id: "b", title: "B", salesSignalCount: 20, pagePosition: 2 },
    { id: "c", title: "C", salesSignalCount: 120, pagePosition: 3 }
  ];
  assert.deepEqual(parser.sortProducts(products, "sales_desc").map((product) => product.id), ["c", "b", "a"]);
});

test("exports tsv and csv with stable columns", () => {
  const products = [{
    id: "p1",
    title: "Wireless Mouse",
    url: "https://www.noon.com/p/test",
    salesCount: 1200,
    salesSignalCount: 1200,
    salesSignalSource: "sold",
    price: 49,
    currency: "AED",
    rating: 4.5,
    reviewCount: 20,
    pagePosition: 1
  }];

  assert.match(parser.toTsv(products), /^排名\t商品名称\t销量\t销量来源\t价格\t评分\t评论数\t商品链接/);
  assert.match(parser.toCsv(products), /^排名,商品名称,销量,销量来源,价格,评分,评论数,商品链接/);
  assert.match(parser.toCsv(products), /Wireless Mouse/);
});
