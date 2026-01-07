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
} from '@hivemind/core'
import { getConfig, hasRequiredKeys } from '../config'

const MAX_ROUNDS = 3

export interface HivemindToolParams {
  question: string
  models?: string[]
  consensusOnly?: boolean
}

export interface HivemindToolResult {
  consensus: string
  rounds: number
  modelResponses?: Array<{ model: string; content: string }>
  analysis?: ConsensusAnalysis
}

export async function hivemindTool(
  params: HivemindToolParams
): Promise<HivemindToolResult> {
  if (!hasRequiredKeys()) {
    throw new Error(
      'Missing API keys. Please configure your API keys using the configure_keys tool or by editing ~/.config/hivemind/config.json'
    )
  }

  const config = getConfig()
  const { question, consensusOnly = false } = params

  const openai = new OpenAIProvider({ apiKey: config.apiKeys.openai! })
  const anthropic = new AnthropicProvider({ apiKey: config.apiKeys.anthropic! })
  const google = new GoogleProvider({ apiKey: config.apiKeys.google! })

  const messages = [{ role: 'user' as const, content: question }]

  let round = 0
  let responses: ModelResponse[] = []
  let analysis: ConsensusAnalysis = {
    hasConsensus: false,
    agreements: [],
    divergences: [],
    confidence: 0,
  }

  // Initial round - query all models in parallel
  const [gptResponse, claudeResponse, geminiResponse] = await Promise.all([
    openai.chat(messages, 'gpt-4o').then((content) => ({
      model: 'gpt-4o' as const,
      provider: 'openai' as const,
      content,
      timestamp: Date.now(),
    })),
    anthropic.chat(messages, 'claude-3-5-sonnet-20241022').then((content) => ({
      model: 'claude-3-5-sonnet-20241022' as const,
      provider: 'anthropic' as const,
      content,
      timestamp: Date.now(),
    })),
    google.chat(messages, 'gemini-2.0-flash-exp').then((content) => ({
      model: 'gemini-2.0-flash-exp' as const,
      provider: 'google' as const,
      content,
      timestamp: Date.now(),
    })),
  ])

  responses = [gptResponse, claudeResponse, geminiResponse]

  // Deliberation loop
  while (round < MAX_ROUNDS) {
    round++

    // Analyze responses using Claude
    const analysisPrompt = buildAnalysisPrompt(question, responses)
    const analysisResponse = await anthropic.chat(
      [{ role: 'user', content: analysisPrompt }],
      'claude-3-5-sonnet-20241022'
    )

    analysis = parseAnalysis(analysisResponse)

    // Check for consensus
    if (analysis.hasConsensus || analysis.confidence > 0.8) {
      break
    }

    // If no consensus and not last round, do refinement
    if (round < MAX_ROUNDS) {
      const [refinedGpt, refinedClaude, refinedGemini] = await Promise.all([
        openai.chat(
          [{ role: 'user', content: buildRefinementPrompt(question, gptResponse.content, responses, analysis.divergences, 'gpt-4o') }],
          'gpt-4o'
        ).then((content) => ({ ...gptResponse, content, timestamp: Date.now() })),
        anthropic.chat(
          [{ role: 'user', content: buildRefinementPrompt(question, claudeResponse.content, responses, analysis.divergences, 'claude-3-5-sonnet-20241022') }],
          'claude-3-5-sonnet-20241022'
        ).then((content) => ({ ...claudeResponse, content, timestamp: Date.now() })),
        google.chat(
          [{ role: 'user', content: buildRefinementPrompt(question, geminiResponse.content, responses, analysis.divergences, 'gemini-2.0-flash-exp') }],
          'gemini-2.0-flash-exp'
        ).then((content) => ({ ...geminiResponse, content, timestamp: Date.now() })),
      ])

      responses = [refinedGpt, refinedClaude, refinedGemini]
    }
  }

  // Synthesis
  const synthesisPrompt = buildSynthesisPrompt(question, responses, analysis, round)
  const consensus = await anthropic.chat(
    [{ role: 'user', content: synthesisPrompt }],
    'claude-3-5-sonnet-20241022'
  )

  if (consensusOnly) {
    return { consensus, rounds: round }
  }

  return {
    consensus,
    rounds: round,
    modelResponses: responses.map((r) => ({ model: r.model, content: r.content })),
    analysis,
  }
}
