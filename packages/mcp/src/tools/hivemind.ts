import {
  OpenAIProvider,
  GoogleProvider,
  AnthropicProvider,
  categorizeError,
  type ModelId,
  type ErrorCategory,
} from '@quantulabs/hivemind-core'
import { getConfig, hasRequiredKeys, getSettings, validateModelId, DEFAULT_MODELS, type Provider } from '../config'
import { trackUsage } from '../usage'

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  providerName: string
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const { retryable } = categorizeError(lastError)

      if (attempt === MAX_RETRIES || !retryable) {
        throw lastError
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
      console.error(`[hivemind] ${providerName} attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

export interface ModelQuery {
  provider: 'openai' | 'google' | 'anthropic'
  question: string  // Can be different per model for targeted follow-ups
}

export interface HivemindToolParams {
  question: string           // Main question (sent to all models if no queries specified)
  context?: string           // Shared context for all models
  queries?: ModelQuery[]     // Optional: different questions per model (for targeted rounds)
}

export interface HivemindToolResult {
  responses: Array<{
    provider: string
    model: string
    content: string
  }>
  errors?: Array<{
    provider: string
    error: string
  }>
}

/**
 * Query multiple AI models and return their raw responses.
 *
 * The orchestrator (Claude Code or other client) handles:
 * - Analyzing responses for consensus/divergences
 * - Deciding if more rounds are needed
 * - Formulating targeted follow-up questions per model
 * - Synthesizing the final answer
 *
 * Use `queries` param to send different questions to each model
 * for targeted follow-up rounds.
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
  const { question, context, queries } = params

  // Build provider list
  type ProviderInstance = OpenAIProvider | GoogleProvider | AnthropicProvider
  const availableProviders: Array<{ name: Provider; provider: ProviderInstance }> = []

  if (config.apiKeys.openai) {
    availableProviders.push({
      name: 'openai',
      provider: new OpenAIProvider({ apiKey: config.apiKeys.openai }),
    })
  }
  if (config.apiKeys.google) {
    availableProviders.push({
      name: 'google',
      provider: new GoogleProvider({
        apiKey: config.apiKeys.google,
        useGrounding: settings.useGrounding,
      }),
    })
  }
  if (config.apiKeys.anthropic && !settings.claudeCodeMode) {
    availableProviders.push({
      name: 'anthropic',
      provider: new AnthropicProvider({ apiKey: config.apiKeys.anthropic }),
    })
  }

  if (availableProviders.length === 0) {
    throw new Error('No providers available. Configure at least OpenAI or Google API key.')
  }

  // Determine what to query each provider
  const providerQueries: Array<{ name: Provider; provider: ProviderInstance; query: string }> = []

  if (queries && queries.length > 0) {
    // Targeted queries per model
    for (const q of queries) {
      const p = availableProviders.find(ap => ap.name === q.provider)
      if (p) {
        providerQueries.push({ ...p, query: q.question })
      }
    }
  } else {
    // Same question to all models
    for (const p of availableProviders) {
      providerQueries.push({ ...p, query: question })
    }
  }

  if (providerQueries.length === 0) {
    throw new Error('No valid providers to query.')
  }

  // Query all providers in parallel
  const results = await Promise.allSettled(
    providerQueries.map(async ({ name, provider, query }) => {
      let model = settings.models[name]
      const validation = validateModelId(name, model)
      if (!validation.valid) {
        model = DEFAULT_MODELS[name]
      }

      // Build message
      let messageContent = ''
      if (context) {
        messageContent += `Context:\n${context}\n\n`
      }
      messageContent += query

      const content = await retryWithBackoff(
        () => provider.chat([{ role: 'user' as const, content: messageContent }], model as ModelId),
        name
      )

      trackUsage(name, estimateTokens(messageContent), estimateTokens(content))

      return {
        provider: name,
        model,
        content,
      }
    })
  )

  // Collect responses and errors
  const responses: Array<{ provider: string; model: string; content: string }> = []
  const errors: Array<{ provider: string; error: string }> = []

  results.forEach((result, idx) => {
    const providerName = providerQueries[idx].name
    if (result.status === 'fulfilled') {
      responses.push(result.value)
    } else {
      const error = result.reason instanceof Error ? result.reason.message : 'Unknown error'
      errors.push({ provider: providerName, error })
    }
  })

  if (responses.length === 0) {
    throw new Error(`All providers failed:\n${errors.map(e => `  • ${e.provider}: ${e.error}`).join('\n')}`)
  }

  const result: HivemindToolResult = { responses }
  if (errors.length > 0) {
    result.errors = errors
  }

  return result
}
