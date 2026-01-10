#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { hivemindTool, type HivemindToolParams } from './tools/hivemind'
import { getConfig, setApiKey, hasRequiredKeys, updateSettings, getSettings, initializeCache, isRunningInClaudeCode, getAvailableProviders, getAllKeySources, getEnvFilePath } from './config'

const server = new Server(
  {
    name: 'hivemind-mcp',
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
          'Query multiple AI models (GPT-5.2, Claude Opus 4.5, Gemini 3 Pro) and get a synthesized consensus answer. The models deliberate through multiple rounds if they disagree. Pass context (code, files, etc.) to give all models the same information.',
        inputSchema: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The question to ask the AI models',
            },
            context: {
              type: 'string',
              description: 'Additional context to include (code snippets, file contents, documentation, etc.). This context will be sent to all models.',
            },
            consensusOnly: {
              type: 'boolean',
              description: 'If true, only return the consensus without individual model responses',
              default: false,
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
      const settings = args as { useGrounding?: boolean; claudeCodeMode?: boolean }
      const updated = updateSettings(settings)

      return {
        content: [
          {
            type: 'text',
            text: `Hivemind settings updated:\n${JSON.stringify(updated, null, 2)}`,
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
