# Changelog

## 0.1.6 - 2026-06-17

- Strengthened product deduplication across list and detail pages using canonical SKU, normalized title, title plus price, and image identity.
- Merged duplicate product candidates instead of rendering repeated rows in the floating sort list.
- Replaced the previous static dedupe evaluation with an executable release-gate case that verifies duplicate candidates collapse to one product.
- Added regression coverage for repeated list cards with the same title but different tracking URLs.

## 0.1.5 - 2026-06-17

- Fixed heat extraction for delayed or split detail-page ratings where noon renders the score and rating count as separate nearby DOM nodes.
- Added broader support for patterns like `4.7 ★★★★★ 23`.
- Deduplicated detail-page extraction by canonical product SKU to prevent repeated product rows when switching to sales-metric sorting.
- Avoided duplicated metric pills when the selected primary metric is also one of the default secondary indicators.
- Updated PRD, evaluation set, automated tests, and evaluation report for split-rating extraction and SKU deduplication.

## 0.1.4 - 2026-06-17

- Fixed detail-page heat extraction when noon shows the ratings count as a standalone number next to the score, such as `4.7 23`.
- Updated review-count parsing to continue scanning the full product/detail text when a rating element only contains the score.
- Added regression coverage for the Dreamhouse product pattern where heat should resolve to `23 Ratings`.
- Updated PRD, evaluation set, automated tests, and evaluation report for adjacent rating-count extraction.

## 0.1.3 - 2026-06-17

- Updated product cards so the highlighted pill follows the active sorting metric instead of always highlighting sales.
- Default heat sorting now highlights heat/Ratings as the primary metric.
- Sales, price, rating, and page-order sorts each highlight their corresponding metric.
- Kept two gray secondary indicators on every product card: sales signal and price.
- Updated PRD, evaluation set, automated tests, and evaluation report for dynamic metric highlighting.

## 0.1.2 - 2026-06-17

- Changed the default product sort from sales volume to heat, using Ratings count as the primary default ordering signal.
- Kept sales-signal sorting available as a separate option for users who want to inspect sold/recent-sold metrics.
- Changed floating-panel product title clicks to locate and highlight the product on the current page instead of opening a new browser page.
- Updated PRD, evaluation set, automated tests, and evaluation report for heat sorting and current-page product location behavior.

## 0.1.1 - 2026-06-17

- Added automatic panel refresh when noon pages change through SPA navigation, browser navigation, hash changes, or asynchronous product DOM updates.
- Added sales signal parsing for product detail page text such as `860+ sold recently`.
- Added Ratings fallback parsing for list/detail page text such as `40 Ratings` and `3.4 (62)`, with source labeling so Ratings are not presented as true sold volume.
- Updated CSV and table-copy exports to include the sales signal source.
- Updated PRD, evaluation set, automated tests, and evaluation report for the new live-refresh and sales-signal requirements.

## 0.1.0 - 2026-06-16

- Initial Chrome Extension MV3 implementation.
- Added noon page panel with visible product extraction, sorting, local insights, copy, and CSV export.
- Added PRD-first development rules, reusable evaluation set, and generated evaluation report.
