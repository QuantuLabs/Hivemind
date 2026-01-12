import type { ModelId, ModelResponse, Provider } from '../types'

// Error categorization for retry logic
export type ErrorCategory = 'auth' | 'rate_limit' | 'server' | 'network' | 'client' | 'unknown'

export interface CategorizedError {
  category: ErrorCategory
  retryable: boolean
}

/**
 * Categorize an error to determine if it's retryable and provide diagnostic info.
 *
 * Retryable errors:
 * - 429 (Rate Limit) - Wait and retry
 * - 500, 502, 503, 504 (Server errors) - Transient issues
 * - Network errors (timeout, connection refused) - Connectivity issues
 *
 * Non-retryable errors:
 * - 400 (Bad Request) - Client error, fix required
 * - 401, 403 (Auth errors) - Check API key
 * - 404 (Not Found) - Wrong endpoint/model
 */
export function categorizeError(error: Error): CategorizedError {
  const message = error.message.toLowerCase()

  // Check for HTTP status codes in error message
  if (/\b401\b/.test(message) || /unauthorized/i.test(message)) {
    return { category: 'auth', retryable: false }
  }
  if (/\b403\b/.test(message) || /forbidden/i.test(message)) {
    return { category: 'auth', retryable: false }
  }
  if (/\b429\b/.test(message) || /rate.?limit/i.test(message) || /too many requests/i.test(message)) {
    return { category: 'rate_limit', retryable: true }
  }
  if (/\b(500|502|503|504)\b/.test(message) || /internal.?server/i.test(message) || /service.?unavailable/i.test(message)) {
    return { category: 'server', retryable: true }
  }
  if (/\b400\b/.test(message) || /bad.?request/i.test(message)) {
    return { category: 'client', retryable: false }
  }
  if (/\b404\b/.test(message) || /not.?found/i.test(message)) {
    return { category: 'client', retryable: false }
  }

  // Network-related errors
  if (/econnrefused|econnreset|etimedout|enetunreach|enotfound/i.test(message)) {
    return { category: 'network', retryable: true }
  }
  if (/timeout|aborted|network/i.test(message)) {
    return { category: 'network', retryable: true }
  }
  if (/fetch failed/i.test(message)) {
    return { category: 'network', retryable: true }
  }

  // Unknown error - don't retry by default
  return { category: 'unknown', retryable: false }
}

// Allowlist of official API domains to prevent SSRF attacks
const ALLOWED_DOMAINS: Record<Provider, string[]> = {
  openai: ['api.openai.com'],
  anthropic: ['api.anthropic.com'],
  google: ['generativelanguage.googleapis.com'],
}

// Check if an IP is in a private/internal range
function isPrivateIP(hostname: string): boolean {
  // IPv4 private ranges
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  if (hostname.startsWith('10.')) return true
  if (hostname.startsWith('192.168.')) return true
  // 172.16.0.0/12 = 172.16.0.0 - 172.31.255.255
  if (hostname.startsWith('172.')) {
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      const second = parseInt(parts[1], 10)
      if (second >= 16 && second <= 31) return true
    }
  }
  // Link-local
  if (hostname.startsWith('169.254.')) return true
  // CGNAT
  if (hostname.startsWith('100.64.') || hostname.startsWith('100.65.') ||
      hostname.startsWith('100.66.') || hostname.startsWith('100.67.')) return true
  // Loopback range 127.0.0.0/8
  if (hostname.startsWith('127.')) return true
  // Local domain suffix
  if (hostname.endsWith('.local')) return true
  // IPv6 loopback
  if (hostname === '[::1]' || hostname === '::1') return true
  // IPv6 link-local (fe80::/10)
  if (hostname.startsWith('fe80:') || hostname.startsWith('[fe80:')) return true
  // IPv6 ULA (fc00::/7)
  if (hostname.startsWith('fc') || hostname.startsWith('fd') ||
      hostname.startsWith('[fc') || hostname.startsWith('[fd')) return true
  // Zero address
  if (hostname === '0.0.0.0' || hostname === '[::]') return true

  return false
}

// Validate baseUrl to prevent SSRF - only allow official API domains
export function validateBaseUrl(provider: Provider, baseUrl: string): void {
  try {
    const url = new URL(baseUrl)
    const allowedDomains = ALLOWED_DOMAINS[provider]

    // Block private/internal IPs
    const hostname = url.hostname.toLowerCase()
    if (isPrivateIP(hostname)) {
      throw new Error(`Invalid baseUrl: private/internal addresses are not allowed`)
    }

    // Check against allowlist
    if (!allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
      throw new Error(
        `Invalid baseUrl for ${provider}: domain "${hostname}" is not in the allowlist. ` +
        `Allowed domains: ${allowedDomains.join(', ')}`
      )
    }

    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      throw new Error(`Invalid baseUrl: only HTTPS is allowed`)
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid baseUrl')) {
      throw error
    }
    throw new Error(`Invalid baseUrl: ${baseUrl}`)
  }
}

export interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: (content: string) => void
  onError?: (error: Error) => void
}

export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  useGrounding?: boolean
  enableCaching?: boolean  // Enable prompt caching for reduced costs on follow-ups
}

export abstract class BaseProvider {
  protected apiKey: string
  protected baseUrl?: string
  protected enableCaching: boolean

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
    this.enableCaching = config.enableCaching ?? true  // Caching enabled by default for cost savings
  }

  // Validate baseUrl - must be called by subclasses after provider is set
  protected validateBaseUrlIfCustom(): void {
    if (this.baseUrl) {
      validateBaseUrl(this.provider, this.baseUrl)
    }
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

  // Safe callback invocation - prevents callback errors from crashing streams
  protected safeOnToken(callbacks: StreamCallbacks | undefined, token: string): void {
    try {
      callbacks?.onToken?.(token)
    } catch (error) {
      console.error('[provider] onToken callback error:', error)
    }
  }

  protected safeOnComplete(callbacks: StreamCallbacks | undefined, content: string): void {
    try {
      callbacks?.onComplete?.(content)
    } catch (error) {
      console.error('[provider] onComplete callback error:', error)
    }
  }

  protected safeOnError(callbacks: StreamCallbacks | undefined, error: Error): void {
    try {
      callbacks?.onError?.(error)
    } catch (callbackError) {
      console.error('[provider] onError callback error:', callbackError)
    }
  }

  // Sanitize error response to avoid leaking sensitive data (prompts, API details)
  protected sanitizeErrorResponse(status: number, statusText: string, body: string): string {
    // Only include status info, truncate body to avoid leaking prompts/secrets
    const maxBodyLength = 200
    const truncatedBody = body.length > maxBodyLength
      ? body.slice(0, maxBodyLength) + '...[truncated]'
      : body

    // Redact common sensitive patterns
    const redacted = truncatedBody
      .replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***')
      .replace(/sk-ant-[a-zA-Z0-9_-]+/g, 'sk-ant-***')
      .replace(/AIza[a-zA-Z0-9_-]+/g, 'AIza***')

    return `${status} ${statusText}: ${redacted}`
  }
}
