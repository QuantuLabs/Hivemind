import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the config module
vi.mock('../src/config', () => ({
  getConfig: vi.fn(),
  hasRequiredKeys: vi.fn(),
  getSettings: vi.fn(),
  validateModelId: vi.fn(),
  DEFAULT_MODELS: {
    openai: 'gpt-5.2',
    anthropic: 'claude-opus-4-5-20251101',
    google: 'gemini-3-pro-preview',
  },
  VALID_MODELS: {
    openai: ['gpt-5.2', 'gpt-5'],
    anthropic: ['claude-opus-4-5-20251101'],
    google: ['gemini-3-pro-preview'],
  },
}))

// Mock the usage module
vi.mock('../src/usage', () => ({
  trackUsage: vi.fn(),
}))

// Helper function to categorize errors (inline to avoid hoisting issues)
function categorizeErrorImpl(error: Error) {
  const message = error.message.toLowerCase()
  if (message.includes('401') || message.includes('403')) {
    return { category: 'auth', retryable: false }
  }
  if (message.includes('429')) {
    return { category: 'rate_limit', retryable: true }
  }
  if (message.includes('500') || message.includes('503')) {
    return { category: 'server', retryable: true }
  }
  if (message.includes('network') || message.includes('econnrefused')) {
    return { category: 'network', retryable: true }
  }
  if (message.includes('400') || message.includes('404')) {
    return { category: 'client', retryable: false }
  }
  return { category: 'unknown', retryable: false }
}

// Mock hivemind-core providers
vi.mock('@quantulabs/hivemind-core', () => ({
  OpenAIProvider: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
  })),
  GoogleProvider: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
  })),
  AnthropicProvider: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
  })),
  categorizeError: vi.fn((error: Error) => {
    const message = error.message.toLowerCase()
    if (message.includes('401') || message.includes('403')) {
      return { category: 'auth', retryable: false }
    }
    if (message.includes('429')) {
      return { category: 'rate_limit', retryable: true }
    }
    if (message.includes('500') || message.includes('503')) {
      return { category: 'server', retryable: true }
    }
    if (message.includes('network') || message.includes('econnrefused')) {
      return { category: 'network', retryable: true }
    }
    if (message.includes('400') || message.includes('404')) {
      return { category: 'client', retryable: false }
    }
    return { category: 'unknown', retryable: false }
  }),
}))

// Import after mocking
import { hivemindTool, type HivemindToolParams } from '../src/tools/hivemind'
import { getConfig, hasRequiredKeys, getSettings, validateModelId } from '../src/config'
import { trackUsage } from '../src/usage'
import { OpenAIProvider, GoogleProvider, AnthropicProvider } from '@quantulabs/hivemind-core'

