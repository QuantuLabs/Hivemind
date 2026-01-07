import { create } from 'zustand'
import type { ModelId, ApiKeys, Provider } from '@hivemind/core'
import { DEFAULT_MODELS } from '@hivemind/core'

type ProviderModels = Record<Provider, ModelId>

interface SettingsState {
  mode: 'solo' | 'hivemind'
  selectedModel: ModelId // For solo mode
  providerModels: ProviderModels // For hivemind mode
  orchestratorModel: ModelId
  apiKeys: ApiKeys
  isStorageUnlocked: boolean

  // Actions
  setMode: (mode: 'solo' | 'hivemind') => void
  setSelectedModel: (model: ModelId) => void
  setProviderModel: (provider: Provider, model: ModelId) => void
  setOrchestratorModel: (model: ModelId) => void
  setApiKeys: (keys: ApiKeys) => void
  setStorageUnlocked: (unlocked: boolean) => void
  hasRequiredKeys: () => boolean
  getModelForProvider: (provider: Provider) => ModelId
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  mode: 'solo',
  selectedModel: 'gpt-4.1',
  providerModels: { ...DEFAULT_MODELS },
  orchestratorModel: 'claude-opus-4-5-20251124',
  apiKeys: {},
  isStorageUnlocked: false,

  setMode: (mode) => set({ mode }),

  setSelectedModel: (selectedModel) => set({ selectedModel }),

  setProviderModel: (provider, model) =>
    set((state) => ({
      providerModels: { ...state.providerModels, [provider]: model },
    })),

  setOrchestratorModel: (orchestratorModel) => set({ orchestratorModel }),

  setApiKeys: (apiKeys) => set({ apiKeys }),

  setStorageUnlocked: (isStorageUnlocked) => set({ isStorageUnlocked }),

  hasRequiredKeys: () => {
    const { apiKeys } = get()
    // Need at least one key configured
    return !!apiKeys.openai || !!apiKeys.anthropic || !!apiKeys.google
  },

  getModelForProvider: (provider) => {
    const { providerModels } = get()
    return providerModels[provider]
  },
}))
