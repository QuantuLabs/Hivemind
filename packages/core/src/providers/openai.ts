import type { ModelId, Provider } from '../types'
import { BaseProvider, type StreamCallbacks, type ProviderConfig } from './base'

export class OpenAIProvider extends BaseProvider {
  readonly provider: Provider = 'openai'

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
    })
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    model: ModelId,
    callbacks?: StreamCallbacks
  ): Promise<string> {
    // OpenAI Automatic Prompt Caching:
    // - Enabled automatically for prompts >= 1024 tokens (no code changes needed)
    // - Caches the longest matching prefix, increments of 128 tokens
    // - 50% cost reduction on cached input tokens
    // - 50-80% latency reduction (time-to-first-token)
    // - Cache TTL: 5-10 minutes of inactivity, max 1 hour
    // - Tip: Place static content (instructions, examples) at the START of prompts
    // - Supported: GPT-4o, GPT-4o mini, o1-preview, o1-mini, and fine-tuned versions
    // See: https://platform.openai.com/docs/guides/prompt-caching

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: !!callbacks?.onToken,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    if (callbacks?.onToken && response.body) {
      return this.handleStream(response.body, callbacks)
    }

    const data = await response.json() as { choices: Array<{ message?: { content?: string } }> }
    const content = data.choices[0]?.message?.content || ''
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
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const token = parsed.choices[0]?.delta?.content || ''
              if (token) {
                content += token
                callbacks.onToken?.(token)
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
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }
}
