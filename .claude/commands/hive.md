# /hive - Ask the Hivemind

Query multiple AI models and get a synthesized consensus answer.

## Usage

When the user invokes `/hive`, follow this workflow:

### Phase 1: Gather Raw Context

1. **Launch Explore agents** - Use Task agents with `subagent_type=Explore` to thoroughly investigate the codebase/problem. Launch multiple agents in parallel if needed for different aspects.

2. **Read relevant files** - Use Read tool to get the actual source code of critical files identified by exploration.

3. **Collect raw outputs** - Save the COMPLETE outputs from explore agents and file reads. Do NOT summarize yet.

### Phase 2: Pass RAW Context to Hivemind

**CRITICAL: Pass raw context, not your interpretation.**

```
hivemind({
  question: "The user's question here",
  context: `
## RAW EXPLORATION RESULTS

### Agent 1 Output (Identity Module):
[PASTE COMPLETE OUTPUT FROM EXPLORE AGENT - DO NOT SUMMARIZE]

### Agent 2 Output (Other Module):
[PASTE COMPLETE OUTPUT - DO NOT SUMMARIZE]

### Critical Source Files:
[PASTE ACTUAL FILE CONTENTS OR LARGE EXCERPTS]
`,
  consensusOnly: false
})
```

## Key Principle

**Raw context, independent analysis.** The goal is for GPT, Claude, and Gemini to form their OWN opinions from the raw data - not to validate YOUR pre-digested interpretation.

### DO NOT:
- Summarize exploration results before passing to hivemind
- Cherry-pick only certain findings
- Rewrite or "clean up" the context
- Add your own conclusions to the context

### DO:
- Pass complete agent outputs verbatim
- Include full source code of relevant files
- Let the context be "messy" - that's fine
- Keep your interpretation for AFTER you receive hivemind results

## Why This Matters

If you pre-digest the context, you're essentially asking the hivemind to validate YOUR analysis. The models will anchor on your framing and miss things you missed. Raw context = truly independent perspectives = better consensus.

## Examples

- `/hive Audit my auth code` → Launch Explore agents, pass their FULL outputs + actual source files to hivemind
- `/hive Best caching strategy?` → Explore architecture, pass raw findings + relevant code to hivemind
- `/hive REST vs GraphQL?` → General question with no codebase context, can call hivemind directly

## Context Size

Don't worry about context being "too long". The hivemind can handle large contexts. It's better to include too much raw information than to lose signal by summarizing.

If context truly exceeds limits, prioritize:
1. Actual source code of files being analyzed
2. Complete explore agent outputs
3. Error messages / logs if relevant

## Setup

If the hivemind MCP server is not configured:

1. Add the MCP server:
   ```bash
   claude mcp add hivemind -- node /path/to/hivemind/packages/mcp/dist/index.js
   ```

2. Configure at least one API key:
   ```
   configure_keys({ openai: "sk-..." })
   ```

   You can use 1, 2, or all 3 providers (OpenAI, Anthropic, Google).

## Arguments

- `$ARGUMENTS` - The question to ask the Hivemind
