import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateApiKey, getProviderInfo } from '../../lib/api-validation'

// Mock the providers from @hivemind/core
vi.mock('@hivemind/core', () => ({
  OpenAIProvider: vi.fn().mockImplementation(() => ({
    validateKey: vi.fn().mockResolvedValue(true),
  })),
  AnthropicProvider: vi.fn().mockImplementation(() => ({
    validateKey: vi.fn().mockResolvedValue(true),
  })),
  GoogleProvider: vi.fn().mockImplementation(() => ({
    validateKey: vi.fn().mockResolvedValue(true),
  })),
}))

import { OpenAIProvider, AnthropicProvider, GoogleProvider } from '@hivemind/core'

describe('API Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateApiKey', () => {
    it('should return error for empty API key', async () => {
      const result = await validateApiKey('openai', '')

      expect(result).toEqual({
        valid: false,
        error: 'API key is required',
      })
    })

    it('should return error for whitespace-only API key', async () => {
      const result = await validateApiKey('anthropic', '   ')

      expect(result).toEqual({
        valid: false,
        error: 'API key is required',
      })
    })

    it('should validate OpenAI key', async () => {
      const result = await validateApiKey('openai', 'sk-test-key')

      expect(OpenAIProvider).toHaveBeenCalledWith({ apiKey: 'sk-test-key' })
      expect(result).toEqual({ valid: true })
    })

    it('should validate Anthropic key', async () => {
      const result = await validateApiKey('anthropic', 'sk-ant-test-key')

      expect(AnthropicProvider).toHaveBeenCalledWith({ apiKey: 'sk-ant-test-key' })
      expect(result).toEqual({ valid: true })
    })

    it('should validate Google key', async () => {
      const result = await validateApiKey('google', 'AIza-test-key')

      expect(GoogleProvider).toHaveBeenCalledWith({ apiKey: 'AIza-test-key' })
      expect(result).toEqual({ valid: true })
    })

    it('should return error for unknown provider', async () => {
      const result = await validateApiKey('unknown' as any, 'key')

      expect(result).toEqual({
        valid: false,
        error: 'Unknown provider',
      })
    })

    it('should return invalid for failed validation', async () => {
      vi.mocked(OpenAIProvider).mockImplementationOnce(() => ({
        validateKey: vi.fn().mockResolvedValue(false),
      }))

      const result = await validateApiKey('openai', 'invalid-key')

      expect(result).toEqual({
        valid: false,
        error: 'Invalid API key',
      })
    })

    it('should handle validation errors', async () => {
      vi.mocked(AnthropicProvider).mockImplementationOnce(() => ({
        validateKey: vi.fn().mockRejectedValue(new Error('Network error')),
      }))

      const result = await validateApiKey('anthropic', 'key')

      expect(result).toEqual({
        valid: false,
        error: 'Network error',
      })
    })

    it('should handle non-Error exceptions', async () => {
      vi.mocked(GoogleProvider).mockImplementationOnce(() => ({
        validateKey: vi.fn().mockRejectedValue('String error'),
      }))

      const result = await validateApiKey('google', 'key')

      expect(result).toEqual({
        valid: false,
        error: 'Validation failed',
      })
    })
  })

  describe('getProviderInfo', () => {
    it('should return OpenAI info', () => {
      const info = getProviderInfo('openai')

      expect(info).toEqual({
        name: 'OpenAI',
        placeholder: 'sk-...',
        helpUrl: 'https://platform.openai.com/api-keys',
      })
    })

    it('should return Anthropic info', () => {
      const info = getProviderInfo('anthropic')

      expect(info).toEqual({
        name: 'Anthropic',
        placeholder: 'sk-ant-...',
        helpUrl: 'https://console.anthropic.com/settings/keys',
      })
    })

    it('should return Google info', () => {
      const info = getProviderInfo('google')

      expect(info).toEqual({
        name: 'Google AI',
        placeholder: 'AIza...',
        helpUrl: 'https://aistudio.google.com/app/apikey',
      })
    })
  })
})
