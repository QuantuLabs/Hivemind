import type { ModelId, ModelResponse, Provider } from '../types'

export interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: (content: string) => void
  onError?: (error: Error) => void
}

export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  useGrounding?: boolean
}

export abstract class BaseProvider {
  protected apiKey: string
  protected baseUrl?: string

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
  }

  abstract readonly provider: Provider

  abstract chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    model: ModelId,
    callbacks?: StreamCallbacks
  ): Promise<string>

  abstract validateKey(): Promise<boolean>

  protected createResponse(model: ModelId, content: string): ModelResponse {
    return {
      model,
      provider: this.provider,
      content,
      timestamp: Date.now(),
    }
  }
}
