import { describe, it, expect, beforeEach } from 'vitest'
import { trackUsage, getUsageStats, resetSessionStats, formatCost, formatTokens, formatDuration, TOKEN_PRICING } from '../src/usage'

describe('Usage Tracking', () => {
  beforeEach(() => {
    resetSessionStats()
  })

  describe('trackUsage', () => {
    it('should track usage for a provider', () => {
      trackUsage('openai', 1000, 500)
      const stats = getUsageStats()

      expect(stats.session.providers.openai.requests).toBe(1)
      expect(stats.session.providers.openai.inputTokens).toBe(1000)
      expect(stats.session.providers.openai.outputTokens).toBe(500)
    })

    it('should accumulate multiple calls', () => {
      trackUsage('openai', 1000, 500)
      trackUsage('openai', 2000, 1000)
      const stats = getUsageStats()

      expect(stats.session.providers.openai.requests).toBe(2)
      expect(stats.session.providers.openai.inputTokens).toBe(3000)
      expect(stats.session.providers.openai.outputTokens).toBe(1500)
    })

    it('should track different providers separately', () => {
      trackUsage('openai', 1000, 500)
      trackUsage('google', 2000, 1000)
      const stats = getUsageStats()

      expect(stats.session.providers.openai.requests).toBe(1)
      expect(stats.session.providers.google.requests).toBe(1)
    })
  })

  describe('formatCost', () => {
    it('should format cost with dollar sign and 4 decimals', () => {
      expect(formatCost(1.5)).toBe('$1.5000')
      expect(formatCost(0.001)).toBe('$0.0010')
      expect(formatCost(100.999)).toBe('$100.9990')
    })
  })

  describe('formatTokens', () => {
    it('should format tokens with K/M suffix', () => {
      expect(formatTokens(1000)).toBe('1.0K')
      expect(formatTokens(1000000)).toBe('1.00M')
      expect(formatTokens(500)).toBe('500')
    })
  })

  describe('formatDuration', () => {
    it('should format duration in human readable form', () => {
      expect(formatDuration(1000)).toBe('1s')
      expect(formatDuration(60000)).toBe('1m 0s')
      expect(formatDuration(3661000)).toBe('1h 1m')
    })
  })

  describe('TOKEN_PRICING', () => {
    it('should have pricing for all providers', () => {
      expect(TOKEN_PRICING.openai).toBeDefined()
      expect(TOKEN_PRICING.anthropic).toBeDefined()
      expect(TOKEN_PRICING.google).toBeDefined()
    })

    it('should have input and output prices', () => {
      expect(TOKEN_PRICING.openai.input).toBeGreaterThan(0)
      expect(TOKEN_PRICING.openai.output).toBeGreaterThan(0)
    })
  })

  describe('resetSessionStats', () => {
    it('should reset session statistics', () => {
      trackUsage('openai', 1000, 500)
      resetSessionStats()
      const stats = getUsageStats()

      expect(stats.session.providers.openai.requests).toBe(0)
      expect(stats.session.totalRequests).toBe(0)
    })
  })
})