describe('hivemindTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(hasRequiredKeys).mockReturnValue(true)
    vi.mocked(getConfig).mockReturnValue({
      apiKeys: {
        openai: 'sk-test',
        google: 'AIza-test',
      },
      settings: {
        useGrounding: true,
        claudeCodeMode: true,
      },
    })
    vi.mocked(getSettings).mockReturnValue({
      useGrounding: true,
      claudeCodeMode: true,
      models: {
        openai: 'gpt-5.2',
        google: 'gemini-3-pro-preview',
      },
    } as any)
    vi.mocked(validateModelId).mockReturnValue({ valid: true })
  })

  describe('basic functionality', () => {
    it('should throw if no API keys configured', async () => {
      vi.mocked(hasRequiredKeys).mockReturnValue(false)

      await expect(hivemindTool({ question: 'test' })).rejects.toThrow(
        'No API keys configured'
      )
    })

    it('should throw if no providers available', async () => {
      vi.mocked(getConfig).mockReturnValue({
        apiKeys: {},
        settings: { useGrounding: true, claudeCodeMode: true },
      })

      await expect(hivemindTool({ question: 'test' })).rejects.toThrow(
        'No providers available'
      )
    })

    it('should query OpenAI and Google when configured', async () => {
      const mockOpenAIChat = vi.fn().mockResolvedValue('OpenAI response')
      const mockGoogleChat = vi.fn().mockResolvedValue('Google response')

      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: mockOpenAIChat,
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: mockGoogleChat,
      }) as any)

      const result = await hivemindTool({ question: 'What is 2+2?' })

      expect(result.responses).toHaveLength(2)
      expect(result.responses.find((r) => r.provider === 'openai')?.content).toBe(
        'OpenAI response'
      )
      expect(result.responses.find((r) => r.provider === 'google')?.content).toBe(
        'Google response'
      )
    })

    it('should include Anthropic when claudeCodeMode is false', async () => {
      vi.mocked(getConfig).mockReturnValue({
        apiKeys: {
          openai: 'sk-test',
          anthropic: 'sk-ant-test',
          google: 'AIza-test',
        },
        settings: { useGrounding: true, claudeCodeMode: false },
      })
      vi.mocked(getSettings).mockReturnValue({
        useGrounding: true,
        claudeCodeMode: false,
        models: {
          openai: 'gpt-5.2',
          anthropic: 'claude-opus-4-5-20251101',
          google: 'gemini-3-pro-preview',
        },
      } as any)

      const mockOpenAIChat = vi.fn().mockResolvedValue('OpenAI')
      const mockAnthropicChat = vi.fn().mockResolvedValue('Anthropic')
      const mockGoogleChat = vi.fn().mockResolvedValue('Google')

      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: mockOpenAIChat,
      }) as any)
      vi.mocked(AnthropicProvider).mockImplementation(() => ({
        chat: mockAnthropicChat,
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: mockGoogleChat,
      }) as any)

      const result = await hivemindTool({ question: 'test' })

      expect(result.responses).toHaveLength(3)
      expect(result.responses.map((r) => r.provider)).toContain('anthropic')
    })

    it('should track usage for successful calls', async () => {
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('response'),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('response'),
      }) as any)

      await hivemindTool({ question: 'test' })

      expect(trackUsage).toHaveBeenCalledTimes(2)
    })
  })

  describe('context handling', () => {
    it('should include context in message', async () => {
      const mockOpenAIChat = vi.fn().mockResolvedValue('response')
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: mockOpenAIChat,
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('response'),
      }) as any)

      await hivemindTool({
        question: 'What does this do?',
        context: 'function add(a, b) { return a + b; }',
      })

      expect(mockOpenAIChat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('function add'),
          }),
        ]),
        'gpt-5.2'
      )
    })

    it('should include previous responses for follow-up', async () => {
      const mockOpenAIChat = vi.fn().mockResolvedValue('updated response')
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: mockOpenAIChat,
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('response'),
      }) as any)

      await hivemindTool({
        question: 'Reconsider your answer',
        previousResponses: [
          { provider: 'openai', content: 'Initial OpenAI response' },
          { provider: 'google', content: 'Initial Google response' },
        ],
      })

      expect(mockOpenAIChat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('Previous responses from models'),
          }),
        ]),
        'gpt-5.2'
      )
    })

    it('should filter invalid previous responses', async () => {
      const mockOpenAIChat = vi.fn().mockResolvedValue('response')
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: mockOpenAIChat,
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('response'),
      }) as any)

      await hivemindTool({
        question: 'test',
        previousResponses: [
          { provider: '', content: 'valid' }, // invalid - empty provider
          { provider: 'openai', content: '' }, // invalid - empty content
          { provider: 'google', content: 'valid' }, // valid
          null as any, // invalid - null
          { provider: 'openai' } as any, // invalid - missing content
        ],
      })

      const call = mockOpenAIChat.mock.calls[0][0][0]
      expect(call.content).toContain('google')
      expect(call.content).not.toContain('empty provider')
    })

    it('should skip previous responses section if all are invalid', async () => {
      const mockOpenAIChat = vi.fn().mockResolvedValue('response')
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: mockOpenAIChat,
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('response'),
      }) as any)

      await hivemindTool({
        question: 'test',
        previousResponses: [
          { provider: '', content: '' },
          { provider: '  ', content: '  ' },
        ],
      })

      const call = mockOpenAIChat.mock.calls[0][0][0]
      expect(call.content).not.toContain('Previous responses')
    })
  })

  describe('model validation', () => {
    it('should use default model on validation failure', async () => {
      vi.mocked(validateModelId).mockReturnValue({
        valid: false,
        error: 'Invalid model',
      })
      vi.mocked(getSettings).mockReturnValue({
        useGrounding: true,
        claudeCodeMode: true,
        models: {
          openai: 'invalid-model',
          google: 'gemini-3-pro-preview',
        },
      } as any)

      const mockOpenAIChat = vi.fn().mockResolvedValue('response')
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: mockOpenAIChat,
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('response'),
      }) as any)

      const result = await hivemindTool({ question: 'test' })

      // Should use default model
      expect(mockOpenAIChat).toHaveBeenCalledWith(expect.anything(), 'gpt-5.2')
    })
  })

  describe('error handling', () => {
    it('should include error in response when provider fails', async () => {
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('API error')),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('Google response'),
      }) as any)

      const result = await hivemindTool({ question: 'test' })

      expect(result.responses).toHaveLength(2)
      const openaiResponse = result.responses.find((r) => r.provider === 'openai')
      expect(openaiResponse?.content).toContain('[Error:')
    })

    it('should throw detailed error when all providers fail', async () => {
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('401 Unauthorized')),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('401 Unauthorized')),
      }) as any)

      await expect(hivemindTool({ question: 'test' })).rejects.toThrow(
        'All providers failed'
      )
    })

    it('should include suggestions for auth errors', async () => {
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('401 Unauthorized')),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('403 Forbidden')),
      }) as any)

      try {
        await hivemindTool({ question: 'test' })
      } catch (error) {
        expect((error as Error).message).toContain('Auth error')
        expect((error as Error).message).toContain('Verify API key')
      }
    })

    it('should include suggestions for rate limit errors', async () => {
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('429 Rate limit')),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('429 Too many requests')),
      }) as any)

      try {
        await hivemindTool({ question: 'test' })
      } catch (error) {
        expect((error as Error).message).toContain('Rate limit')
      }
    })

    it('should include suggestions for server errors', async () => {
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('500 Internal server error')),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('503 Service unavailable')),
      }) as any)

      try {
        await hivemindTool({ question: 'test' })
      } catch (error) {
        expect((error as Error).message).toContain('Server error')
      }
    })

    it('should include suggestions for network errors', async () => {
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('Network ECONNREFUSED')),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('Network timeout')),
      }) as any)

      try {
        await hivemindTool({ question: 'test' })
      } catch (error) {
        expect((error as Error).message).toContain('Network error')
      }
    })

    it('should include suggestions for client errors', async () => {
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('400 Bad request')),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('404 Not found')),
      }) as any)

      try {
        await hivemindTool({ question: 'test' })
      } catch (error) {
        expect((error as Error).message).toContain('Client error')
      }
    })

    it('should provide default suggestion for unknown errors', async () => {
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('Unknown error type')),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue(new Error('Some other error')),
      }) as any)

      try {
        await hivemindTool({ question: 'test' })
      } catch (error) {
        expect((error as Error).message).toContain('Check API keys')
      }
    })

    it('should handle non-Error rejection', async () => {
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockRejectedValue('string error'),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('response'),
      }) as any)

      const result = await hivemindTool({ question: 'test' })

      const openaiResponse = result.responses.find((r) => r.provider === 'openai')
      expect(openaiResponse?.content).toContain('[Error:')
    })
  })

  describe('retry logic', () => {
    it('should retry on rate limit errors', async () => {
      let callCount = 0
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount < 3) {
            return Promise.reject(new Error('429 Rate limit'))
          }
          return Promise.resolve('success after retry')
        }),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('Google response'),
      }) as any)

      const result = await hivemindTool({ question: 'test' })

      expect(callCount).toBe(3) // 2 failures + 1 success
      const openaiResponse = result.responses.find((r) => r.provider === 'openai')
      expect(openaiResponse?.content).toBe('success after retry')
    }, 15000)

    it('should not retry on auth errors', async () => {
      let callCount = 0
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockImplementation(() => {
          callCount++
          return Promise.reject(new Error('401 Unauthorized'))
        }),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('Google response'),
      }) as any)

      const result = await hivemindTool({ question: 'test' })

      expect(callCount).toBe(1) // No retries
      const openaiResponse = result.responses.find((r) => r.provider === 'openai')
      expect(openaiResponse?.content).toContain('[Error:')
    })

    it('should stop after max retries', async () => {
      let callCount = 0
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        chat: vi.fn().mockImplementation(() => {
          callCount++
          return Promise.reject(new Error('500 Server error'))
        }),
      }) as any)
      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('Google response'),
      }) as any)

      const result = await hivemindTool({ question: 'test' })

      expect(callCount).toBe(3) // MAX_RETRIES
      const openaiResponse = result.responses.find((r) => r.provider === 'openai')
      expect(openaiResponse?.content).toContain('[Error:')
    }, 15000)
  })

  describe('provider configuration', () => {
    it('should pass useGrounding to GoogleProvider', async () => {
      vi.mocked(getConfig).mockReturnValue({
        apiKeys: { google: 'AIza-test' },
        settings: { useGrounding: false, claudeCodeMode: true },
      })
      vi.mocked(getSettings).mockReturnValue({
        useGrounding: false,
        claudeCodeMode: true,
        models: { google: 'gemini-3-pro-preview' },
      } as any)

      vi.mocked(GoogleProvider).mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue('response'),
      }) as any)

      await hivemindTool({ question: 'test' })

      expect(GoogleProvider).toHaveBeenCalledWith({
        apiKey: 'AIza-test',
        useGrounding: false,
      })
    })
  })
})
