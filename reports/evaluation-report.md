# Evaluation Report

- Project: Noon Sales Ops Copilot
- Evaluation set version: 0.1.0
- Generated at: 2026-06-15T23:25:44.966Z
- Evaluation cases: 10/10 passed (100%)
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
| PRICE-001 | price_parser | Price parser extracts amount and currency | passed | OK |
| SORT-001 | sorting | Default sales sorting puts missing sales last | passed | OK |
| EXPORT-001 | export | CSV and table copy exports include stable business columns | passed | OK |
| INSIGHT-001 | insights | No visible sales produces a data gap insight | passed | OK |
| INSIGHT-002 | insights | Visible sales produces top seller guidance | passed | OK |

## Automated Test Output

```text
TAP version 13
# Subtest: isNoonHost only accepts noon domains
ok 1 - isNoonHost only accepts noon domains
  ---
  duration_ms: 1.782417
  type: 'test'
  ...
# Subtest: parseSalesText supports common sales formats
ok 2 - parseSalesText supports common sales formats
  ---
  duration_ms: 1.125667
  type: 'test'
  ...
# Subtest: parsePriceText extracts currency and price
ok 3 - parsePriceText extracts currency and price
  ---
  duration_ms: 2.740375
  type: 'test'
  ...
# Subtest: sortProducts puts missing sales last
ok 4 - sortProducts puts missing sales last
  ---
  duration_ms: 0.147291
  type: 'test'
  ...
# Subtest: exports tsv and csv with stable columns
ok 5 - exports tsv and csv with stable columns
  ---
  duration_ms: 0.244583
  type: 'test'
  ...
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 75.85925
```
