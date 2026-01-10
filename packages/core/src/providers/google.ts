import type { ModelId, Provider } from '../types'
import { BaseProvider, type StreamCallbacks, type ProviderConfig } from './base'

export class GoogleProvider extends BaseProvider {
  readonly provider: Provider = 'google'
  private useGrounding: boolean

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
    })
    this.useGrounding = config.useGrounding ?? false
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    model: ModelId,
    callbacks?: StreamCallbacks
  ): Promise<string> {
    // Google Gemini Implicit Caching (automatic since May 2025):
    // - Enabled by default for Gemini 2.5+ models (no code changes needed)
    // - 90% cost reduction on cached tokens for Gemini 2.5+
    // - 75% cost reduction for Gemini 2.0 models
    // - Check `cached_content_token_count` in response metadata for cache hits
    // - For explicit caching control, use the cachedContents API separately
    // See: https://ai.google.dev/gemini-api/docs/caching
    // See: https://developers.googleblog.com/en/gemini-2-5-models-now-support-implicit-caching/
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    const endpoint = callbacks?.onToken ? 'streamGenerateContent' : 'generateContent'
    const url = `${this.baseUrl}/models/${model}:${endpoint}?key=${this.apiKey}`

    // Build request body with optional grounding
    const requestBody: Record<string, unknown> = { contents }

    if (this.useGrounding) {
      requestBody.tools = [
        {
          google_search: {},
        },
      ]
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google AI API error: ${error}`)
    }

    if (callbacks?.onToken && response.body) {
      return this.handleStream(response.body, callbacks)
    }

    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Google returns JSON array chunks
        const matches = buffer.match(/\{[^{}]*"text"\s*:\s*"[^"]*"[^{}]*\}/g)
        if (matches) {
          for (const match of matches) {
            try {
              const parsed = JSON.parse(match)
              const token = parsed.text || ''
              if (token) {
                content += token
                callbacks.onToken?.(token)
              }
            } catch {
              // Skip invalid JSON
            }
          }
          buffer = ''
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
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`
      )
      return response.ok
    } catch {
      return false
    }
  }
}
