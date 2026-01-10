import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: Error) => void
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry,
  } = options

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxAttempts) {
        break
      }

      // Check if error is retryable (rate limits, network errors, 5xx)
      const isRetryable = isRetryableError(lastError)
      if (!isRetryable) {
        throw lastError
      }

      onRetry?.(attempt, lastError)

      // Wait with exponential backoff
      const waitTime = delayMs * Math.pow(backoffMultiplier, attempt - 1)
      await sleep(waitTime)
    }
  }

  throw lastError
}

function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()

  // Rate limit errors
  if (message.includes('rate limit') || message.includes('429')) {
    return true
  }

  // Network/timeout errors
  if (message.includes('network') || message.includes('timeout') || message.includes('econnreset')) {
    return true
  }

  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return true
  }

  // Generic fetch errors
  if (message.includes('failed to fetch') || message.includes('fetch failed')) {
    return true
  }

  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
