import { create } from 'zustand'
import type { ModelId, ApiKeys, Provider } from '@quantulabs/hivemind-core'
import { DEFAULT_MODELS } from '@quantulabs/hivemind-core'

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
  selectedModel: 'gpt-5.2',
  providerModels: { ...DEFAULT_MODELS },
  orchestratorModel: 'claude-opus-4-5-20251101',
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
    const { apiKeys, selectedModel } = get()
    // Check if the key for the selected model's provider is available
    const model = selectedModel.toLowerCase()
    if (model.includes('gpt') || model.includes('o1') || model.includes('o3') || model.includes('openai')) {
      return !!apiKeys.openai
    }
    if (model.includes('claude') || model.includes('anthropic')) {
      return !!apiKeys.anthropic
    }
    if (model.includes('gemini') || model.includes('google')) {
      return !!apiKeys.google
    }
    return false
  },

  getModelForProvider: (provider) => {
    const { providerModels } = get()
    return providerModels[provider]
  },
}))
