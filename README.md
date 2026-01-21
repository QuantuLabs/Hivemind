# Hivemind

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Multi-model AI consensus platform that queries GPT-5, Claude Opus 4.5, and Gemini 3 simultaneously to deliver synthesized, high-confidence responses.

## Features

- **Multi-Model Consensus**: Query 3 leading AI models simultaneously
- **Deliberation Algorithm**: Up to 3 rounds of refinement to reach consensus
- **Solo Mode**: Chat with individual models
- **Hivemind Mode**: Get synthesized responses from all models
- **Secure Storage**: API keys encrypted with AES-GCM
- **Dark/Light Theme**: Full theme support

## Quick Start

### Prerequisites

- API keys for at least one provider:
  - OpenAI API key
  - Google AI API key

### Installation (npm)

The simplest way to use Hivemind with Claude Code:

```bash
# Install globally
npm install -g @quantulabs/hivemind

# Add to Claude Code
claude mcp add hivemind -- hivemind
```

### Configuration

Configure your API keys using one of these methods:

1. **Via Claude Code**: Use the `configure_keys` tool
2. **Environment variables**: Set `OPENAI_API_KEY` and/or `GOOGLE_API_KEY`
3. **Config file**: Create `~/.config/hivemind/.env`:
   ```
   OPENAI_API_KEY=sk-...
   GOOGLE_API_KEY=AIza...
   ```

### Development Installation

For contributing or running from source:

```bash
# Clone the repository
git clone https://github.com/QuantuLabs/hivemind.git
cd hivemind

# Install dependencies (requires Bun >= 1.0)
bun install

# Build
bun run build

# Start development server
bun dev
```

### Configuration

1. Open the app at `http://localhost:3000`
2. Click the settings icon (gear) in the top right
3. Enter your API keys
4. Set a password to encrypt your keys locally

## Project Structure

```
hivemind/
├── apps/
│   └── web/              # Next.js 14 frontend
├── packages/
│   ├── core/             # Shared consensus logic & providers
│   └── mcp/              # Model Context Protocol server
└── .claude/              # Claude Code integration
```

## Supported Models

### OpenAI
- GPT-5.2 (default)
- GPT-5.1, GPT-5, GPT-5 Mini, GPT-5 Nano
- O4 Mini

### Anthropic
- Claude Opus 4.5 (default)
- Claude Sonnet 4.5, Claude Opus 4, Claude Sonnet 4

### Google
- Gemini 3 Pro (default)
- Gemini 3 Flash, Gemini 2.5 Pro/Flash/Flash Lite, Gemini 2.0 Flash

## Development

```bash
# Run all tests
bun test

# Run tests with coverage
bun test:coverage

# Build all packages
bun build

# Lint code
bun lint
```

## How Consensus Works

1. **Initial Query**: All 3 models receive the same question
2. **Analysis**: An orchestrator analyzes responses for agreements/divergences
3. **Refinement**: If no consensus, models see other perspectives and refine
4. **Synthesis**: Final response synthesizes agreed points and addresses divergences

## MCP Integration

Hivemind includes an MCP server for Claude Code integration:

```bash
# Install from npm (recommended)
npm install -g @quantulabs/hivemind
claude mcp add hivemind -- hivemind

# Or run from local build
claude mcp add hivemind -- node /path/to/hivemind/packages/mcp/dist/index.js
```

### Available Tools

| Tool | Description |
|------|-------------|
| `hivemind` | Query GPT-5.2 & Gemini 3 Pro, get raw responses for Claude to orchestrate |
| `configure_keys` | Set API keys (stored securely) |
| `check_status` | Check configuration and active providers |
| `configure_hive` | Toggle grounding search and Claude Code mode |
| `check_stats` | View token usage and cost statistics |

### Claude Code Commands

- `/hive <question>` - Orchestrate multi-model consensus with Claude as the synthesizer
- `/hive-config` - Configure API keys and settings
- `/hivestats` - View usage statistics

### Automatic Hivemind Fallback

Copy `CLAUDE.md.example` to your project's `.claude/CLAUDE.md` to enable automatic Hivemind consultation when Claude is stuck (after 3+ failed attempts).

## Prompt Caching

All providers use optimized caching for cost reduction on follow-up queries:

| Provider | Type | Savings | Min Tokens |
|----------|------|---------|------------|
| OpenAI | Automatic | 50% | 1024 |
| Gemini 2.5+ | Implicit | 90% | - |
| Anthropic | Explicit | 90% | 1024 |

## Security

- API keys are encrypted using AES-GCM with PBKDF2 key derivation
- Keys are stored locally in browser localStorage (never sent to servers)
- Session persistence uses sessionStorage (cleared on browser close)

## License

MIT

---

Developed by [QuantuLabs](https://github.com/QuantuLabs)
