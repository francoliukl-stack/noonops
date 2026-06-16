const test = require("node:test");
const assert = require("node:assert/strict");
const parser = require("../src/parser.js");

function fakeNode(textContent, attrs = {}, selectorMap = {}) {
  return {
    textContent,
    querySelector(selector) {
      return selectorMap[selector] || null;
    },
    getAttribute(name) {
      return attrs[name] || "";
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

test("sortProducts puts missing sales last", () => {
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
