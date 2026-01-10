import { useCallback } from 'react'
import { OpenAIProvider, AnthropicProvider, GoogleProvider } from '@quantulabs/hivemind-core'
import { useSettingsStore } from '../stores/settings-store'
import { useConversationStore } from '../stores/conversation-store'
import { withRetry } from '../utils'

export function useSoloChat() {
  const { selectedModel, apiKeys } = useSettingsStore()
  const getActiveConversation = useConversationStore((state) => state.getActiveConversation)

  const sendSoloMessage = useCallback(
    async (content: string, onToken?: (token: string) => void): Promise<string> => {
      const conversation = getActiveConversation()
      const messages = conversation?.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })) || []

      // Add the new message
      messages.push({ role: 'user' as const, content })

      // Get the right provider
      let provider

      if (selectedModel.startsWith('gpt')) {
        if (!apiKeys.openai) throw new Error('OpenAI API key not configured')
        provider = new OpenAIProvider({ apiKey: apiKeys.openai })
      } else if (selectedModel.startsWith('claude')) {
        if (!apiKeys.anthropic) throw new Error('Anthropic API key not configured')
        provider = new AnthropicProvider({ apiKey: apiKeys.anthropic })
      } else if (selectedModel.startsWith('gemini')) {
        if (!apiKeys.google) throw new Error('Google API key not configured')
        provider = new GoogleProvider({ apiKey: apiKeys.google })
      } else {
        throw new Error('Unknown model')
      }

      const response = await withRetry(
        () => provider.chat(messages, selectedModel, {
          onToken,
          onComplete: () => {},
          onError: (error) => {
            throw error
          },
        }),
        {
          maxAttempts: 3,
          delayMs: 1000,
          onRetry: (attempt, error) => {
            console.warn(`[SoloChat] Retry attempt ${attempt} after error: ${error.message}`)
          },
        }
      )

      return response
    },
    [selectedModel, apiKeys, getActiveConversation]
  )

  return { sendSoloMessage }
}
