---
description: Configure Hivemind API Keys
allowed-tools:
  - mcp__hivemind__check_status
  - mcp__hivemind__configure_keys
  - mcp__hivemind__configure_hive
---

# /hive-config - Configure Hivemind

## Step 1: Check Status

Call `check_status` and display:

```
## Hivemind Status

| Provider | Status |
|----------|--------|
| OpenAI   | [✅/❌] |
| Google   | [✅/❌] |

Settings: Grounding [on/off] | Claude Code Mode [on/off]
Config: ~/.config/hivemind/.env
```

## Step 2: Show Quick Actions

Based on `$ARGUMENTS`:

- **No args or "status"**: Just show status above
- **"guide"**: Show setup guide below
- **Contains API key** (starts with `sk-` or `AIza`): Auto-detect and save it

## Auto-Detect Keys in Arguments

If `$ARGUMENTS` contains what looks like an API key:
- Starts with `sk-` → OpenAI key → call `configure_keys({ openai: "..." })`
- Starts with `AIza` → Google key → call `configure_keys({ google: "..." })`
- Starts with `sk-ant-` → Anthropic key → call `configure_keys({ anthropic: "..." })`

Then confirm: `✅ [Provider] key saved!`

## Setup Guide (if args = "guide")

```
## Quick Setup

1. Get your keys:
   - OpenAI: https://platform.openai.com/api-keys
   - Google: https://aistudio.google.com/apikey

2. Add keys (pick one method):

   **Method A: Paste directly**
   /hive-config sk-proj-xxx...
   /hive-config AIzaSy...

   **Method B: Edit file**
   ~/.config/hivemind/.env:
   OPENAI_API_KEY=sk-...
   GOOGLE_API_KEY=AIza...

3. Verify: /hive-config

4. Use: /hive "your question"
```

## Examples

- `/hive-config` → show status
- `/hive-config guide` → show setup guide
- `/hive-config sk-proj-abc123...` → save OpenAI key
- `/hive-config AIzaSyABC123...` → save Google key
