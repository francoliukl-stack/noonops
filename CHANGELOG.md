# Changelog

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
