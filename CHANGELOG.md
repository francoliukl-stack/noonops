# Changelog

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
