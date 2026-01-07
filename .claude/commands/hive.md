# /hive - Ask the Hivemind

Query multiple AI models (GPT-4o, Claude, Gemini) and get a synthesized consensus answer.

## Usage

Use the `hivemind` tool from the hivemind-mcp server to ask a question to all three AI models simultaneously. They will deliberate through multiple rounds if they disagree, and return a synthesized consensus.

## Example

When the user asks `/hive What's the best approach for handling authentication in a web app?`, use the hivemind tool:

```
hivemind({
  question: "What's the best approach for handling authentication in a web app?",
  consensusOnly: false
})
```

## Setup

If the hivemind MCP server is not configured, guide the user to:

1. Install the MCP server:
   ```bash
   claude mcp add hivemind
   ```

2. Configure API keys using the `configure_keys` tool or by editing `~/.config/hivemind/config.json`

## Arguments

- `$ARGUMENTS` - The question to ask the Hivemind
