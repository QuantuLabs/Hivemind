# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-10

### Added

- Multi-model consensus with GPT-5.2, Claude Opus 4.5, and Gemini 3 Pro
- Solo mode for individual model chat
- Hivemind mode for synthesized responses from all models
- Deliberation algorithm with up to 3 rounds of refinement
- AES-GCM encrypted API key storage with PBKDF2 key derivation
- Dark and Light theme support
- MCP server for Claude Code integration
- Web interface built with Next.js 14
- Per-message mode toggle (Solo/Hive)
- Configurable orchestrator model selection
- Google Search grounding for Gemini responses
