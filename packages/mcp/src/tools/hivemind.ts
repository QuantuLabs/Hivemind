import {
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  buildAnalysisPrompt,
  buildRefinementPrompt,
  buildSynthesisPrompt,
  parseAnalysis,
  type ModelResponse,
  type ConsensusAnalysis,
  type BaseProvider,
} from '@hivemind/core'
import { getConfig, hasRequiredKeys, getSettings, getAvailableProviders, type Provider } from '../config'

const MAX_ROUNDS = 3

// Default models per provider
const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-5.2',
  anthropic: 'claude-opus-4-5-20251101',
  google: 'gemini-3-pro-preview',
}

export interface HivemindToolParams {
  question: string
  context?: string  // Additional context (code, files, etc.) to include with the question
  models?: string[]
  consensusOnly?: boolean
}

export interface HivemindToolResult {
  consensus: string
  rounds: number
  modelResponses?: Array<{ model: string; content: string }>
  analysis?: ConsensusAnalysis
  providers?: string[]
}

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
  const availableProviders = getAvailableProviders()
  const { question, context, consensusOnly = false } = params

  // Create only available providers
  const providers: Partial<Record<Provider, BaseProvider>> = {}

  if (config.apiKeys.openai) {
    providers.openai = new OpenAIProvider({ apiKey: config.apiKeys.openai })
  }
  if (config.apiKeys.anthropic) {
    providers.anthropic = new AnthropicProvider({ apiKey: config.apiKeys.anthropic })
  }
  if (config.apiKeys.google) {
    providers.google = new GoogleProvider({
      apiKey: config.apiKeys.google,
      useGrounding: settings.useGrounding,
    })
  }

  // Build message content with optional context
  const messageContent = context
    ? `Context:\n${context}\n\nQuestion: ${question}`
    : question

  const messages = [{ role: 'user' as const, content: messageContent }]

  // Query all available providers in parallel
  const responses: ModelResponse[] = await Promise.all(
    availableProviders.map(async (providerName) => {
      const provider = providers[providerName]!
      const model = DEFAULT_MODELS[providerName]
      const content = await provider.chat(messages, model as any)
      return {
        model,
        provider: providerName,
        content,
        timestamp: Date.now(),
      }
    })
  )

  // If only one provider: return directly without deliberation
  if (availableProviders.length === 1) {
    return {
      consensus: responses[0].content,
      rounds: 1,
      providers: availableProviders,
      ...(consensusOnly ? {} : { modelResponses: responses.map(r => ({ model: r.model, content: r.content })) }),
    }
  }

  // Choose orchestrator (preference: anthropic > openai > google)
  const orchestratorName = availableProviders.includes('anthropic')
    ? 'anthropic'
    : availableProviders.includes('openai')
    ? 'openai'
    : 'google'
  const orchestrator = providers[orchestratorName]!
  const orchestratorModel = DEFAULT_MODELS[orchestratorName]

  let round = 0
  let currentResponses = responses
  let analysis: ConsensusAnalysis = {
    hasConsensus: false,
    agreements: [],
    divergences: [],
    confidence: 0,
  }

  // Deliberation loop (only if 2+ providers)
  while (round < MAX_ROUNDS) {
    round++

    // Analyze responses using orchestrator
    const analysisPrompt = buildAnalysisPrompt(question, currentResponses)
    const analysisResponse = await orchestrator.chat(
      [{ role: 'user', content: analysisPrompt }],
      orchestratorModel as any
    )

    analysis = parseAnalysis(analysisResponse)

    // Check for consensus
    if (analysis.hasConsensus || analysis.confidence > 0.8) {
      break
    }

    // If no consensus and not last round, do refinement
    if (round < MAX_ROUNDS) {
      const refinedResponses = await Promise.all(
        availableProviders.map(async (providerName) => {
          const provider = providers[providerName]!
          const model = DEFAULT_MODELS[providerName]
          const previousResponse = currentResponses.find(r => r.provider === providerName)!

          const refinementPrompt = buildRefinementPrompt(
            question,
            previousResponse.content,
            currentResponses,
            analysis.divergences,
            model
          )

          const content = await provider.chat(
            [{ role: 'user', content: refinementPrompt }],
            model as any
          )

          return {
            model,
            provider: providerName,
            content,
            timestamp: Date.now(),
          }
        })
      )
      currentResponses = refinedResponses
    }
  }

  // Synthesis
  const synthesisPrompt = buildSynthesisPrompt(question, currentResponses, analysis, round)
  const consensus = await orchestrator.chat(
    [{ role: 'user', content: synthesisPrompt }],
    orchestratorModel as any
  )

  if (consensusOnly) {
    return { consensus, rounds: round, providers: availableProviders }
  }

  return {
    consensus,
    rounds: round,
    modelResponses: currentResponses.map((r) => ({ model: r.model, content: r.content })),
    analysis,
    providers: availableProviders,
  }
}
