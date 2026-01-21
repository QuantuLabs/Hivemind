import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Mock fs module
vi.mock('fs')

// Import after mocking
import {
  validateModelId,
  DEFAULT_MODELS,
  VALID_MODELS,
  getConfig,
  saveConfig,
  setApiKey,
  deleteApiKey,
  hasRequiredKeys,
  getAvailableProviders,
  isRunningInClaudeCode,
  updateSettings,
  getSettings,
  getKeySource,
  getAllKeySources,
  getEnvFilePath,
  initializeCache,
  getApiKeys,
  type Provider,
} from '../src/config'

const CONFIG_DIR = path.join(os.homedir(), '.config', 'hivemind')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const ENV_FILE = path.join(CONFIG_DIR, '.env')

describe('Config', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Clear environment variables
    delete process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.GOOGLE_API_KEY
    delete process.env.CLAUDE_CODE
    delete process.env.MCP_CLAUDE_CODE
    delete process.env.TERM_PROGRAM
    // Reset fs mocks to default behavior
    vi.mocked(fs.existsSync).mockReturnValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateModelId', () => {
    it('should return valid for correct OpenAI model', () => {
      const result = validateModelId('openai', 'gpt-5.2')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return valid for correct Anthropic model', () => {
      const result = validateModelId('anthropic', 'claude-opus-4-5-20251101')
      expect(result.valid).toBe(true)
    })

    it('should return valid for correct Google model', () => {
      const result = validateModelId('google', 'gemini-3-pro-preview')
      expect(result.valid).toBe(true)
    })

    it('should return invalid for undefined model', () => {
      const result = validateModelId('openai', undefined)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('No model specified for openai')
    })

    it('should return invalid for wrong provider model', () => {
      const result = validateModelId('openai', 'claude-opus-4-5-20251101')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid model')
      expect(result.error).toContain('openai')
    })

    it('should return invalid for non-existent model', () => {
      const result = validateModelId('google', 'invalid-model')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid model "invalid-model" for google')
    })
  })

  describe('DEFAULT_MODELS', () => {
    it('should have default models for all providers', () => {
      expect(DEFAULT_MODELS.openai).toBe('gpt-5.2')
      expect(DEFAULT_MODELS.anthropic).toBe('claude-opus-4-5-20251101')
      expect(DEFAULT_MODELS.google).toBe('gemini-3-pro-preview')
    })
  })

  describe('VALID_MODELS', () => {
    it('should have valid models for OpenAI', () => {
      expect(VALID_MODELS.openai).toContain('gpt-5.2')
      expect(VALID_MODELS.openai).toContain('gpt-5')
      expect(VALID_MODELS.openai.length).toBeGreaterThan(0)
    })

    it('should have valid models for Anthropic', () => {
      expect(VALID_MODELS.anthropic).toContain('claude-opus-4-5-20251101')
      expect(VALID_MODELS.anthropic.length).toBeGreaterThan(0)
    })

    it('should have valid models for Google', () => {
      expect(VALID_MODELS.google).toContain('gemini-3-pro-preview')
      expect(VALID_MODELS.google.length).toBeGreaterThan(0)
    })
  })

  describe('getConfig', () => {
    it('should return default settings when no config file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = getConfig()

      expect(config.settings.useGrounding).toBe(true)
      expect(config.settings.claudeCodeMode).toBe(true)
      expect(config.apiKeys).toEqual({})
    })

    it('should merge settings from config file', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === CONFIG_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ settings: { useGrounding: false } })
      )

      const config = getConfig()

      expect(config.settings.useGrounding).toBe(false)
      expect(config.settings.claudeCodeMode).toBe(true) // default
    })

    it('should handle invalid JSON in config file', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === CONFIG_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json')

      const config = getConfig()

      // Should return defaults
      expect(config.settings.useGrounding).toBe(true)
    })

    it('should get API keys from environment variables', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key'
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = getConfig()

      expect(config.apiKeys.openai).toBe('sk-test-key')
    })

    it('should get API keys from .env file', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue('GOOGLE_API_KEY=AIza-test')

      const config = getConfig()

      expect(config.apiKeys.google).toBe('AIza-test')
    })

    it('should prioritize env vars over .env file', () => {
      process.env.OPENAI_API_KEY = 'from-env'
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue('OPENAI_API_KEY=from-dotenv')

      const config = getConfig()

      expect(config.apiKeys.openai).toBe('from-env')
    })

    it('should handle .env file with quotes', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue('OPENAI_API_KEY="quoted-key"')

      const config = getConfig()

      expect(config.apiKeys.openai).toBe('quoted-key')
    })

    it('should handle .env file with single quotes', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue("OPENAI_API_KEY='single-quoted'")

      const config = getConfig()

      expect(config.apiKeys.openai).toBe('single-quoted')
    })

    it('should skip empty values in env vars', () => {
      process.env.OPENAI_API_KEY = ''
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = getConfig()

      expect(config.apiKeys.openai).toBeUndefined()
    })

    it('should skip whitespace-only values in env vars', () => {
      process.env.OPENAI_API_KEY = '   '
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = getConfig()

      expect(config.apiKeys.openai).toBeUndefined()
    })

    it('should handle .env file with comments and empty lines', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue(`
# This is a comment
OPENAI_API_KEY=test-key

# Another comment
GOOGLE_API_KEY=google-key
`)

      const config = getConfig()

      expect(config.apiKeys.openai).toBe('test-key')
      expect(config.apiKeys.google).toBe('google-key')
    })

    it('should handle .env file with lines without equals', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue(`
invalid-line
OPENAI_API_KEY=test-key
another-invalid
`)

      const config = getConfig()

      expect(config.apiKeys.openai).toBe('test-key')
    })

    it('should handle read errors for .env file', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error')
      })

      const config = getConfig()

      expect(config.apiKeys).toEqual({})
    })
  })

  describe('saveConfig', () => {
    it('should create config directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined)
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      saveConfig({
        apiKeys: {},
        settings: { useGrounding: true, claudeCodeMode: true },
      })

      expect(fs.mkdirSync).toHaveBeenCalledWith(CONFIG_DIR, {
        recursive: true,
        mode: 0o700,
      })
    })

    it('should write settings to config file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      saveConfig({
        apiKeys: { openai: 'test-key' },
        settings: { useGrounding: false, claudeCodeMode: false },
      })

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        expect.stringContaining('"useGrounding": false'),
        { mode: 0o600 }
      )
    })
  })

  describe('setApiKey', () => {
    it('should save API key to .env file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined)
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      await setApiKey('openai', 'sk-new-key')

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        ENV_FILE,
        expect.stringContaining('OPENAI_API_KEY=sk-new-key'),
        { mode: 0o600 }
      )
    })

    it('should preserve non-managed keys in .env file', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue(`OPENAI_API_KEY=old
MY_CUSTOM_KEY=custom-value
GOOGLE_API_KEY=google`)
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      await setApiKey('openai', 'new')

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]
      const written = writeCall[1] as string
      expect(written).toContain('MY_CUSTOM_KEY=custom-value')
      expect(written).toContain('OPENAI_API_KEY=new')
    })

    it('should handle lines without equals sign', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue(`OPENAI_API_KEY=old
some-line-without-equals
GOOGLE_API_KEY=google`)
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      await setApiKey('openai', 'new')

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]
      const written = writeCall[1] as string
      expect(written).toContain('some-line-without-equals')
    })

    it('should handle read error when saving', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error')
      })
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      // Should not throw, just proceed without existing content
      await setApiKey('openai', 'new-key')

      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should update existing key in .env file', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue('OPENAI_API_KEY=old-key')
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      await setApiKey('openai', 'new-key')

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        ENV_FILE,
        expect.stringContaining('OPENAI_API_KEY=new-key'),
        { mode: 0o600 }
      )
    })

    it('should preserve comments and other keys', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue(`# Comment
OPENAI_API_KEY=old
GOOGLE_API_KEY=google`)
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      await setApiKey('openai', 'new')

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]
      const written = writeCall[1] as string
      expect(written).toContain('# Comment')
      expect(written).toContain('GOOGLE_API_KEY=google')
      expect(written).toContain('OPENAI_API_KEY=new')
    })
  })

  describe('deleteApiKey', () => {
    it('should remove API key from .env file', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue(`OPENAI_API_KEY=test
GOOGLE_API_KEY=google`)
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      await deleteApiKey('openai')

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]
      const written = writeCall[1] as string
      expect(written).not.toContain('OPENAI_API_KEY')
      expect(written).toContain('GOOGLE_API_KEY=google')
    })
  })

  describe('hasRequiredKeys', () => {
    it('should return true if any API key is configured', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(hasRequiredKeys()).toBe(true)
    })

    it('should return false if no API keys configured', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(hasRequiredKeys()).toBe(false)
    })

    it('should return true for anthropic key only', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(hasRequiredKeys()).toBe(true)
    })

    it('should return true for google key only', () => {
      process.env.GOOGLE_API_KEY = 'AIza-test'
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(hasRequiredKeys()).toBe(true)
    })
  })

  describe('getAvailableProviders', () => {
    it('should return empty array if no keys configured', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const providers = getAvailableProviders()

      expect(providers).toEqual([])
    })

    it('should include openai if key configured', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const providers = getAvailableProviders()

      expect(providers).toContain('openai')
    })

    it('should skip anthropic in claudeCodeMode', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
      vi.mocked(fs.existsSync).mockImplementation((p) => p === CONFIG_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ settings: { claudeCodeMode: true } })
      )

      const providers = getAvailableProviders()

      expect(providers).not.toContain('anthropic')
    })

    it('should include anthropic when claudeCodeMode is false', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
      vi.mocked(fs.existsSync).mockImplementation((p) => p === CONFIG_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ settings: { claudeCodeMode: false } })
      )

      const providers = getAvailableProviders()

      expect(providers).toContain('anthropic')
    })
  })

  describe('isRunningInClaudeCode', () => {
    it('should return true when CLAUDE_CODE env is set', () => {
      process.env.CLAUDE_CODE = '1'

      expect(isRunningInClaudeCode()).toBe(true)
    })

    it('should return true when MCP_CLAUDE_CODE env is set', () => {
      process.env.MCP_CLAUDE_CODE = '1'

      expect(isRunningInClaudeCode()).toBe(true)
    })

    it('should return true when TERM_PROGRAM is claude', () => {
      process.env.TERM_PROGRAM = 'claude'

      expect(isRunningInClaudeCode()).toBe(true)
    })

    it('should return false when not in Claude Code', () => {
      expect(isRunningInClaudeCode()).toBe(false)
    })
  })

  describe('updateSettings', () => {
    it('should update and save settings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ settings: { useGrounding: true, claudeCodeMode: true } })
      )
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      const result = updateSettings({ useGrounding: false })

      expect(result.useGrounding).toBe(false)
      expect(result.claudeCodeMode).toBe(true)
    })
  })

  describe('getSettings', () => {
    it('should return current settings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const settings = getSettings()

      expect(settings.useGrounding).toBe(true)
      expect(settings.claudeCodeMode).toBe(true)
    })
  })

  describe('getKeySource', () => {
    it('should return env source for environment variable', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const source = getKeySource('openai')

      expect(source.source).toBe('env')
      expect(source.configured).toBe(true)
    })

    it('should return dotenv source for .env file', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === ENV_FILE)
      vi.mocked(fs.readFileSync).mockReturnValue('GOOGLE_API_KEY=test')

      const source = getKeySource('google')

      expect(source.source).toBe('dotenv')
      expect(source.configured).toBe(true)
    })

    it('should return none source if not configured', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const source = getKeySource('anthropic')

      expect(source.source).toBe('none')
      expect(source.configured).toBe(false)
    })
  })

  describe('getAllKeySources', () => {
    it('should return sources for all providers', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const sources = getAllKeySources()

      expect(sources).toHaveLength(3)
      expect(sources.map((s) => s.provider)).toEqual(['openai', 'anthropic', 'google'])
    })
  })

  describe('getEnvFilePath', () => {
    it('should return path to .env file', () => {
      const envPath = getEnvFilePath()

      expect(envPath).toBe(ENV_FILE)
    })
  })

  describe('initializeCache', () => {
    it('should initialize cache from API keys', async () => {
      process.env.OPENAI_API_KEY = 'test-key'
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initializeCache()

      const config = getConfig()
      expect(config.apiKeys.openai).toBe('test-key')
    })
  })

  describe('getApiKeys', () => {
    it('should return all configured API keys', () => {
      process.env.OPENAI_API_KEY = 'openai-key'
      process.env.GOOGLE_API_KEY = 'google-key'
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const keys = getApiKeys()

      expect(keys.openai).toBe('openai-key')
      expect(keys.google).toBe('google-key')
      expect(keys.anthropic).toBeUndefined()
    })
  })
})
