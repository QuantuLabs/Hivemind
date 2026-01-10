'use client'

import { useState } from 'react'
import type { Provider } from '@quantulabs/hivemind-core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { validateApiKey, getProviderInfo } from '@/lib/api-validation'
import { ExternalLink, Eye, EyeOff } from 'lucide-react'

interface ApiKeyFormProps {
  provider: Provider
  currentKey?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (key: string) => void
}

export function ApiKeyForm({
  provider,
  currentKey,
  open,
  onOpenChange,
  onSave,
}: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState(currentKey || '')
  const [showKey, setShowKey] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')

  const info = getProviderInfo(provider)

  const handleSave = async () => {
    setError('')
    setValidating(true)

    const result = await validateApiKey(provider, apiKey)
    setValidating(false)

    if (!result.valid) {
      setError(result.error || 'Invalid API key')
      return
    }

    onSave(apiKey)
    onOpenChange(false)
    setApiKey('')
  }

  const handleClose = () => {
    onOpenChange(false)
    setApiKey('')
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure {info.name} API Key</DialogTitle>
          <DialogDescription>
            Enter your {info.name} API key to enable this provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={info.placeholder}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <a
            href={info.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Get your API key
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={validating || !apiKey}>
            {validating ? 'Validating...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
