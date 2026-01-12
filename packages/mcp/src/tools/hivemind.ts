import {
  OpenAIProvider,
  GoogleProvider,
  AnthropicProvider,
  categorizeError,
  type ModelId,
  type ErrorCategory,
} from '@quantulabs/hivemind-core'
import { getConfig, hasRequiredKeys, getSettings, validateModelId, VALID_MODELS, DEFAULT_MODELS, type Provider } from '../config'
import { trackUsage } from '../usage'

// Estimate token count from text (rough approximation: ~4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Retry configuration
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

/**
 * Retry a function with exponential backoff for transient errors.
 * Only retries for errors categorized as retryable (429, 5xx, network errors).
 */
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
      const { retryable, category } = categorizeError(lastError)

      // Don't retry on last attempt or non-retryable errors
      if (attempt === MAX_RETRIES || !retryable) {
        throw lastError
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
      console.error(
        `[hivemind] ${providerName} attempt ${attempt}/${MAX_RETRIES} failed (${category}), retrying in ${delay}ms...`
      )
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Generate user-friendly suggestions based on error categories.
 */
function generateSuggestions(errors: Array<{ provider: string; category: ErrorCategory }>): string {
  const categories = new Set(errors.map(e => e.category))
  const suggestions: string[] = []

  if (categories.has('auth')) {
    suggestions.push('• Auth error (401/403): Verify API key with check_status tool')
  }
  if (categories.has('rate_limit')) {
    suggestions.push('• Rate limit (429): Wait a moment before retrying')
  }
  if (categories.has('server')) {
    suggestions.push('• Server error (5xx): Provider may be experiencing issues, try again later')
  }
  if (categories.has('network')) {
    suggestions.push('• Network error: Check internet connectivity')
  }
  if (categories.has('client')) {
    suggestions.push('• Client error (400/404): Check model name or request format')
  }

  return suggestions.length > 0 ? suggestions.join('\n') : '• Check API keys and network connectivity'
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

  // Create providers - when claudeCodeMode is enabled, skip Anthropic (Claude is the orchestrator)
  const providers: Array<{ name: Provider; provider: OpenAIProvider | GoogleProvider | AnthropicProvider }> = []

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
  // Only include Anthropic when claudeCodeMode is disabled (otherwise Claude is already the host)
  if (config.apiKeys.anthropic && !settings.claudeCodeMode) {
    providers.push({
      name: 'anthropic',
      provider: new AnthropicProvider({ apiKey: config.apiKeys.anthropic }),
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

  // Add previous responses for follow-up queries (with validation)
  if (previousResponses && previousResponses.length > 0) {
    // Validate previousResponses structure
    const validResponses = previousResponses.filter((resp): resp is PreviousResponse => {
      return (
        typeof resp === 'object' &&
        resp !== null &&
        typeof resp.provider === 'string' &&
        resp.provider.trim().length > 0 &&
        typeof resp.content === 'string' &&
        resp.content.trim().length > 0
      )
    })

    if (validResponses.length > 0) {
      messageContent += '\n\n---\n\nPrevious responses from models:\n'
      for (const resp of validResponses) {
        messageContent += `\n### ${resp.provider}:\n${resp.content}\n`
      }
      messageContent += '\n---\n\nPlease reconsider and provide your updated response, taking into account the perspectives above.'
    }
  }

  const messages = [{ role: 'user' as const, content: messageContent }]

  // Query all providers in parallel with retry logic for transient errors
  const results = await Promise.allSettled(
    providers.map(async ({ name, provider }) => {
      // Validate model ID from settings, fallback to default if invalid
      let model = settings.models[name]
      const validation = validateModelId(name, model)
      if (!validation.valid) {
        console.error(`[hivemind] ${validation.error}, using default`)
        model = DEFAULT_MODELS[name]
      }

      // Wrap the API call in retry logic for transient errors
      const content = await retryWithBackoff(
        () => provider.chat(messages, model as ModelId),
        name
      )

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

  // Collect successful responses and track failures with detailed error info
  const responses: Array<{ provider: string; model: string; content: string }> = []
  const errorDetails: Array<{ provider: string; message: string; category: ErrorCategory }> = []

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      responses.push(result.value)
    } else {
      const providerName = providers[idx].name
      const error = result.reason instanceof Error ? result.reason : new Error('Unknown error')
      const { category } = categorizeError(error)

      console.error(`[hivemind] ${providerName} failed after ${MAX_RETRIES} attempts:`, error.message)

      errorDetails.push({
        provider: providerName,
        message: error.message,
        category,
      })

      // Include error in responses so caller knows what happened
      responses.push({
        provider: providerName,
        model: settings.models[providerName] || DEFAULT_MODELS[providerName],
        content: `[Error: ${error.message}]`,
      })
    }
  })

  // If all providers failed, throw a detailed error with diagnostics
  if (responses.every(r => r.content.startsWith('[Error:'))) {
    const errorList = errorDetails
      .map(e => `  • ${e.provider}: ${e.message}`)
      .join('\n')
    const suggestions = generateSuggestions(errorDetails)

    throw new Error(
      `All providers failed after ${MAX_RETRIES} retry attempts.\n\n` +
      `Provider errors:\n${errorList}\n\n` +
      `Suggestions:\n${suggestions}`
    )
  }

  return { responses }
}
