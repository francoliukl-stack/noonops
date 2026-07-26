# Repository Guidelines

## Project Structure & Module Organization

This repository is a Manifest V3 Chrome extension with no compile step. `manifest.json` registers `src/background.js`, which injects the parser, insight rules, panel behavior, and styles from `src/`. Keep extraction and normalization logic in `src/parser.js`, business guidance in `src/insights.js`, UI behavior in `src/content.js`, and presentation rules in `src/styles.css`.

Automated unit tests live in `tests/`. Long-term acceptance cases are stored in `evals/evaluation_set.json`; `scripts/run_evaluation.js` executes them and writes `reports/evaluation-report.md`. Product scope and engineering policy live in `docs/PRD.md` and `docs/DEVELOPMENT_RULES.md`.

## Build, Test, and Development Commands

- `npm test` runs all `node:test` unit tests. Node 18 or newer is required.
- `npm run evaluate` runs unit tests plus the persistent acceptance suite and regenerates the evaluation report.
- For manual testing, load the repository root through `chrome://extensions/` using **Load unpacked**. After code changes, reload the extension and refresh the noon page.

There is no production build command and the extension does not require `npm install` to load in Chrome.

## Coding Style & Naming Conventions

Follow the existing plain JavaScript style: two-space indentation, semicolons, double-quoted strings, and CommonJS exports where Node tests need access. Use `camelCase` for functions and variables, `PascalCase` only for constructors, and `UPPER_SNAKE_CASE` for module-level constants. Keep helpers focused and prefer explicit early returns. Do not add backend calls, telemetry, or broader Chrome permissions without an approved PRD change.

## Testing Guidelines

Use `node:test` and `node:assert/strict`. Name tests as observable behavior, for example `test("parseSalesText supports common sales formats", ...)`. Add regression coverage for parser and UI-rule changes. Every completed change must pass `npm test` and `npm run evaluate`; the generated report must show 100% of evaluation cases passing.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Fix adjacent rating heat extraction` and `Improve refresh UX and product filtering`. Keep each commit small and explain one behavior change.

Pull requests should summarize scope, reference the relevant PRD requirement or issue, list validation commands and results, and include screenshots for visible panel changes. For behavior or release changes, update `manifest.json`, `package.json`, and `evals/evaluation_set.json` to the same version, then add the newest entry at the top of `CHANGELOG.md`.
