'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiKeySettings } from '@/components/ApiKeySettings'
import { useSettingsStore } from '@/lib/stores/settings-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const orchestratorModels = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'Google' },
] as const

export default function SettingsPage() {
  const { orchestratorModel, setOrchestratorModel } = useSettingsStore()

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
                  onValueChange={(value) => setOrchestratorModel(value as typeof orchestratorModel)}
                >
                  <SelectTrigger id="orchestrator" className="w-full">
                    <SelectValue placeholder="Select orchestrator model" />
                  </SelectTrigger>
                  <SelectContent>
                    {orchestratorModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <span>{model.name}</span>
                          <span className="text-xs text-muted-foreground">({model.provider})</span>
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
