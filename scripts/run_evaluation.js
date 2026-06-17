const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const parser = require(path.join(root, "src/parser.js"));
const insights = require(path.join(root, "src/insights.js"));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function normalizeUndefined(value) {
  return value === undefined ? null : value;
}

function latestChangelogVersion() {
  const changelog = readText("CHANGELOG.md");
  const match = changelog.match(/^##\s+([0-9]+\.[0-9]+\.[0-9]+)\s+-\s+\d{4}-\d{2}-\d{2}/m);
  return match ? match[1] : undefined;
}

function runCase(testCase) {
  switch (testCase.type) {
    case "version_alignment": {
      const manifest = readJson("manifest.json");
      const packageJson = readJson("package.json");
      const evaluationSet = readJson("evals/evaluation_set.json");
      assert.equal(manifest.version, testCase.version, "manifest.json version mismatch");
      assert.equal(packageJson.version, testCase.version, "package.json version mismatch");
      assert.equal(evaluationSet.version, testCase.version, "evaluation set version mismatch");
      assert.equal(latestChangelogVersion(), testCase.version, "CHANGELOG latest version mismatch");
      return;
    }
    case "file_contains": {
      const text = readText(testCase.file);
      for (const expected of testCase.contains) {
        assert.ok(text.includes(expected), `Missing text: ${expected}`);
      }
      return;
    }
    case "manifest": {
      const manifest = readJson("manifest.json");
      assert.equal(manifest.manifest_version, testCase.expected.manifest_version);
      assert.deepEqual(manifest.permissions, testCase.expected.permissions);
      return;
    }
    case "host_support": {
      for (const host of testCase.accepted) {
        assert.equal(parser.isNoonHost(host), true, `${host} should be accepted`);
      }
      for (const host of testCase.rejected) {
        assert.equal(parser.isNoonHost(host), false, `${host} should be rejected`);
      }
      return;
    }
    case "sales_parser": {
      for (const sample of testCase.samples) {
        assert.equal(normalizeUndefined(parser.parseSalesText(sample.input)), sample.expected, sample.input);
      }
      return;
    }
    case "review_parser": {
      for (const sample of testCase.samples) {
        assert.equal(normalizeUndefined(parser.parseReviewCountText(sample.input)), sample.expected, sample.input);
      }
      return;
    }
    case "sales_signal": {
      for (const sample of testCase.samples) {
        assert.deepEqual(parser.getSalesSignal(sample.product), sample.expected);
      }
      return;
    }
    case "price_parser": {
      for (const sample of testCase.samples) {
        assert.deepEqual(parser.parsePriceText(sample.input), sample.expected, sample.input);
      }
      return;
    }
    case "sort": {
      const sorted = parser.sortProducts(testCase.products, testCase.mode).map((product) => product.id);
      assert.deepEqual(sorted, testCase.expectedOrder);
      return;
    }
    case "dedupe_products": {
      const products = [];
      const keyIndex = new Map();
      for (const product of testCase.products) {
        parser.addUniqueProduct(products, keyIndex, { ...product });
      }
      assert.equal(products.length, testCase.expectedCount);
      return;
    }
    case "product_filter": {
      for (const sample of testCase.samples) {
        assert.equal(parser.isLikelyProduct(sample.product), sample.expected, sample.title || sample.product.title);
      }
      return;
    }
    case "display_ready_product": {
      for (const sample of testCase.samples) {
        assert.equal(parser.isDisplayReadyProduct(sample.product), sample.expected, sample.title || sample.product.title);
      }
      return;
    }
    case "export_columns": {
      const sample = [{
        id: "p1",
        title: "Sample",
        url: "https://www.noon.com/p/sample",
        salesCount: 10,
        salesSignalCount: 10,
        salesSignalSource: "sold",
        price: 20,
        currency: "AED",
        rating: 4.5,
        reviewCount: 2,
        pagePosition: 1
      }];
      const expectedHeader = testCase.expectedColumns.join(",");
      assert.ok(parser.toCsv(sample).startsWith(expectedHeader));
      assert.ok(parser.toTsv(sample).startsWith(testCase.expectedColumns.join("\t")));
      return;
    }
    case "insight": {
      const result = insights.createInsights(testCase.products);
      assert.ok(result.some((item) => item.type === testCase.expectedType), `Missing insight: ${testCase.expectedType}`);
      return;
    }
    default:
      throw new Error(`Unsupported evaluation case type: ${testCase.type}`);
  }
}

function runNodeTests() {
  return spawnSync(process.execPath, ["--test"], {
    cwd: root,
    encoding: "utf8"
  });
}

function writeReport(evaluationSet, caseResults, nodeTestResult) {
  const passed = caseResults.filter((result) => result.status === "passed").length;
  const total = caseResults.length;
  const nodePassed = nodeTestResult.status === 0;
  const allPassed = passed === total && nodePassed;
  const passRate = total === 0 ? 100 : Math.round((passed / total) * 10000) / 100;
  const now = new Date().toISOString();
  const lines = [
    "# Evaluation Report",
    "",
    `- Project: ${evaluationSet.project}`,
    `- Evaluation set version: ${evaluationSet.version}`,
    `- Generated at: ${now}`,
    `- Evaluation cases: ${passed}/${total} passed (${passRate}%)`,
    `- Node tests: ${nodePassed ? "passed" : "failed"}`,
    `- Completion status: ${allPassed ? "COMPLETE" : "BLOCKED"}`,
    "",
    "## Case Results",
    "",
    "| ID | Category | Title | Status | Detail |",
    "| --- | --- | --- | --- | --- |"
  ];

  for (const result of caseResults) {
    lines.push(`| ${result.id} | ${result.category} | ${result.title} | ${result.status} | ${result.detail.replace(/\|/g, "\\|")} |`);
  }

  lines.push("", "## Automated Test Output", "");
  lines.push("```text");
  lines.push((nodeTestResult.stdout || "").trim());
  if (nodeTestResult.stderr) {
    lines.push((nodeTestResult.stderr || "").trim());
  }
  lines.push("```", "");

  const reportPath = path.join(root, evaluationSet.completionPolicy.reportPath);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

  return { allPassed, reportPath, passed, total, passRate, nodePassed };
}

function main() {
  const evaluationSet = readJson("evals/evaluation_set.json");
  const caseResults = evaluationSet.cases.map((testCase) => {
    try {
      runCase(testCase);
      return {
        id: testCase.id,
        category: testCase.category,
        title: testCase.title,
        status: "passed",
        detail: "OK"
      };
    } catch (error) {
      return {
        id: testCase.id,
        category: testCase.category,
        title: testCase.title,
        status: "failed",
        detail: error.message
      };
    }
  });

  const nodeTestResult = runNodeTests();
  const summary = writeReport(evaluationSet, caseResults, nodeTestResult);

  console.log(`Evaluation cases: ${summary.passed}/${summary.total} passed (${summary.passRate}%)`);
  console.log(`Node tests: ${summary.nodePassed ? "passed" : "failed"}`);
  console.log(`Report: ${path.relative(root, summary.reportPath)}`);

  if (!summary.allPassed) {
    process.exitCode = 1;
  }
}

main();
