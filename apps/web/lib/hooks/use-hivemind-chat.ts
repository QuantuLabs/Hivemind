import { useCallback } from 'react'
import {
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  buildAnalysisPrompt,
  buildRefinementPrompt,
  buildSynthesisPrompt,
  parseAnalysis,
  type DeliberationStatus,
  type ModelResponse,
  type HivemindResult,
  type ConsensusAnalysis,
  type Provider,
} from '@hivemind/core'
import { useSettingsStore } from '../stores/settings-store'
import { useConversationStore } from '../stores/conversation-store'

const MAX_ROUNDS = 3

function getProviderForModel(model: string): Provider {
  if (model.startsWith('gpt')) return 'openai'
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gemini')) return 'google'
  return 'anthropic'
}

export function useHivemindChat() {
  const { apiKeys, orchestratorModel, providerModels } = useSettingsStore()
  const getActiveConversation = useConversationStore((state) => state.getActiveConversation)

  const sendHivemindMessage = useCallback(
    async (
      question: string,
      onStatus: (status: DeliberationStatus) => void
    ): Promise<HivemindResult> => {
      if (!apiKeys.openai || !apiKeys.anthropic || !apiKeys.google) {
        throw new Error('All three API keys (OpenAI, Anthropic, Google) are required for Hivemind mode')
      }

      const conversation = getActiveConversation()
      const history = conversation?.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })) || []

      const messages = [...history, { role: 'user' as const, content: question }]

      const openai = new OpenAIProvider({ apiKey: apiKeys.openai })
      const anthropic = new AnthropicProvider({ apiKey: apiKeys.anthropic })
      const google = new GoogleProvider({ apiKey: apiKeys.google })

      // Get orchestrator provider
      const orchestratorProvider = getProviderForModel(orchestratorModel)
      const orchestrator =
        orchestratorProvider === 'openai' ? openai :
        orchestratorProvider === 'google' ? google : anthropic

      let round = 0
      let responses: ModelResponse[] = []
      let analysis: ConsensusAnalysis = {
        hasConsensus: false,
        agreements: [],
        divergences: [],
        confidence: 0,
      }

      // Initial round - query all models
      onStatus({
        phase: 'initial',
        message: 'Querying models...',
        modelStatuses: {
          openai: 'loading',
          anthropic: 'loading',
          google: 'loading',
        },
        progress: 10,
      })

      const openaiModel = providerModels.openai
      const anthropicModel = providerModels.anthropic
      const googleModel = providerModels.google

      const [gptResponse, claudeResponse, geminiResponse] = await Promise.all([
        openai.chat(messages, openaiModel).then((content) => {
          onStatus({
            phase: 'initial',
            message: 'Querying models...',
            modelStatuses: {
              openai: 'done',
              anthropic: 'loading',
              google: 'loading',
            },
            progress: 30,
          })
          return { model: openaiModel, provider: 'openai' as const, content, timestamp: Date.now() }
        }),
        anthropic.chat(messages, anthropicModel).then((content) => {
          onStatus({
            phase: 'initial',
            message: 'Querying models...',
            modelStatuses: {
              openai: 'done',
              anthropic: 'done',
              google: 'loading',
            },
            progress: 50,
          })
          return { model: anthropicModel, provider: 'anthropic' as const, content, timestamp: Date.now() }
        }),
        google.chat(messages, googleModel).then((content) => {
          onStatus({
            phase: 'initial',
            message: 'Querying models...',
            modelStatuses: {
              openai: 'done',
              anthropic: 'done',
              google: 'done',
            },
            progress: 60,
          })
          return { model: googleModel, provider: 'google' as const, content, timestamp: Date.now() }
        }),
      ])

      responses = [gptResponse, claudeResponse, geminiResponse]

      // Deliberation loop
      while (round < MAX_ROUNDS) {
        round++

        // Analyze responses
        onStatus({
          phase: 'analysis',
          message: 'Analyzing responses...',
          round,
          maxRounds: MAX_ROUNDS,
          progress: 60 + round * 10,
        })

        const analysisPrompt = buildAnalysisPrompt(question, responses)
        const analysisResponse = await orchestrator.chat(
          [{ role: 'user', content: analysisPrompt }],
          orchestratorModel
        )

        analysis = parseAnalysis(analysisResponse)

        // Check for consensus
        if (analysis.hasConsensus || analysis.confidence > 0.8) {
          break
        }

        // If no consensus and not last round, do refinement
        if (round < MAX_ROUNDS) {
          onStatus({
            phase: 'deliberation',
            message: `Round ${round}/${MAX_ROUNDS} - Resolving divergences...`,
            round,
            maxRounds: MAX_ROUNDS,
            modelStatuses: {
              openai: 'loading',
              anthropic: 'loading',
              google: 'loading',
            },
            progress: 70 + round * 5,
          })

          // Each model refines based on others' responses
          const [refinedGpt, refinedClaude, refinedGemini] = await Promise.all([
            openai.chat(
              [{ role: 'user', content: buildRefinementPrompt(question, gptResponse.content, responses, analysis.divergences, openaiModel) }],
              openaiModel
            ).then((content) => ({ ...gptResponse, content, timestamp: Date.now() })),
            anthropic.chat(
              [{ role: 'user', content: buildRefinementPrompt(question, claudeResponse.content, responses, analysis.divergences, anthropicModel) }],
              anthropicModel
            ).then((content) => ({ ...claudeResponse, content, timestamp: Date.now() })),
            google.chat(
              [{ role: 'user', content: buildRefinementPrompt(question, geminiResponse.content, responses, analysis.divergences, googleModel) }],
              googleModel
            ).then((content) => ({ ...geminiResponse, content, timestamp: Date.now() })),
          ])

          responses = [refinedGpt, refinedClaude, refinedGemini]
        }
      }

      // Synthesis
      onStatus({
        phase: 'synthesis',
        message: 'Synthesizing consensus...',
        progress: 90,
      })

      const synthesisPrompt = buildSynthesisPrompt(question, responses, analysis, round)
      const consensus = await orchestrator.chat(
        [{ role: 'user', content: synthesisPrompt }],
        orchestratorModel
      )

      onStatus({
        phase: 'complete',
        message: 'Consensus reached',
        progress: 100,
      })

      return {
        consensus,
        rounds: round,
        modelResponses: responses,
        analysis,
      }
    },
    [apiKeys, orchestratorModel, providerModels, getActiveConversation]
  )

  return { sendHivemindMessage }
}
