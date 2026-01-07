'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiKeySettings } from '@/components/ApiKeySettings'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { MODELS, type Provider, type ModelId } from '@hivemind/core'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const providerNames: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
}

const providerColors: Record<Provider, string> = {
  openai: 'bg-emerald-500',
  anthropic: 'bg-orange-500',
  google: 'bg-blue-500',
}

const providers: Provider[] = ['openai', 'anthropic', 'google']

export default function SettingsPage() {
  const { orchestratorModel, setOrchestratorModel, providerModels, setProviderModel } = useSettingsStore()

  const getModelsForProvider = (provider: Provider) => {
    return MODELS.filter((m) => m.provider === provider)
  }

  // All models for orchestrator selection
  const allModels = MODELS

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <h1 className="text-2xl font-semibold mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Model Selection per Provider */}
          <Card>
            <CardHeader>
              <CardTitle>Model Selection</CardTitle>
              <CardDescription>
                Choose which model to use for each provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {providers.map((provider) => (
                <div key={provider} className="space-y-2">
                  <Label htmlFor={`model-${provider}`} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${providerColors[provider]}`} />
                    {providerNames[provider]}
                  </Label>
                  <Select
                    value={providerModels[provider]}
                    onValueChange={(value) => setProviderModel(provider, value as ModelId)}
                  >
                    <SelectTrigger id={`model-${provider}`} className="w-full">
                      <SelectValue placeholder={`Select ${providerNames[provider]} model`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsForProvider(provider).map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            {model.isDefault && (
                              <span className="text-xs text-muted-foreground">(latest)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Hivemind Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🐝</span>
                Hivemind Settings
              </CardTitle>
              <CardDescription>
                Configure how Hivemind mode works
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="orchestrator">Orchestrator Model</Label>
                <Select
                  value={orchestratorModel}
                  onValueChange={(value) => setOrchestratorModel(value as ModelId)}
                >
                  <SelectTrigger id="orchestrator" className="w-full">
                    <SelectValue placeholder="Select orchestrator model" />
                  </SelectTrigger>
                  <SelectContent>
                    {allModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${providerColors[model.provider]}`} />
                          <span>{model.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  The orchestrator analyzes responses and synthesizes the final consensus
                </p>
              </div>
            </CardContent>
          </Card>

          <ApiKeySettings />
        </div>
      </div>
    </main>
  )
}
