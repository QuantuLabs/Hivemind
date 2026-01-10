import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenAIProvider, AnthropicProvider, GoogleProvider, BaseProvider } from '../src/providers'
// Also import from index to ensure coverage
import * as CoreExports from '../src/index'
import type { ModelId, Provider } from '../src/types'

// Test class to access protected methods
class TestableProvider extends BaseProvider {
  readonly provider: Provider = 'openai'

  async chat(): Promise<string> {
    return 'test'
  }

  async validateKey(): Promise<boolean> {
    return true
  }

  // Expose protected method for testing
  testCreateResponse(model: ModelId, content: string) {
    return this.createResponse(model, content)
  }
}

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper to create a mock ReadableStream
function createMockStream(chunks: string[]) {
  let index = 0
  return {
    getReader: () => ({
      read: async () => {
        if (index < chunks.length) {
          const value = new TextEncoder().encode(chunks[index])
          index++
          return { done: false, value }
        }
        return { done: true, value: undefined }
      },
    }),
  } as ReadableStream<Uint8Array>
}

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

    it('should call onComplete callback', async () => {
      const onComplete = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test response' } }],
        }),
      })

      await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'gpt-4o',
        { onComplete }
      )

      expect(onComplete).toHaveBeenCalledWith('Test response')
    })

    it('should handle empty content in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: {} }],
        }),
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'gpt-4o'
      )

      expect(result).toBe('')
    })

    it('should handle missing choices in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [] }),
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'gpt-4o'
      )

      expect(result).toBe('')
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

    it('should handle streaming with onToken callback', async () => {
      const onToken = vi.fn()
      const onComplete = vi.fn()
      const stream = createMockStream([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
        'data: [DONE]\n\n',
      ])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Test' }],
        'gpt-4o',
        { onToken, onComplete }
      )

      expect(onToken).toHaveBeenCalledWith('Hello')
      expect(onToken).toHaveBeenCalledWith(' World')
      expect(onComplete).toHaveBeenCalledWith('Hello World')
      expect(result).toBe('Hello World')
    })

    it('should handle streaming with empty delta content', async () => {
      const onToken = vi.fn()
      const stream = createMockStream([
        'data: {"choices":[{"delta":{}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
      ])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Test' }],
        'gpt-4o',
        { onToken }
      )

      expect(onToken).toHaveBeenCalledTimes(1)
      expect(result).toBe('Hi')
    })

    it('should skip invalid JSON in stream', async () => {
      const onToken = vi.fn()
      const stream = createMockStream([
        'data: invalid json\n\n',
        'data: {"choices":[{"delta":{"content":"Valid"}}]}\n\n',
      ])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Test' }],
        'gpt-4o',
        { onToken }
      )

      expect(onToken).toHaveBeenCalledWith('Valid')
      expect(result).toBe('Valid')
    })

    it('should handle stream errors with onError callback', async () => {
      const onError = vi.fn()
      const error = new Error('Stream error')

      const stream = {
        getReader: () => ({
          read: async () => {
            throw error
          },
        }),
      } as ReadableStream<Uint8Array>

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      await expect(
        provider.chat(
          [{ role: 'user', content: 'Test' }],
          'gpt-4o',
          { onToken: vi.fn(), onError }
        )
      ).rejects.toThrow('Stream error')

      expect(onError).toHaveBeenCalledWith(error)
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

    it('should call onComplete callback', async () => {
      const onComplete = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Test response' }],
        }),
      })

      await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'claude-3-5-sonnet-20241022',
        { onComplete }
      )

      expect(onComplete).toHaveBeenCalledWith('Test response')
    })

    it('should handle empty content in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{}],
        }),
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'claude-3-5-sonnet-20241022'
      )

      expect(result).toBe('')
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

    it('should handle streaming with onToken callback', async () => {
      const onToken = vi.fn()
      const onComplete = vi.fn()
      const stream = createMockStream([
        'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n',
        'data: {"type":"content_block_delta","delta":{"text":" World"}}\n\n',
        'data: {"type":"message_stop"}\n\n',
      ])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Test' }],
        'claude-3-5-sonnet-20241022',
        { onToken, onComplete }
      )

      expect(onToken).toHaveBeenCalledWith('Hello')
      expect(onToken).toHaveBeenCalledWith(' World')
      expect(onComplete).toHaveBeenCalledWith('Hello World')
      expect(result).toBe('Hello World')
    })

    it('should skip non content_block_delta events', async () => {
      const onToken = vi.fn()
      const stream = createMockStream([
        'data: {"type":"message_start"}\n\n',
        'data: {"type":"content_block_delta","delta":{"text":"Hi"}}\n\n',
      ])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      await provider.chat(
        [{ role: 'user', content: 'Test' }],
        'claude-3-5-sonnet-20241022',
        { onToken }
      )

      expect(onToken).toHaveBeenCalledTimes(1)
    })

    it('should skip invalid JSON in stream', async () => {
      const onToken = vi.fn()
      const stream = createMockStream([
        'data: invalid\n\n',
        'data: {"type":"content_block_delta","delta":{"text":"Valid"}}\n\n',
      ])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Test' }],
        'claude-3-5-sonnet-20241022',
        { onToken }
      )

      expect(result).toBe('Valid')
    })

    it('should handle stream errors with onError callback', async () => {
      const onError = vi.fn()
      const error = new Error('Stream error')

      const stream = {
        getReader: () => ({
          read: async () => {
            throw error
          },
        }),
      } as ReadableStream<Uint8Array>

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      await expect(
        provider.chat(
          [{ role: 'user', content: 'Test' }],
          'claude-3-5-sonnet-20241022',
          { onToken: vi.fn(), onError }
        )
      ).rejects.toThrow('Stream error')

      expect(onError).toHaveBeenCalledWith(error)
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

    it('should call onComplete callback', async () => {
      const onComplete = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Test response' }] } }],
        }),
      })

      await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'gemini-2.0-flash-exp',
        { onComplete }
      )

      expect(onComplete).toHaveBeenCalledWith('Test response')
    })

    it('should handle empty candidates in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [] }),
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'gemini-2.0-flash-exp'
      )

      expect(result).toBe('')
    })

    it('should handle missing content in candidates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{}],
        }),
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'gemini-2.0-flash-exp'
      )

      expect(result).toBe('')
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

    it('should include grounding tools when useGrounding is true', async () => {
      const groundingProvider = new GoogleProvider({
        apiKey: 'test-key',
        useGrounding: true
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Response' }] } }],
        }),
      })

      await groundingProvider.chat(
        [{ role: 'user', content: 'Hello' }],
        'gemini-2.0-flash-exp'
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.tools).toEqual([{ google_search: {} }])
    })

    it('should not include grounding tools when useGrounding is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Response' }] } }],
        }),
      })

      await provider.chat(
        [{ role: 'user', content: 'Hello' }],
        'gemini-2.0-flash-exp'
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.tools).toBeUndefined()
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

    it('should handle streaming with onToken callback', async () => {
      const onToken = vi.fn()
      const onComplete = vi.fn()
      const stream = createMockStream([
        '{"text": "Hello"}',
        '{"text": " World"}',
      ])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Test' }],
        'gemini-2.0-flash-exp',
        { onToken, onComplete }
      )

      expect(onToken).toHaveBeenCalledWith('Hello')
      expect(onToken).toHaveBeenCalledWith(' World')
      expect(onComplete).toHaveBeenCalledWith('Hello World')
      expect(result).toBe('Hello World')
    })

    it('should skip invalid JSON in stream', async () => {
      const onToken = vi.fn()
      const stream = createMockStream([
        'invalid json',
        '{"text": "Valid"}',
      ])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const result = await provider.chat(
        [{ role: 'user', content: 'Test' }],
        'gemini-2.0-flash-exp',
        { onToken }
      )

      expect(result).toBe('Valid')
    })

    it('should handle stream errors with onError callback', async () => {
      const onError = vi.fn()
      const error = new Error('Stream error')

      const stream = {
        getReader: () => ({
          read: async () => {
            throw error
          },
        }),
      } as ReadableStream<Uint8Array>

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      await expect(
        provider.chat(
          [{ role: 'user', content: 'Test' }],
          'gemini-2.0-flash-exp',
          { onToken: vi.fn(), onError }
        )
      ).rejects.toThrow('Stream error')

      expect(onError).toHaveBeenCalledWith(error)
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

    it('should create response with correct structure', () => {
      const provider = new TestableProvider({ apiKey: 'test' })
      const response = provider.testCreateResponse('gpt-4o', 'Test content')

      expect(response).toEqual({
        model: 'gpt-4o',
        provider: 'openai',
        content: 'Test content',
        timestamp: expect.any(Number),
      })
    })

    it('should include current timestamp in response', () => {
      const provider = new TestableProvider({ apiKey: 'test' })
      const before = Date.now()
      const response = provider.testCreateResponse('gpt-4o', 'Test')
      const after = Date.now()

      expect(response.timestamp).toBeGreaterThanOrEqual(before)
      expect(response.timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('Core Exports', () => {
    it('should export all providers', () => {
      expect(CoreExports.OpenAIProvider).toBeDefined()
      expect(CoreExports.AnthropicProvider).toBeDefined()
      expect(CoreExports.GoogleProvider).toBeDefined()
    })

    it('should export types', () => {
      expect(CoreExports.MODELS).toBeDefined()
      expect(CoreExports.DEFAULT_HIVEMIND_MODELS).toBeDefined()
    })

    it('should export consensus functions', () => {
      expect(CoreExports.parseAnalysis).toBeDefined()
      expect(CoreExports.buildAnalysisPrompt).toBeDefined()
      expect(CoreExports.buildRefinementPrompt).toBeDefined()
      expect(CoreExports.buildSynthesisPrompt).toBeDefined()
    })
  })
})
