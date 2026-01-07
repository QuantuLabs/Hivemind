import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenAIProvider, AnthropicProvider, GoogleProvider } from '../src/providers'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Providers', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('OpenAIProvider', () => {
    const provider = new OpenAIProvider({ apiKey: 'test-key' })

    it('should have correct provider name', () => {
      expect(provider.provider).toBe('openai')
    })

    it('should call correct endpoint for chat', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test response' } }],
        }),
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'gpt-4o'
      )

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          }),
        })
      )
      expect(result).toBe('Test response')
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      })

      await expect(
        provider.chat([{ role: 'user', content: 'Hello' }], 'gpt-4o')
      ).rejects.toThrow('OpenAI API error')
    })

    it('should validate API key', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const result = await provider.validateKey()
      expect(result).toBe(true)
    })

    it('should return false for invalid API key', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })

      const result = await provider.validateKey()
      expect(result).toBe(false)
    })

    it('should handle network errors in validation', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await provider.validateKey()
      expect(result).toBe(false)
    })
  })

  describe('AnthropicProvider', () => {
    const provider = new AnthropicProvider({ apiKey: 'test-key' })

    it('should have correct provider name', () => {
      expect(provider.provider).toBe('anthropic')
    })

    it('should call correct endpoint for chat', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Test response' }],
        }),
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'claude-3-5-sonnet-20241022'
      )

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      )
      expect(result).toBe('Test response')
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      })

      await expect(
        provider.chat([{ role: 'user', content: 'Hello' }], 'claude-3-5-sonnet-20241022')
      ).rejects.toThrow('Anthropic API error')
    })

    it('should validate API key', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const result = await provider.validateKey()
      expect(result).toBe(true)
    })
  })

  describe('GoogleProvider', () => {
    const provider = new GoogleProvider({ apiKey: 'test-key' })

    it('should have correct provider name', () => {
      expect(provider.provider).toBe('google')
    })

    it('should call correct endpoint for chat', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Test response' }] } }],
        }),
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'gemini-2.0-flash-exp'
      )

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
        })
      )
      expect(result).toBe('Test response')
    })

    it('should transform message roles correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Response' }] } }],
        }),
      })

      await provider.chat(
        [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
        'gemini-2.0-flash-exp'
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.contents[0].role).toBe('user')
      expect(callBody.contents[1].role).toBe('model')
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      })

      await expect(
        provider.chat([{ role: 'user', content: 'Hello' }], 'gemini-2.0-flash-exp')
      ).rejects.toThrow('Google AI API error')
    })

    it('should validate API key', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const result = await provider.validateKey()
      expect(result).toBe(true)
    })
  })

  describe('BaseProvider', () => {
    it('should allow custom baseUrl', async () => {
      const customProvider = new OpenAIProvider({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      })

      await customProvider.chat([{ role: 'user', content: 'Hello' }], 'gpt-4o')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/chat/completions',
        expect.any(Object)
      )
    })
  })
})
