import { describe, it, expect } from 'bun:test'
import { getProviderInfo } from '../../lib/api-validation'

describe('API Validation', () => {
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

  describe('validateApiKey', () => {
    // These tests would require actual network calls or more complex mocking
    // For now, we test the synchronous parts of the API validation module
    it('should export validateApiKey function', async () => {
      const { validateApiKey } = await import('../../lib/api-validation')
      expect(typeof validateApiKey).toBe('function')
    })

    it('should return error for empty API key', async () => {
      const { validateApiKey } = await import('../../lib/api-validation')
      const result = await validateApiKey('openai', '')

      expect(result).toEqual({
        valid: false,
        error: 'API key is required',
      })
    })

    it('should return error for whitespace-only API key', async () => {
      const { validateApiKey } = await import('../../lib/api-validation')
      const result = await validateApiKey('anthropic', '   ')

      expect(result).toEqual({
        valid: false,
        error: 'API key is required',
      })
    })

    it('should return error for unknown provider', async () => {
      const { validateApiKey } = await import('../../lib/api-validation')
      const result = await validateApiKey('unknown' as 'openai', 'key')

      expect(result).toEqual({
        valid: false,
        error: 'Unknown provider',
      })
    })
  })
})
