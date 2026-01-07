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
} from '@hivemind/core'
import { useSettingsStore } from '../stores/settings-store'
import { useConversationStore } from '../stores/conversation-store'

const MAX_ROUNDS = 3

export function useHivemindChat() {
  const { apiKeys } = useSettingsStore()
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

      const [gptResponse, claudeResponse, geminiResponse] = await Promise.all([
        openai.chat(messages, 'gpt-4o').then((content) => {
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
          return { model: 'gpt-4o' as const, provider: 'openai' as const, content, timestamp: Date.now() }
        }),
        anthropic.chat(messages, 'claude-3-5-sonnet-20241022').then((content) => {
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
          return { model: 'claude-3-5-sonnet-20241022' as const, provider: 'anthropic' as const, content, timestamp: Date.now() }
        }),
        google.chat(messages, 'gemini-2.0-flash-exp').then((content) => {
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
          return { model: 'gemini-2.0-flash-exp' as const, provider: 'google' as const, content, timestamp: Date.now() }
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
      onStatus({
        phase: 'synthesis',
        message: 'Synthesizing consensus...',
        progress: 90,
      })

      const synthesisPrompt = buildSynthesisPrompt(question, responses, analysis, round)
      const consensus = await anthropic.chat(
        [{ role: 'user', content: synthesisPrompt }],
        'claude-3-5-sonnet-20241022'
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
    [apiKeys, getActiveConversation]
  )

  return { sendHivemindMessage }
}
