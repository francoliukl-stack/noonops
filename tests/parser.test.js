const test = require("node:test");
const assert = require("node:assert/strict");
const parser = require("../src/parser.js");

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
  assert.equal(parser.parseSalesText(""), undefined);
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
    { id: "a", title: "A", salesCount: undefined, pagePosition: 1 },
    { id: "b", title: "B", salesCount: 20, pagePosition: 2 },
    { id: "c", title: "C", salesCount: 120, pagePosition: 3 }
  ];
  assert.deepEqual(parser.sortProducts(products, "sales_desc").map((product) => product.id), ["c", "b", "a"]);
});

test("exports tsv and csv with stable columns", () => {
  const products = [{
    id: "p1",
    title: "Wireless Mouse",
    url: "https://www.noon.com/p/test",
    salesCount: 1200,
    price: 49,
    currency: "AED",
    rating: 4.5,
    reviewCount: 20,
    pagePosition: 1
  }];

  assert.match(parser.toTsv(products), /^排名\t商品名称\t销量\t价格\t评分\t评论数\t商品链接/);
  assert.match(parser.toCsv(products), /^排名,商品名称,销量,价格,评分,评论数,商品链接/);
  assert.match(parser.toCsv(products), /Wireless Mouse/);
});
