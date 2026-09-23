# Changelog - @lanonasis/memory-sdk-standalone

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2026-09-23

### Changed
- **Repository metadata corrected (PR-A.2).** The `repository`, `homepage`,
  and `bugs` fields no longer point at the private monorepo
  (`thefixer3x/lan-onasis-monorepo`); they now point at the public
  `lanonasis/lanonasis-maas` repo with the correct directory path
  (`packages/memory-sdk`). This unblocks npmjs.com and GitHub Packages
  from correctly linking the package to its public source.
- Engines requirement declared: `node >= 18`.
- Files allowlist expanded to include `LICENSE` and `CHANGELOG.md`.

## [1.1.0] - 2026-05-12

Initial published release of the standalone Memory SDK.
