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

const providerColors: Record<string, string> = {
  openai: 'bg-emerald-500',
  anthropic: 'bg-orange-500',
  google: 'bg-blue-500',
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
      <div className="text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-secondary border border-border">
        No API keys
      </div>
    )
  }

  return (
    <Select
      value={selectedModel}
      onValueChange={(value) => setSelectedModel(value as ModelId)}
    >
      <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs bg-secondary border-border rounded-full px-3 gap-2">
        <SelectValue placeholder="Model" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {availableModels.map((model) => (
          <SelectItem
            key={model.id}
            value={model.id}
            className="text-xs focus:bg-accent"
          >
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${providerColors[model.provider]}`} />
              <span>{model.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
