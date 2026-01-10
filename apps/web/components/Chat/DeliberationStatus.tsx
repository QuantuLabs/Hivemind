'use client'

import type { DeliberationStatus as DeliberationStatusType } from '@hivemind/core'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DeliberationStatusProps {
  status: DeliberationStatusType
}

const providerLabels = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
}

export function DeliberationStatus({ status }: DeliberationStatusProps) {
  const getIcon = (modelStatus: 'pending' | 'loading' | 'done' | 'error') => {
    switch (modelStatus) {
      case 'pending':
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'done':
        return <Check className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
    }
  }

  const getPhaseLabel = () => {
    switch (status.phase) {
      case 'initial':
        return 'Querying models...'
      case 'analysis':
        return 'Analyzing responses...'
      case 'deliberation':
        return `Round ${status.round}/${status.maxRounds} - Resolving divergences...`
      case 'synthesis':
        return 'Synthesizing consensus...'
      case 'error':
        return 'Error occurred'
      default:
        return status.message
    }
  }

  return (
    <div className="px-4 py-3 border-t bg-muted/30">
      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">🐝</span>
            <div>
              <p className="font-medium text-sm">Hivemind Deliberation</p>
              <p className="text-xs text-muted-foreground">{getPhaseLabel()}</p>
            </div>
          </div>

          {status.modelStatuses && (
            <div className="space-y-2 mb-4">
              {(Object.entries(status.modelStatuses) as [keyof typeof providerLabels, 'pending' | 'loading' | 'done' | 'error'][]).map(
                ([provider, modelStatus]) => (
                  <div
                    key={provider}
                    className="flex items-center gap-2 text-sm"
                  >
                    {getIcon(modelStatus)}
                    <span
                      className={cn(
                        modelStatus === 'done'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {providerLabels[provider]}
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          {status.progress !== undefined && (
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
