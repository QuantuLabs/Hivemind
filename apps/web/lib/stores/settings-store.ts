import { create } from 'zustand'
import type { ModelId, ApiKeys } from '@hivemind/core'

type OrchestratorModel = 'claude-3-5-sonnet-20241022' | 'gpt-4o' | 'gemini-2.0-flash-exp'

interface SettingsState {
  mode: 'solo' | 'hivemind'
  selectedModel: ModelId
  orchestratorModel: OrchestratorModel
  apiKeys: ApiKeys
  isStorageUnlocked: boolean

  // Actions
  setMode: (mode: 'solo' | 'hivemind') => void
  setSelectedModel: (model: ModelId) => void
  setOrchestratorModel: (model: OrchestratorModel) => void
  setApiKeys: (keys: ApiKeys) => void
  setStorageUnlocked: (unlocked: boolean) => void
  hasRequiredKeys: () => boolean
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  mode: 'solo',
  selectedModel: 'gpt-4o',
  orchestratorModel: 'claude-3-5-sonnet-20241022',
  apiKeys: {},
  isStorageUnlocked: false,

  setMode: (mode) => set({ mode }),

  setSelectedModel: (selectedModel) => set({ selectedModel }),

  setOrchestratorModel: (orchestratorModel) => set({ orchestratorModel }),

  setApiKeys: (apiKeys) => set({ apiKeys }),

  setStorageUnlocked: (isStorageUnlocked) => set({ isStorageUnlocked }),

  hasRequiredKeys: () => {
    const { apiKeys, selectedModel } = get()

    // For solo mode, need the key for the selected model
    if (selectedModel.startsWith('gpt')) {
      return !!apiKeys.openai
    }
    if (selectedModel.startsWith('claude')) {
      return !!apiKeys.anthropic
    }
    if (selectedModel.startsWith('gemini')) {
      return !!apiKeys.google
    }

    return false
  },
}))
