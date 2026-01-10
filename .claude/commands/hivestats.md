# Hivemind Usage Statistics

Display token usage and cost statistics for Hivemind API calls.

## Instructions

Use the `mcp__hivemind__check_stats` tool to display usage statistics.

Present the statistics in a clear, formatted way:

1. **Session Statistics** - Usage since the MCP server started
   - Duration
   - Total requests, tokens, and cost
   - Per-provider breakdown (OpenAI, Anthropic, Google)

2. **Monthly Statistics** - Cumulative usage for the current month
   - Same breakdown as session stats
   - Persisted across server restarts

3. **Pricing Reference** - Current token pricing per provider

## Notes

- Token counts are estimates based on content length (~4 chars/token)
- Costs are calculated using current API pricing (January 2026)
- Monthly stats are stored in `~/.config/hivemind/usage.json`
- Session stats reset when the MCP server restarts

## Example Output

```
## Session Statistics
Duration: 2h 15m
Total Requests: 42
Total Tokens: 125.5K
Total Cost: $0.4521

### OpenAI
  Requests: 14
  Input: 28.2K tokens
  Output: 18.5K tokens
  Cost: $0.1523

### Google
  Requests: 28
  Input: 45.0K tokens
  Output: 33.8K tokens
  Cost: $0.2998

## Monthly Statistics
Month: 2026-01
Total Requests: 156
Total Tokens: 892.3K
Total Cost: $2.8847
...
```
