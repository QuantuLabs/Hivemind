import {
  OpenAIProvider,
  GoogleProvider,
  type ModelResponse,
} from '@quantulabs/hivemind-core'
import { getConfig, hasRequiredKeys, getSettings, type Provider } from '../config'
import { trackUsage } from '../usage'

// Estimate token count from text (rough approximation: ~4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Default models per provider
const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-5.2',
  anthropic: 'claude-opus-4-5-20251101',
  google: 'gemini-3-pro-preview',
}

export interface PreviousResponse {
  provider: string
  content: string
}

export interface HivemindToolParams {
  question: string
  context?: string  // Additional context (code, files, etc.) to include with the question
  previousResponses?: PreviousResponse[]  // For follow-up queries, include previous model responses
}

export interface HivemindToolResult {
  responses: Array<{
    provider: string
    model: string
    content: string
  }>
}

/**
 * Query GPT and Gemini in parallel and return raw responses.
 * Claude Code acts as the orchestrator - this tool is just a proxy to other models.
 *
 * When previousResponses is provided, the models are asked to reconsider
 * their answers based on what other models said.
 */
export async function hivemindTool(
  params: HivemindToolParams
): Promise<HivemindToolResult> {
  if (!hasRequiredKeys()) {
    throw new Error(
      'No API keys configured. Please use the configure_keys tool to add at least one API key.'
    )
  }

  const config = getConfig()
  const settings = getSettings()
  const { question, context, previousResponses } = params

  // Create providers (only OpenAI and Google - Claude Code is the orchestrator)
  const providers: Array<{ name: Provider; provider: OpenAIProvider | GoogleProvider }> = []

  if (config.apiKeys.openai) {
    providers.push({
      name: 'openai',
      provider: new OpenAIProvider({ apiKey: config.apiKeys.openai }),
    })
  }
  if (config.apiKeys.google) {
    providers.push({
      name: 'google',
      provider: new GoogleProvider({
        apiKey: config.apiKeys.google,
        useGrounding: settings.useGrounding,
      }),
    })
  }

  if (providers.length === 0) {
    throw new Error('No providers available. Configure at least OpenAI or Google API key.')
  }

  // Build message content
  let messageContent = ''

  // Add context if provided
  if (context) {
    messageContent += `Context:\n${context}\n\n`
  }

  // Add question
  messageContent += `Question: ${question}`

  // Add previous responses for follow-up queries
  if (previousResponses && previousResponses.length > 0) {
    messageContent += '\n\n---\n\nPrevious responses from models:\n'
    for (const resp of previousResponses) {
      messageContent += `\n### ${resp.provider}:\n${resp.content}\n`
    }
    messageContent += '\n---\n\nPlease reconsider and provide your updated response, taking into account the perspectives above.'
  }

  const messages = [{ role: 'user' as const, content: messageContent }]

  // Query all providers in parallel
  const responses = await Promise.all(
    providers.map(async ({ name, provider }) => {
      const model = DEFAULT_MODELS[name]
      const content = await provider.chat(messages, model as any)

      // Track token usage (estimates)
      const inputTokens = estimateTokens(messageContent)
      const outputTokens = estimateTokens(content)
      trackUsage(name, inputTokens, outputTokens)

      return {
        provider: name,
        model,
        content,
      }
    })
  )

  return { responses }
}
