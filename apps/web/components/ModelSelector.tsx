'use client'

import { MODELS, type ModelId } from '@hivemind/core'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettingsStore } from '@/lib/stores/settings-store'

const providerIcons: Record<string, string> = {
  openai: '🟢',
  anthropic: '🟠',
  google: '🔵',
}

export function ModelSelector() {
  const { selectedModel, setSelectedModel, apiKeys } = useSettingsStore()

  const availableModels = MODELS.filter((model) => {
    switch (model.provider) {
      case 'openai':
        return !!apiKeys.openai
      case 'anthropic':
        return !!apiKeys.anthropic
      case 'google':
        return !!apiKeys.google
      default:
        return false
    }
  })

  if (availableModels.length === 0) {
    return (
      <div className="text-sm text-muted-foreground px-3 py-2 border rounded-md">
        No API keys configured
      </div>
    )
  }

  return (
    <Select
      value={selectedModel}
      onValueChange={(value) => setSelectedModel(value as ModelId)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {availableModels.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <span className="flex items-center gap-2">
              <span>{providerIcons[model.provider]}</span>
              <span>{model.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
