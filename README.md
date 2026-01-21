# Hivemind

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@quantulabs/hivemind.svg)](https://www.npmjs.com/package/@quantulabs/hivemind)

Multi-model AI consensus platform that queries GPT-5.2, Claude Opus 4.5, and Gemini 3 Pro simultaneously to deliver synthesized, high-confidence responses.

---

## MCP Server (Claude Code / CLI)

Use Hivemind directly in Claude Code or any MCP-compatible client.

### Installation

```bash
npm install -g @quantulabs/hivemind
claude mcp add hivemind -- hivemind
```

### Configuration

**Option 1: Interactive setup (recommended)**
```bash
/hive-config
```
Follow the prompts to paste your API keys.

**Option 2: Manual .env file**
```bash
# Copy the example file
mkdir -p ~/.config/hivemind
cp node_modules/@quantulabs/hivemind/.env.example ~/.config/hivemind/.env

# Edit and add your keys
nano ~/.config/hivemind/.env
```

**Option 3: Environment variables**
```bash
export OPENAI_API_KEY=sk-...
export GOOGLE_API_KEY=AIza...
```

### Usage

```bash
/hive "Why is my WebSocket connection dropping?"
```

Claude orchestrates the consensus from GPT-5.2 and Gemini 3 Pro responses.

### Available Tools

| Tool | Description |
|------|-------------|
| `hivemind` | Query models and get synthesized consensus |
| `configure_keys` | Set API keys (stored securely) |
| `check_status` | Check configuration and active providers |
| `configure_hive` | Toggle grounding search and settings |
| `check_stats` | View token usage and cost statistics |

### Claude Code Commands

- `/hive <question>` - Orchestrate multi-model consensus with Claude as the synthesizer
- `/hive-config` - Configure API keys and settings
- `/hivestats` - View usage statistics

### Automatic Hivemind Fallback

Copy `CLAUDE.md.example` to your project's `.claude/CLAUDE.md` to enable automatic Hivemind consultation when Claude is stuck (after 3+ failed attempts).

### Prompt Caching

All providers use optimized caching for cost reduction on follow-up queries:

| Provider | Type | Savings | Min Tokens |
|----------|------|---------|------------|
| OpenAI | Automatic | 50% | 1024 |
| Gemini 2.5+ | Implicit | 90% | - |
| Anthropic | Explicit | 90% | 1024 |

---

## Web Interface

A full-featured web app with solo mode, hivemind mode, and conversation history.

### Quick Start

```bash
# Clone the repository
git clone https://github.com/QuantuLabs/hivemind.git
cd hivemind

# Install dependencies (requires Bun >= 1.0)
bun install

# Start development server
bun dev
```

Open `http://localhost:3000`, click the settings icon, and enter your API keys.

### Features

- **Multi-Model Consensus**: Query 3 leading AI models simultaneously
- **Deliberation Algorithm**: Up to 3 rounds of refinement to reach consensus
- **Solo Mode**: Chat with individual models (GPT, Claude, Gemini)
- **Hivemind Mode**: Get synthesized responses from all models
- **Conversation History**: Persistent chat sessions
- **Dark/Light Theme**: Full theme support
- **Secure Storage**: API keys encrypted with AES-GCM in browser

### Security

- API keys are encrypted using AES-GCM with PBKDF2 key derivation
- Keys are stored locally in browser localStorage (never sent to servers)
- Session persistence uses sessionStorage (cleared on browser close)

---

## How Consensus Works

1. **Initial Query**: All 3 models receive the same question
2. **Analysis**: An orchestrator analyzes responses for agreements/divergences
3. **Refinement**: If no consensus, models see other perspectives and refine (up to 3 rounds)
4. **Synthesis**: Final response synthesizes agreed points and addresses divergences

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

## License

MIT

---

Developed by [QuantuLabs](https://github.com/QuantuLabs)
