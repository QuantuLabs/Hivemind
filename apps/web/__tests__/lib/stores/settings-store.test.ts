import { describe, it, expect, beforeEach } from 'bun:test'
import { useSettingsStore } from '../../../lib/stores/settings-store'

describe('Settings Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useSettingsStore.setState({
      mode: 'solo',
      selectedModel: 'gpt-4o',
      orchestratorModel: 'claude-3-5-sonnet-20241022',
      apiKeys: {},
      isStorageUnlocked: false,
    })
  })

  describe('initial state', () => {
    it('should have default mode as solo', () => {
      expect(useSettingsStore.getState().mode).toBe('solo')
    })

    it('should have default selected model as gpt-4o', () => {
      expect(useSettingsStore.getState().selectedModel).toBe('gpt-4o')
    })

    it('should have default orchestrator model as claude', () => {
      expect(useSettingsStore.getState().orchestratorModel).toBe('claude-3-5-sonnet-20241022')
    })

    it('should have empty api keys', () => {
      expect(useSettingsStore.getState().apiKeys).toEqual({})
    })

    it('should have storage locked by default', () => {
      expect(useSettingsStore.getState().isStorageUnlocked).toBe(false)
    })
  })

  describe('setMode', () => {
    it('should update mode to hivemind', () => {
      useSettingsStore.getState().setMode('hivemind')

      expect(useSettingsStore.getState().mode).toBe('hivemind')
    })

    it('should update mode to solo', () => {
      useSettingsStore.getState().setMode('hivemind')
      useSettingsStore.getState().setMode('solo')

      expect(useSettingsStore.getState().mode).toBe('solo')
    })
  })

  describe('setSelectedModel', () => {
    it('should update selected model', () => {
      useSettingsStore.getState().setSelectedModel('claude-3-5-sonnet-20241022')

      expect(useSettingsStore.getState().selectedModel).toBe('claude-3-5-sonnet-20241022')
    })

    it('should allow setting any model ID', () => {
      useSettingsStore.getState().setSelectedModel('gemini-2.0-flash-exp')

      expect(useSettingsStore.getState().selectedModel).toBe('gemini-2.0-flash-exp')
    })
  })

  describe('setApiKeys', () => {
    it('should update API keys', () => {
      const keys = {
        openai: 'sk-test',
        anthropic: 'sk-ant-test',
      }

      useSettingsStore.getState().setApiKeys(keys)

      expect(useSettingsStore.getState().apiKeys).toEqual(keys)
    })

    it('should replace existing keys', () => {
      useSettingsStore.getState().setApiKeys({ openai: 'key1' })
      useSettingsStore.getState().setApiKeys({ google: 'key2' })

      expect(useSettingsStore.getState().apiKeys).toEqual({ google: 'key2' })
    })
  })

  describe('setStorageUnlocked', () => {
    it('should update storage unlocked state', () => {
      useSettingsStore.getState().setStorageUnlocked(true)

      expect(useSettingsStore.getState().isStorageUnlocked).toBe(true)
    })

    it('should allow locking storage', () => {
      useSettingsStore.getState().setStorageUnlocked(true)
      useSettingsStore.getState().setStorageUnlocked(false)

      expect(useSettingsStore.getState().isStorageUnlocked).toBe(false)
    })
  })

  describe('setOrchestratorModel', () => {
    it('should update orchestrator model', () => {
      useSettingsStore.getState().setOrchestratorModel('gpt-4o')

      expect(useSettingsStore.getState().orchestratorModel).toBe('gpt-4o')
    })

    it('should allow setting any orchestrator model', () => {
      useSettingsStore.getState().setOrchestratorModel('gemini-2.0-flash-exp')

      expect(useSettingsStore.getState().orchestratorModel).toBe('gemini-2.0-flash-exp')
    })
  })

  describe('hasRequiredKeys', () => {
    describe('solo mode - checks key for selected model', () => {
      it('should return true for GPT model with OpenAI key', () => {
        useSettingsStore.getState().setSelectedModel('gpt-4o')
        useSettingsStore.getState().setApiKeys({ openai: 'key' })

        expect(useSettingsStore.getState().hasRequiredKeys()).toBe(true)
      })

      it('should return false for GPT model without OpenAI key', () => {
        useSettingsStore.getState().setSelectedModel('gpt-4o')
        useSettingsStore.getState().setApiKeys({ anthropic: 'key' })

        expect(useSettingsStore.getState().hasRequiredKeys()).toBe(false)
      })

      it('should return true for Claude model with Anthropic key', () => {
        useSettingsStore.getState().setSelectedModel('claude-3-5-sonnet-20241022')
        useSettingsStore.getState().setApiKeys({ anthropic: 'key' })

        expect(useSettingsStore.getState().hasRequiredKeys()).toBe(true)
      })

      it('should return false for Claude model without Anthropic key', () => {
        useSettingsStore.getState().setSelectedModel('claude-3-5-sonnet-20241022')
        useSettingsStore.getState().setApiKeys({ openai: 'key' })

        expect(useSettingsStore.getState().hasRequiredKeys()).toBe(false)
      })

      it('should return true for Gemini model with Google key', () => {
        useSettingsStore.getState().setSelectedModel('gemini-2.0-flash-exp')
        useSettingsStore.getState().setApiKeys({ google: 'key' })

        expect(useSettingsStore.getState().hasRequiredKeys()).toBe(true)
      })

      it('should return false for Gemini model without Google key', () => {
        useSettingsStore.getState().setSelectedModel('gemini-2.0-flash-exp')
        useSettingsStore.getState().setApiKeys({ openai: 'key' })

        expect(useSettingsStore.getState().hasRequiredKeys()).toBe(false)
      })

      it('should return false for unknown model', () => {
        useSettingsStore.getState().setSelectedModel('unknown-model' as any)
        useSettingsStore.getState().setApiKeys({ openai: 'key' })

        expect(useSettingsStore.getState().hasRequiredKeys()).toBe(false)
      })
    })
  })
})
