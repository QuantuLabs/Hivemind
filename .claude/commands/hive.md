# /hive - Hivemind Deliberation

Query multiple AI models and orchestrate consensus through deliberation.

**You (Claude Code) are the orchestrator.** GPT and Gemini provide their perspectives, and you analyze, investigate, and synthesize the final consensus.

## Arguments

- `$ARGUMENTS` - The question to ask the Hivemind

---

## Phase 1: Context Building (if needed)

For questions about the codebase:

**CRITICAL: Pass RAW, UNDIGESTED code - but be SMART about what you include.**

1. **Use Glob** to find relevant files by pattern
2. **Use Read** to get file contents
3. **Be selective** - include the relevant portions, not necessarily entire files
4. **DO NOT use Explore agents** - they return analyzed summaries, not raw code
5. **DO NOT pre-analyze** - keep your interpretation for AFTER hivemind results

**Smart context selection:**
- For audits: Include the actual implementation code, not your analysis
- For bugs: Include the buggy function + related code, line numbers
- For architecture: Include key files/interfaces, skip boilerplate
- Large files: Use Read with offset/limit to get relevant sections

**Example workflow:**
```
# Find files
Glob("src/auth/**/*.ts")

# Read targeted sections (smart selection)
Read("/path/to/auth.ts", offset=50, limit=100)  # Just the relevant function
Read("/path/to/types.ts")  # Full file if small and relevant

# Pass raw code to hivemind (next phase)
```

**Key:** Raw ≠ Everything. Raw = actual code, not your summary of it.

For general questions, skip to Phase 2.

---

## Phase 2: Initial Query

### Step 1: Formulate YOUR answer first

Before calling the hivemind tool, think through the question and formulate your own complete answer. Be thorough - this is your contribution to the deliberation.

### Step 2: Query other models

```
hivemind({
  question: "The question here",
  context: `
## Source Code (RAW - not summaries)

### /path/to/auth.ts (lines 50-150)
\`\`\`typescript
[PASTE THE RELEVANT CODE SECTION - actual code, not your description]
\`\`\`

### /path/to/types.ts
\`\`\`typescript
[PASTE ACTUAL CODE - be selective if file is large]
\`\`\`
`
})
```

**IMPORTANT:**
- Include actual source code, not your analysis
- Be selective: relevant sections > entire codebase
- Include line numbers for context

This returns raw responses from GPT-5.2 and Gemini 3 Pro.

### Step 3: You now have 3 perspectives

- **Your answer** (Claude Code - formulated in Step 1)
- **GPT-5.2** (from hivemind response)
- **Gemini 3 Pro** (from hivemind response)

---

## Phase 3: Analysis Loop (max 10 rounds)

### Analyze all responses

Compare the 3 perspectives and identify:
- **Agreements** - Points where all models concur
- **Divergences** - Areas of disagreement
- **Gaps** - Things one model mentioned that others missed
- **Questions** - Topics that need more investigation

### If consensus reached

All models agree on the key points → Go to Phase 4

### If divergence found

1. **Can you resolve it?** Use your tools:
   - `Read` - Check specific files
   - `Grep` - Search for patterns
   - `WebSearch` - Get current information
   - `Task` with `Explore` - Deeper investigation

2. **Gather additional information** to resolve the divergence

3. **Send follow-up to models:**
   ```
   hivemind({
     question: "Follow-up question addressing the divergence",
     context: "Original context + new findings",
     previousResponses: [
       { provider: "claude", content: "Your previous answer" },
       { provider: "openai", content: "GPT's previous answer" },
       { provider: "google", content: "Gemini's previous answer" }
     ]
   })
   ```

4. **Return to analysis** with the new responses

---

## Phase 4: Synthesis

Once consensus is reached (or max rounds hit):

1. **Synthesize the final answer** combining the best insights from all models
2. **Include confidence level** (high/medium/low)
3. **Note any remaining disagreements** if applicable

### Output format

```markdown
## Hivemind Consensus

[Your synthesized answer here]

### Confidence: [High/Medium/Low]

### Model Agreement
- GPT-5.2: [Agrees/Partially agrees/Disagrees]
- Gemini 3 Pro: [Agrees/Partially agrees/Disagrees]

### Key Insights
- [Insight from your analysis]
- [Insight from GPT that was valuable]
- [Insight from Gemini that was valuable]
```

---

## Key Principles

1. **You are the orchestrator** - Not just a participant, but the one driving the deliberation
2. **Use your tools** - You can investigate during deliberation, other models cannot
3. **Raw context** - Don't pre-digest information, let models form independent opinions
4. **Iterate until consensus** - Don't settle for the first round if there's disagreement
5. **Synthesize, don't pick** - The final answer should combine the best of all perspectives
6. **No Explore agents for context** - Explore agents analyze and summarize. Use Read/Glob directly for raw code.

---

## Examples

### Simple question (no codebase)
```
/hive What's the best approach for implementing rate limiting in a Node.js API?
```
→ Formulate your answer → Query hivemind → Analyze → Synthesize

### Codebase question
```
/hive Review my authentication implementation for security issues
```
→ Glob to find auth files → Read complete file contents → Formulate your answer → Query hivemind with raw code → Iterate if needed → Synthesize

### Follow-up example
```
After initial responses, GPT suggests using Redis but Gemini prefers in-memory.
You investigate with WebSearch to check current best practices.
Then send follow-up with your findings and previous responses.
```

---

## Setup

If the hivemind MCP server is not configured:

```bash
claude mcp add hivemind -- node /path/to/hivemind/packages/mcp/dist/index.js
```

Configure API keys:
```
configure_keys({ openai: "sk-...", google: "AIza..." })
```

Note: Anthropic key is optional - you (Claude Code) already provide the Claude perspective.
