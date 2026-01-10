import { describe, it, expect } from 'vitest'
import { MODELS, DEFAULT_HIVEMIND_MODELS } from '../src/types'

describe('Types', () => {
  describe('MODELS', () => {
    it('should have 16 models defined', () => {
      expect(MODELS).toHaveLength(16)
    })

    it('should have models from all three providers', () => {
      const providers = [...new Set(MODELS.map((m) => m.provider))]
      expect(providers).toContain('openai')
      expect(providers).toContain('anthropic')
      expect(providers).toContain('google')
    })

    it('should have correct structure for each model', () => {
      MODELS.forEach((model) => {
        expect(model).toHaveProperty('id')
        expect(model).toHaveProperty('name')
        expect(model).toHaveProperty('provider')
        expect(typeof model.id).toBe('string')
        expect(typeof model.name).toBe('string')
        expect(['openai', 'anthropic', 'google']).toContain(model.provider)
      })
    })
  })

  describe('DEFAULT_HIVEMIND_MODELS', () => {
    it('should have 3 default models', () => {
      expect(DEFAULT_HIVEMIND_MODELS).toHaveLength(3)
    })

    it('should include one model from each provider', () => {
      expect(DEFAULT_HIVEMIND_MODELS).toContain('gpt-5.2')
      expect(DEFAULT_HIVEMIND_MODELS).toContain('claude-opus-4-5-20251101')
      expect(DEFAULT_HIVEMIND_MODELS).toContain('gemini-3-pro-preview')
    })
  })
})
