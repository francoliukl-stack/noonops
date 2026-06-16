# Evaluation Report

- Project: Noon Sales Ops Copilot
- Evaluation set version: 0.1.5
- Generated at: 2026-06-16T17:46:53.435Z
- Evaluation cases: 18/18 passed (100%)
- Node tests: passed
- Completion status: COMPLETE

## Case Results

| ID | Category | Title | Status | Detail |
| --- | --- | --- | --- | --- |
| VERSION-001 | release_hygiene | Package, manifest, evaluation set, and changelog latest version stay aligned | passed | OK |
| PRD-001 | prd_traceability | PRD is stored as Markdown and includes evaluation policy | passed | OK |
| DEV-001 | development_standard | Development rules require PRD-first and full evaluation | passed | OK |
| MV3-001 | extension_manifest | Chrome extension uses Manifest V3 and minimal active tab injection | passed | OK |
| HOST-001 | domain_support | Noon domains are supported and non-noon domains are rejected | passed | OK |
| SALES-001 | sales_parser | Sales parser supports common visible sales formats | passed | OK |
| RATINGS-001 | ratings_parser | Ratings count from noon list/detail pages can be used as sales signal fallback | passed | OK |
| SIGNAL-001 | sales_signal | Sales signal prefers sold recently and falls back to ratings | passed | OK |
| PRICE-001 | price_parser | Price parser extracts amount and currency | passed | OK |
| SORT-000 | sorting | Default sorting uses Ratings heat instead of sales volume | passed | OK |
| SORT-001 | sorting | Default sales sorting puts missing sales last | passed | OK |
| EXPORT-001 | export | CSV and table copy exports include stable business columns | passed | OK |
| DEDUPE-001 | extraction | Detail page extraction deduplicates product cards by canonical SKU | passed | OK |
| METRIC-001 | interaction | Product cards highlight the active sorting metric and avoid duplicate secondary indicators | passed | OK |
| LOCATE-001 | interaction | Product title click locates the current page item instead of opening a new page | passed | OK |
| AUTO-001 | interaction | Panel auto refreshes when URL or page product DOM changes | passed | OK |
| INSIGHT-001 | insights | No visible sales produces a data gap insight | passed | OK |
| INSIGHT-002 | insights | Visible sales produces top seller guidance | passed | OK |

## Automated Test Output

```text
TAP version 13
# Subtest: isNoonHost only accepts noon domains
ok 1 - isNoonHost only accepts noon domains
  ---
  duration_ms: 0.733541
  type: 'test'
  ...
# Subtest: parseSalesText supports common sales formats
ok 2 - parseSalesText supports common sales formats
  ---
  duration_ms: 0.336792
  type: 'test'
  ...
# Subtest: parseReviewCountText supports noon Ratings text
ok 3 - parseReviewCountText supports noon Ratings text
  ---
  duration_ms: 0.404667
  type: 'test'
  ...
# Subtest: sales signal uses sold first and ratings as fallback
ok 4 - sales signal uses sold first and ratings as fallback
  ---
  duration_ms: 0.538583
  type: 'test'
  ...
# Subtest: extractDetailProduct reads noon detail page sales from body text
ok 5 - extractDetailProduct reads noon detail page sales from body text
  ---
  duration_ms: 0.611583
  type: 'test'
  ...
# Subtest: extractDetailProduct falls back to Ratings as sales signal
ok 6 - extractDetailProduct falls back to Ratings as sales signal
  ---
  duration_ms: 0.139125
  type: 'test'
  ...
# Subtest: extractDetailProduct reads adjacent detail page rating count when rating node omits label
ok 7 - extractDetailProduct reads adjacent detail page rating count when rating node omits label
  ---
  duration_ms: 0.129791
  type: 'test'
  ...
# Subtest: extractProducts deduplicates detail page product card with the same SKU
ok 8 - extractProducts deduplicates detail page product card with the same SKU
  ---
  duration_ms: 0.511167
  type: 'test'
  ...
# Subtest: parsePriceText extracts currency and price
ok 9 - parsePriceText extracts currency and price
  ---
  duration_ms: 0.234875
  type: 'test'
  ...
# Subtest: default sort uses Ratings heat before sales signal
ok 10 - default sort uses Ratings heat before sales signal
  ---
  duration_ms: 0.287792
  type: 'test'
  ...
# Subtest: sales sort puts missing sales last
ok 11 - sales sort puts missing sales last
  ---
  duration_ms: 0.085666
  type: 'test'
  ...
# Subtest: exports tsv and csv with stable columns
ok 12 - exports tsv and csv with stable columns
  ---
  duration_ms: 0.218667
  type: 'test'
  ...
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 73.921875
```
