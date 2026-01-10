import type { ModelId, Provider } from '../types'
import { BaseProvider, type StreamCallbacks, type ProviderConfig } from './base'

// Minimum tokens required for Anthropic prompt caching to be effective
// See: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
const MIN_CACHE_TOKENS = 1024

// Rough token estimation (~4 chars per token for English text)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export class AnthropicProvider extends BaseProvider {
  readonly provider: Provider = 'anthropic'

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.anthropic.com/v1',
    })
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    model: ModelId,
    callbacks?: StreamCallbacks
  ): Promise<string> {
    // Anthropic Prompt Caching Strategy:
    // - Cache the first substantial user message (typically contains context)
    // - Requires minimum 1024 tokens to be effective
    // - cache_control: {type: "ephemeral"} marks the cache breakpoint
    // - Content BEFORE the breakpoint is cached and reused on follow-ups
    // - Cache has 5-minute TTL, refreshed on each hit
    // - 90% cost reduction on cached tokens (cache reads)
    // See: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

    const transformedMessages = this.enableCaching
      ? messages.map((msg, idx) => {
          // Cache the first user message if it's substantial enough
          // This typically contains the context/instructions which are reused
          if (idx === 0 && msg.role === 'user') {
            const tokenEstimate = estimateTokens(msg.content)

            // Only apply cache_control if content meets minimum threshold
            if (tokenEstimate >= MIN_CACHE_TOKENS) {
              return {
                role: msg.role,
                content: [
                  {
                    type: 'text' as const,
                    text: msg.content,
                    cache_control: { type: 'ephemeral' },
                  },
                ],
              }
            }
          }
          return msg
        })
      : messages

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }

    // Add beta header for prompt caching (required even if feature is GA for some accounts)
    if (this.enableCaching) {
      headers['anthropic-beta'] = 'prompt-caching-2024-07-31'
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: transformedMessages,
        stream: !!callbacks?.onToken,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }

    if (callbacks?.onToken && response.body) {
      return this.handleStream(response.body, callbacks)
    }

    const data = await response.json() as { content: Array<{ text?: string }> }
    const content = data.content[0]?.text || ''
    callbacks?.onComplete?.(content)
    return content
  }

  private async handleStream(
    body: ReadableStream<Uint8Array>,
    callbacks: StreamCallbacks
  ): Promise<string> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let content = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((line) => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta') {
                const token = parsed.delta?.text || ''
                if (token) {
                  content += token
                  callbacks.onToken?.(token)
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      callbacks.onComplete?.(content)
      return content
    } catch (error) {
      callbacks.onError?.(error as Error)
      throw error
    }
  }

  async validateKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
