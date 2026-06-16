# Evaluation Report

- Project: Noon Sales Ops Copilot
- Evaluation set version: 0.1.0
- Generated at: 2026-06-16T16:35:24.714Z
- Evaluation cases: 13/13 passed (100%)
- Node tests: passed
- Completion status: COMPLETE

## Case Results

| ID | Category | Title | Status | Detail |
| --- | --- | --- | --- | --- |
| PRD-001 | prd_traceability | PRD is stored as Markdown and includes evaluation policy | passed | OK |
| DEV-001 | development_standard | Development rules require PRD-first and full evaluation | passed | OK |
| MV3-001 | extension_manifest | Chrome extension uses Manifest V3 and minimal active tab injection | passed | OK |
| HOST-001 | domain_support | Noon domains are supported and non-noon domains are rejected | passed | OK |
| SALES-001 | sales_parser | Sales parser supports common visible sales formats | passed | OK |
| RATINGS-001 | ratings_parser | Ratings count from noon list/detail pages can be used as sales signal fallback | passed | OK |
| SIGNAL-001 | sales_signal | Sales signal prefers sold recently and falls back to ratings | passed | OK |
| PRICE-001 | price_parser | Price parser extracts amount and currency | passed | OK |
| SORT-001 | sorting | Default sales sorting puts missing sales last | passed | OK |
| EXPORT-001 | export | CSV and table copy exports include stable business columns | passed | OK |
| AUTO-001 | interaction | Panel auto refreshes when URL or page product DOM changes | passed | OK |
| INSIGHT-001 | insights | No visible sales produces a data gap insight | passed | OK |
| INSIGHT-002 | insights | Visible sales produces top seller guidance | passed | OK |

## Automated Test Output

```text
TAP version 13
# Subtest: isNoonHost only accepts noon domains
ok 1 - isNoonHost only accepts noon domains
  ---
  duration_ms: 0.760875
  type: 'test'
  ...
# Subtest: parseSalesText supports common sales formats
ok 2 - parseSalesText supports common sales formats
  ---
  duration_ms: 0.369625
  type: 'test'
  ...
# Subtest: parseReviewCountText supports noon Ratings text
ok 3 - parseReviewCountText supports noon Ratings text
  ---
  duration_ms: 0.110417
  type: 'test'
  ...
# Subtest: sales signal uses sold first and ratings as fallback
ok 4 - sales signal uses sold first and ratings as fallback
  ---
  duration_ms: 0.594875
  type: 'test'
  ...
# Subtest: extractDetailProduct reads noon detail page sales from body text
ok 5 - extractDetailProduct reads noon detail page sales from body text
  ---
  duration_ms: 0.568375
  type: 'test'
  ...
# Subtest: extractDetailProduct falls back to Ratings as sales signal
ok 6 - extractDetailProduct falls back to Ratings as sales signal
  ---
  duration_ms: 0.157666
  type: 'test'
  ...
# Subtest: parsePriceText extracts currency and price
ok 7 - parsePriceText extracts currency and price
  ---
  duration_ms: 0.097917
  type: 'test'
  ...
# Subtest: sortProducts puts missing sales last
ok 8 - sortProducts puts missing sales last
  ---
  duration_ms: 0.087208
  type: 'test'
  ...
# Subtest: exports tsv and csv with stable columns
ok 9 - exports tsv and csv with stable columns
  ---
  duration_ms: 0.397166
  type: 'test'
  ...
1..9
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 77.111958
```
