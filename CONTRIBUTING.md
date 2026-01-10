# Contributing to Hivemind

Thank you for your interest in contributing to Hivemind!

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/hivemind.git
   cd hivemind
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Run tests:
   ```bash
   bun test
   ```
5. Start dev server:
   ```bash
   bun dev
   ```

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure tests pass: `bun test`
4. Ensure build succeeds: `bun build`
5. Submit a pull request

## Code Style

- TypeScript strict mode enabled
- ESLint for linting
- Write tests for new features
- Keep commits atomic and well-described

## Project Structure

```
hivemind/
├── apps/web/          # Next.js frontend
├── packages/core/     # Consensus logic & providers
└── packages/mcp/      # MCP server for Claude Code
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
