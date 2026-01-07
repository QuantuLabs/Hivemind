import { create } from 'zustand'
import type { ModelId, ApiKeys } from '@hivemind/core'

interface SettingsState {
  mode: 'solo' | 'hivemind'
  selectedModel: ModelId
  apiKeys: ApiKeys
  isStorageUnlocked: boolean

  // Actions
  setMode: (mode: 'solo' | 'hivemind') => void
  setSelectedModel: (model: ModelId) => void
  setApiKeys: (keys: ApiKeys) => void
  setStorageUnlocked: (unlocked: boolean) => void
  hasRequiredKeys: () => boolean
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  mode: 'solo',
  selectedModel: 'gpt-4o',
  apiKeys: {},
  isStorageUnlocked: false,

  setMode: (mode) => set({ mode }),

  setSelectedModel: (selectedModel) => set({ selectedModel }),

  setApiKeys: (apiKeys) => set({ apiKeys }),

  setStorageUnlocked: (isStorageUnlocked) => set({ isStorageUnlocked }),

  hasRequiredKeys: () => {
    const { mode, apiKeys, selectedModel } = get()

    if (mode === 'hivemind') {
      // Need all three keys for hivemind
      return !!(apiKeys.openai && apiKeys.anthropic && apiKeys.google)
    }

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
