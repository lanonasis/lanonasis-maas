# Changelog - @lanonasis/claude-memory

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Metadata normalization (PR-A.2).** Added `engines.node >= 18`; expanded
  files allowlist to include `README.md`, `LICENSE`, `CHANGELOG.md`;
  expanded keywords (`mcp`, `hooks`, `productivity`).
- Repository, homepage, and bugs fields already pointed at the canonical
  public repo (`lanonasis/lanonasis-maas`) — no change required.

## [0.1.0] - 2026-08-01

Initial scaffold of the Claude Code memory plugin. Provides recall hooks
(UserPromptSubmit), Stop capture, and PreCompact hooks via `bun`.
