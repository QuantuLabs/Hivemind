#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { hivemindTool, type HivemindToolParams } from './tools/hivemind'
import { getConfig, setApiKey, hasRequiredKeys, updateSettings, getSettings, initializeCache, isRunningInClaudeCode, getAvailableProviders, getAllKeySources, getEnvFilePath } from './config'
import { getUsageStats, resetSessionStats, formatDuration, formatCost, formatTokens, TOKEN_PRICING } from './usage'

const server = new Server(
  {
    name: 'hivemind',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'hivemind',
        description:
          'Query multiple AI models (GPT-5.2, Gemini 3 Pro) and return their raw responses. The orchestrator analyzes responses, decides if consensus exists, formulates targeted follow-up questions if needed, and synthesizes the final answer.',
        inputSchema: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The question to ask all AI models (used when queries is not specified)',
            },
            context: {
              type: 'string',
              description: 'Shared context for all models (code, files, documentation, etc.)',
            },
            queries: {
              type: 'array',
              description: 'For targeted rounds: send different questions to each model based on their previous responses and identified divergences',
              items: {
                type: 'object',
                properties: {
                  provider: {
                    type: 'string',
                    enum: ['openai', 'google', 'anthropic'],
                    description: 'Which model to query',
                  },
                  question: {
                    type: 'string',
                    description: 'The specific question for this model',
                  },
                },
                required: ['provider', 'question'],
              },
            },
          },
          required: ['question'],
        },
      },
      {
        name: 'configure_keys',
        description: 'Configure API keys for the AI providers (OpenAI, Anthropic, Google)',
        inputSchema: {
          type: 'object',
          properties: {
            openai: {
              type: 'string',
              description: 'OpenAI API key (sk-...)',
            },
            anthropic: {
              type: 'string',
              description: 'Anthropic API key (sk-ant-...)',
            },
            google: {
              type: 'string',
              description: 'Google AI API key (AIza...)',
            },
          },
        },
      },
      {
        name: 'check_status',
        description: 'Check if Hivemind is properly configured with all required API keys',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'configure_hive',
        description: 'Configure Hivemind settings like grounding search',
        inputSchema: {
          type: 'object',
          properties: {
            useGrounding: {
              type: 'boolean',
              description: 'Enable grounding search for enhanced answers with web data (default: true)',
            },
            claudeCodeMode: {
              type: 'boolean',
              description: 'Skip Anthropic API calls when running inside Claude Code (default: true). When enabled, only OpenAI and Google are queried since Claude is already the host.',
            },
            models: {
              type: 'object',
              description: 'Configure which model to use for each provider',
              properties: {
                openai: {
                  type: 'string',
                  description: 'OpenAI model ID (e.g., gpt-5.2, gpt-5.1, gpt-5-mini, o4-mini)',
                },
                anthropic: {
                  type: 'string',
                  description: 'Anthropic model ID (e.g., claude-opus-4-5-20251101, claude-sonnet-4-5-20250514)',
                },
                google: {
                  type: 'string',
                  description: 'Google model ID (e.g., gemini-3-pro-preview, gemini-3-flash-preview, gemini-2.5-pro)',
                },
              },
            },
          },
        },
      },
      {
        name: 'check_stats',
        description: 'Get token usage statistics and costs for Hivemind API calls',
        inputSchema: {
          type: 'object',
          properties: {
            resetSession: {
              type: 'boolean',
              description: 'Reset session statistics after retrieving them',
              default: false,
            },
          },
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'hivemind': {
      try {
        const params = args as unknown as HivemindToolParams
        if (!params.question) {
          throw new Error('question is required')
        }
        const result = await hivemindTool(params)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        }
      }
    }

    case 'configure_keys': {
      const keys = args as { openai?: string; anthropic?: string; google?: string }

      // Store API keys securely (in OS keychain if available)
      if (keys.openai) await setApiKey('openai', keys.openai)
      if (keys.anthropic) await setApiKey('anthropic', keys.anthropic)
      if (keys.google) await setApiKey('google', keys.google)

      const config = getConfig()
      const configured = Object.entries(config.apiKeys)
        .filter(([, v]) => v)
        .map(([k]) => k)

      return {
        content: [
          {
            type: 'text',
            text: `API keys configured: ${configured.join(', ') || 'none'}. ${
              hasRequiredKeys()
                ? 'Hivemind is ready to use!'
                : 'Missing keys: ' +
                  ['openai', 'anthropic', 'google']
                    .filter((k) => !config.apiKeys[k as keyof typeof config.apiKeys])
                    .join(', ')
            }`,
          },
        ],
      }
    }

    case 'check_status': {
      const config = getConfig()
      const availableProviders = getAvailableProviders()
      const keySources = getAllKeySources()

      const status = {
        ready: hasRequiredKeys(),
        envFile: getEnvFilePath(),
        keys: {
          openai: {
            configured: !!config.apiKeys.openai,
            source: keySources.find(k => k.provider === 'openai')?.source || 'none',
          },
          anthropic: {
            configured: !!config.apiKeys.anthropic,
            source: keySources.find(k => k.provider === 'anthropic')?.source || 'none',
          },
          google: {
            configured: !!config.apiKeys.google,
            source: keySources.find(k => k.provider === 'google')?.source || 'none',
          },
        },
        settings: config.settings,
        environment: {
          claudeCodeDetected: isRunningInClaudeCode(),
          activeProviders: availableProviders,
          anthropicSkipped: config.settings.claudeCodeMode && !!config.apiKeys.anthropic,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
      }
    }

    case 'configure_hive': {
      const { models, ...otherSettings } = args as {
        useGrounding?: boolean
        claudeCodeMode?: boolean
        models?: { openai?: string; anthropic?: string; google?: string }
      }

      // Merge models if provided
      const settingsToUpdate: Partial<typeof otherSettings & { models?: Record<string, string> }> = { ...otherSettings }
      if (models) {
        const currentSettings = getSettings()
        settingsToUpdate.models = { ...currentSettings.models, ...models }
      }

      const updated = updateSettings(settingsToUpdate)

      return {
        content: [
          {
            type: 'text',
            text: `Hivemind settings updated:\n${JSON.stringify(updated, null, 2)}`,
          },
        ],
      }
    }

    case 'check_stats': {
      const { resetSession = false } = args as { resetSession?: boolean }
      const stats = getUsageStats()

      // Build formatted output
      const lines: string[] = []

      lines.push('## Session Statistics')
      lines.push(`Duration: ${formatDuration(stats.session.duration)}`)
      lines.push(`Total Requests: ${stats.session.totalRequests}`)
      lines.push(`Total Tokens: ${formatTokens(stats.session.totalTokens)}`)
      lines.push(`Total Cost: ${formatCost(stats.session.totalCost)}`)
      lines.push('')

      for (const provider of ['openai', 'anthropic', 'google'] as const) {
        const usage = stats.session.providers[provider]
        if (usage.requests > 0) {
          lines.push(`### ${provider.charAt(0).toUpperCase() + provider.slice(1)}`)
          lines.push(`  Requests: ${usage.requests}`)
          lines.push(`  Input: ${formatTokens(usage.inputTokens)} tokens`)
          lines.push(`  Output: ${formatTokens(usage.outputTokens)} tokens`)
          lines.push(`  Cost: ${formatCost(usage.cost)}`)
        }
      }

      lines.push('')
      lines.push('## Monthly Statistics')
      lines.push(`Month: ${stats.monthly.month}`)
      lines.push(`Total Requests: ${stats.monthly.totalRequests}`)
      lines.push(`Total Tokens: ${formatTokens(stats.monthly.totalTokens)}`)
      lines.push(`Total Cost: ${formatCost(stats.monthly.totalCost)}`)
      lines.push('')

      for (const provider of ['openai', 'anthropic', 'google'] as const) {
        const usage = stats.monthly.providers[provider]
        if (usage.requests > 0) {
          lines.push(`### ${provider.charAt(0).toUpperCase() + provider.slice(1)}`)
          lines.push(`  Requests: ${usage.requests}`)
          lines.push(`  Input: ${formatTokens(usage.inputTokens)} tokens`)
          lines.push(`  Output: ${formatTokens(usage.outputTokens)} tokens`)
          lines.push(`  Cost: ${formatCost(usage.cost)}`)
        }
      }

      lines.push('')
      lines.push('## Pricing (per 1M tokens)')
      for (const [provider, pricing] of Object.entries(TOKEN_PRICING)) {
        lines.push(`${provider}: $${pricing.input} input / $${pricing.output} output`)
      }

      if (resetSession) {
        resetSessionStats()
        lines.push('')
        lines.push('*Session statistics have been reset.*')
      }

      return {
        content: [
          {
            type: 'text',
            text: lines.join('\n'),
          },
        ],
      }
    }

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      }
  }
})

// Start the server
async function main() {
  // Initialize API key cache from keychain/file
  await initializeCache()

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Hivemind MCP server running on stdio')
}

main().catch(console.error)
