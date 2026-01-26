import {
  OpenAIProvider,
  GoogleProvider,
  AnthropicProvider,
  categorizeError,
  parseAnalysis,
  buildAnalysisPrompt,
  buildRefinementPrompt,
  buildSynthesisPrompt,
  type ModelId,
  type ModelResponse,
  type ConsensusAnalysis,
  type ErrorCategory,
  type Provider as CoreProvider,
} from '@quantulabs/hivemind-core'
import { getConfig, hasRequiredKeys, getSettings, validateModelId, DEFAULT_MODELS, type Provider } from '../config'
import { trackUsage } from '../usage'

// Estimate token count from text (rough approximation: ~4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Retry configuration
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
      const { retryable, category } = categorizeError(lastError)

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

export interface HivemindToolParams {
  question: string
  context?: string
  maxRounds?: number  // Maximum deliberation rounds (default: 3)
}

export interface HivemindToolResult {
  consensus: string
  analysis: ConsensusAnalysis
  rounds: number
  responses: Array<{
    provider: string
    model: string
    content: string
    round: number
  }>
  orchestratorNote?: string
}

/**
 * Query multiple AI models, analyze for consensus, refine through
 * deliberation rounds if needed, and synthesize a final answer.
 *
 * In Claude Code mode: queries GPT + Gemini, synthesizes consensus,
 * and returns orchestratorNote for Claude to add its perspective.
 *
 * Outside Claude Code: queries all 3 models with full automated synthesis.
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
  const { question, context, maxRounds = 3 } = params

  // Create providers
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
  // Include Anthropic only when not in Claude Code mode
  if (config.apiKeys.anthropic && !settings.claudeCodeMode) {
    providers.push({
      name: 'anthropic',
      provider: new AnthropicProvider({ apiKey: config.apiKeys.anthropic }),
    })
  }

  if (providers.length === 0) {
    throw new Error('No providers available. Configure at least OpenAI or Google API key.')
  }

  // Build initial message
  let messageContent = ''
  if (context) {
    messageContent += `Context:\n${context}\n\n`
  }
  messageContent += `Question: ${question}`

  const allResponses: Array<{ provider: string; model: string; content: string; round: number }> = []
  let currentResponses: ModelResponse[] = []
  let analysis: ConsensusAnalysis = {
    hasConsensus: false,
    agreements: [],
    divergences: [],
    confidence: 0,
  }
  let round = 0

  // ============ ROUND 1: Initial query ============
  round = 1
  const initialResults = await Promise.allSettled(
    providers.map(async ({ name, provider }) => {
      let model = settings.models[name]
      const validation = validateModelId(name, model)
      if (!validation.valid) {
        model = DEFAULT_MODELS[name]
      }

      const content = await retryWithBackoff(
        () => provider.chat([{ role: 'user' as const, content: messageContent }], model as ModelId),
        name
      )

      trackUsage(name, estimateTokens(messageContent), estimateTokens(content))

      return {
        model: model as ModelId,
        provider: name as CoreProvider,
        content,
        timestamp: Date.now(),
      }
    })
  )

  // Collect successful responses
  const errors: Array<{ provider: string; message: string; category: ErrorCategory }> = []

  for (let i = 0; i < initialResults.length; i++) {
    const result = initialResults[i]
    if (result.status === 'fulfilled') {
      currentResponses.push(result.value)
      allResponses.push({
        provider: result.value.provider,
        model: result.value.model,
        content: result.value.content,
        round: 1,
      })
    } else {
      const providerName = providers[i].name
      const error = result.reason instanceof Error ? result.reason : new Error('Unknown error')
      const { category } = categorizeError(error)
      errors.push({ provider: providerName, message: error.message, category })
    }
  }

  if (currentResponses.length === 0) {
    const errorList = errors.map(e => `  • ${e.provider}: ${e.message}`).join('\n')
    throw new Error(`All providers failed.\n\nErrors:\n${errorList}`)
  }

  // ============ ANALYSIS: Check for consensus ============
  const analyzerProvider = providers.find(p =>
    currentResponses.some(r => r.provider === p.name)
  )!
  const analyzerModel = settings.models[analyzerProvider.name] || DEFAULT_MODELS[analyzerProvider.name]

  const analysisPrompt = buildAnalysisPrompt(question, currentResponses)
  const analysisResponse = await retryWithBackoff(
    () => analyzerProvider.provider.chat([{ role: 'user' as const, content: analysisPrompt }], analyzerModel as ModelId),
    analyzerProvider.name
  )
  trackUsage(analyzerProvider.name, estimateTokens(analysisPrompt), estimateTokens(analysisResponse))

  analysis = parseAnalysis(analysisResponse)

  // ============ REFINEMENT ROUNDS (if needed) ============
  while (!analysis.hasConsensus && round < maxRounds && analysis.divergences.length > 0) {
    round++

    const refinementResults = await Promise.allSettled(
      providers
        .filter(p => currentResponses.some(r => r.provider === p.name))
        .map(async ({ name, provider }) => {
          let model = settings.models[name]
          const validation = validateModelId(name, model)
          if (!validation.valid) {
            model = DEFAULT_MODELS[name]
          }

          const previousAnswer = currentResponses.find(r => r.provider === name)?.content || ''
          const refinementPrompt = buildRefinementPrompt(
            question,
            previousAnswer,
            currentResponses,
            analysis.divergences,
            model
          )

          const content = await retryWithBackoff(
            () => provider.chat([{ role: 'user' as const, content: refinementPrompt }], model as ModelId),
            name
          )

          trackUsage(name, estimateTokens(refinementPrompt), estimateTokens(content))

          return {
            model: model as ModelId,
            provider: name as CoreProvider,
            content,
            timestamp: Date.now(),
          }
        })
    )

    const newResponses: ModelResponse[] = []
    for (const result of refinementResults) {
      if (result.status === 'fulfilled') {
        newResponses.push(result.value)
        allResponses.push({
          provider: result.value.provider,
          model: result.value.model,
          content: result.value.content,
          round,
        })
      }
    }

    if (newResponses.length > 0) {
      currentResponses = newResponses

      // Re-analyze
      const reanalysisPrompt = buildAnalysisPrompt(question, currentResponses)
      const reanalysisResponse = await retryWithBackoff(
        () => analyzerProvider.provider.chat([{ role: 'user' as const, content: reanalysisPrompt }], analyzerModel as ModelId),
        analyzerProvider.name
      )
      trackUsage(analyzerProvider.name, estimateTokens(reanalysisPrompt), estimateTokens(reanalysisResponse))

      analysis = parseAnalysis(reanalysisResponse)
    }
  }

  // ============ SYNTHESIS ============
  const synthesisPrompt = buildSynthesisPrompt(question, currentResponses, analysis, round)
  const consensus = await retryWithBackoff(
    () => analyzerProvider.provider.chat([{ role: 'user' as const, content: synthesisPrompt }], analyzerModel as ModelId),
    analyzerProvider.name
  )
  trackUsage(analyzerProvider.name, estimateTokens(synthesisPrompt), estimateTokens(consensus))

  // Build result
  const result: HivemindToolResult = {
    consensus,
    analysis,
    rounds: round,
    responses: allResponses,
  }

  // Add orchestrator note when in Claude Code mode
  if (settings.claudeCodeMode) {
    result.orchestratorNote =
      'You (Claude) are the orchestrator. Add your own perspective based on the same context, ' +
      'note where you agree or disagree with the consensus, and provide the final answer to the user.'
  }

  return result
}
