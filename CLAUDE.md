# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chrome MV3 extension (no build step, no bundler, no dependencies) that reads the products currently rendered on a noon.com page, sorts them by heat (Ratings count) and shows sales-ops suggestions in a right-hand floating panel. All analysis is local — no backend, no network calls, no page data leaves the browser. Documentation and UI strings are in Chinese; code identifiers are English.

## Commands

```bash
npm test                       # node --test over tests/*.test.js
node --test tests/parser.test.js                    # single file
node --test --test-name-pattern="parseSalesText"    # single test
npm run evaluate               # full release gate; writes reports/evaluation-report.md
```

`npm run evaluate` is the gate that matters: it runs every case in `evals/evaluation_set.json`, then shells out to `node --test`, then writes the report. It exits non-zero unless everything passes. Never edit `reports/evaluation-report.md` by hand — it is generated.

Manual verification: load the unpacked directory via `chrome://extensions/` (developer mode). After a code change, hit "重新加载" on the extension card *and* reload the noon page — the content scripts are injected on action click, so a stale page keeps the old code.

## Release rules (enforced by the evaluation gate, not just convention)

Every functional or documentation change must:

1. Bump the version in **all three** of `manifest.json`, `package.json`, `evals/evaluation_set.json` to the same value (case `VERSION-001`).
2. Add a matching `## X.Y.Z - YYYY-MM-DD` section at the **top** of `CHANGELOG.md` — the gate parses the first such heading and compares it to the version.
3. Add or update an evaluation case in `evals/evaluation_set.json` covering the change. Cases must not be deleted to make the suite green; if one has to change, justify it against `docs/PRD.md`.

`docs/DEVELOPMENT_RULES.md` also requires: PRD-first (changes must trace to `docs/PRD.md`), and surfacing conflicts between PRD / code / Chrome permissions / noon DOM explicitly rather than silently working around them.

### The `file_contains` trap

Several evaluation cases (`METRIC-001`, `LOCATE-001`, `AUTO-001`, `README-001`, `PRD-001`, `DEV-001`) assert that specific **literal substrings** exist in `src/content.js`, `README.md`, `docs/PRD.md`, and `docs/DEVELOPMENT_RULES.md` — function names, CSS class names, even fragments like `inline: "center"` and `state.sortMode === "price_asc"`. Renaming a function or reformatting a line in those files will fail the gate even when behavior is unchanged. Check `evals/evaluation_set.json` before refactoring names in `src/content.js`, and update the case together with the code.

## Architecture

Four files, injected in order by `src/background.js` on toolbar-icon click (`chrome.scripting.executeScript` with `activeTab` + `scripting` — there is no `content_scripts` block and no host permissions in the manifest):

- **`src/parser.js`** — all DOM extraction and pure data logic. No UI. This is the only file with real test coverage.
- **`src/insights.js`** — pure function `createInsights(products)` → local rule-based suggestion objects.
- **`src/content.js`** — panel UI, refresh state machine, sorting/export/locate interactions.
- **`src/styles.css`** — injected separately via `insertCSS`.

Each of `parser.js` / `insights.js` is an IIFE that publishes to `globalScope.NoonOpsParser` / `NoonOpsInsights` **and** `module.exports` when present. That dual export is why Node tests and `scripts/run_evaluation.js` can `require()` browser code directly — keep it when adding a module. `content.js` guards re-injection with `globalScope.__NOON_OPS_COPILOT_READY__`.

### Extraction pipeline (`parser.js`)

`extractProducts` → candidate cards from a fixed list of loose selectors (`[data-qa*="product"]`, `a[href*="/p/"]`, …) → per-card field extraction → `isLikelyProduct` filter → `addUniqueProduct` dedupe. On a `/p/` URL, `extractDetailProduct` also contributes the detail-page product first.

Two distinct filters, both meaningful:
- `isLikelyProduct` — is this a product at all (drops nav, promo blocks, filter chips).
- `isDisplayReadyProduct` — additionally requires a usable `/p/` link and at least one metric; only these reach the list, copy, and CSV. `content.js` uses the gap between the two counts as `skippedProducts`.

Dedupe (`productIdentityKeys` + `addUniqueProduct`) keys on SKU-from-URL, canonical URL, normalized title, title+price, and image path; a hit merges fields into the existing product rather than adding a row.

`getSalesSignal` encodes the core domain distinction: real `sold` counts are the true sales signal, Ratings count is a *fallback heat* signal, and `salesSignalSource` (`sold` / `ratings` / `missing`) is carried through sorting, the card UI, and the export column so the two are never conflated.

Heat parsing is the fragile part — noon renders Ratings in several shapes (`40 Ratings`, `3.4 (62)`, `4.7 23`, `4.7 ★★★★★ 23`), handled by layered regexes in `parseReviewCountText` plus DOM-neighbour probing in `findAdjacentReviewCount`. New page layouts almost always mean a new sample here plus a `review_parser` evaluation sample.

### Refresh state machine (`content.js`)

Refreshes are progressive and stability-based, not one-shot. `requestRefresh(reason)` starts a run (`refreshRunId` invalidates in-flight older runs), then `runRefreshAttempt` re-analyses on a timer until the page signature repeats (`minStablePasses`) or `attempts` is exhausted. Navigation reasons (`url`, `click`) get more attempts, clear the old product list, and withhold committing results until `minAttempts` (`shouldCommitResult`) so a half-loaded SPA page never renders as the final answer; skeleton rows and a progress bar cover the gap.

Auto-refresh triggers: `MutationObserver` filtered by `mutationLooksRelevant`, monkey-patched `history.pushState`/`replaceState`, `popstate`/`hashchange`, in-page link clicks, and a location poll — noon is an SPA, so URL changes alone are not observable.

Sorting is driven by `state.sortMode` (default `heat_desc` = reviewCount desc). `getPrimaryMetric`/`getSecondaryMetrics` make the highlighted metric on each card follow the active sort, without repeating it in the secondary row.

Clicking a product title **locates** rather than navigates: `locateProduct` temporarily collapses the panel, centers and highlights the source element, then `scheduleLocateVisibilityChecks` re-checks and nudges scroll if the target is still occluded.

## Scope boundaries

Do not add: page auto-scrolling or pagination, background scraping, network requests, storage of page data, or extra manifest permissions. The extension analyzes only what is already rendered.

`CONTEXT.md` and `docs/adr/` (both untracked) describe a much larger future product — a localhost web workspace with snapshots, weekly recommendations, and AI attribute judgement — in which this extension is only one entry point. They are design context, not a description of this codebase; nothing in them is implemented here.
