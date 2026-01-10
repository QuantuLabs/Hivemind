'use client'

import { useState, useEffect } from 'react'
import type { Provider, ApiKeys } from '@quantulabs/hivemind-core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KeyStatusIndicator } from './KeyStatusIndicator'
import { ApiKeyForm } from './ApiKeyForm'
import { PasswordDialog } from './PasswordDialog'
import { storage, type StorageState } from '@/lib/storage'
import { Key, Lock, Trash2 } from 'lucide-react'

const PROVIDERS: { id: Provider; name: string; icon: string }[] = [
  { id: 'openai', name: 'OpenAI', icon: '🟢' },
  { id: 'anthropic', name: 'Anthropic', icon: '🟠' },
  { id: 'google', name: 'Google AI', icon: '🔵' },
]

export function ApiKeySettings() {
  const [storageState, setStorageState] = useState<StorageState>({
    isLocked: true,
    hasPassword: false,
    hasKeys: false,
  })
  const [apiKeys, setApiKeys] = useState<ApiKeys>({})
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)

  useEffect(() => {
    loadState()
  }, [])

  const loadState = async () => {
    const state = await storage.getState()
    setStorageState(state)

    if (!state.isLocked && state.hasKeys) {
      const keys = await storage.getApiKeys()
      if (keys) setApiKeys(keys)
    }
  }

  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    setPasswordError('')

    if (storageState.hasPassword) {
      const success = await storage.unlock(password)
      if (!success) {
        setPasswordError('Incorrect password')
        return false
      }
    } else {
      await storage.setPassword(password)
    }

    await loadState()
    return true
  }

  const handleSaveKey = async (provider: Provider, key: string) => {
    const newKeys = { ...apiKeys, [provider]: key }
    setApiKeys(newKeys)
    await storage.saveApiKeys(newKeys)
  }

  const handleRemoveKey = async (provider: Provider) => {
    const newKeys = { ...apiKeys }
    delete newKeys[provider]
    setApiKeys(newKeys)
    await storage.saveApiKeys(newKeys)
  }

  const handleLock = () => {
    storage.lock()
    setApiKeys({})
    loadState()
  }

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to delete all API keys and reset your password?')) {
      storage.clearAll()
      setApiKeys({})
      await loadState()
    }
  }

  const getKeyStatus = (provider: Provider) => {
    return apiKeys[provider] ? 'configured' : 'not-configured'
  }

  // Show password dialog if locked or no password set
  if (storageState.isLocked || !storageState.hasPassword) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              {storageState.hasPassword
                ? 'Your API keys are encrypted. Enter your password to access them.'
                : 'Set up a password to securely store your API keys.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowPasswordDialog(true)}>
              {storageState.hasPassword ? 'Unlock' : 'Set Up Password'}
            </Button>
          </CardContent>
        </Card>

        <PasswordDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          mode={storageState.hasPassword ? 'unlock' : 'create'}
          onSubmit={handlePasswordSubmit}
          error={passwordError}
        />
      </>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage your AI provider API keys. Keys are encrypted locally.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleLock}>
              <Lock className="h-4 w-4 mr-2" />
              Lock
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{provider.icon}</span>
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <KeyStatusIndicator status={getKeyStatus(provider.id)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {apiKeys[provider.id] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveKey(provider.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProvider(provider.id)}
                >
                  {apiKeys[provider.id] ? 'Change' : 'Add'}
                </Button>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {editingProvider && (
        <ApiKeyForm
          provider={editingProvider}
          currentKey={apiKeys[editingProvider]}
          open={!!editingProvider}
          onOpenChange={(open) => !open && setEditingProvider(null)}
          onSave={(key) => handleSaveKey(editingProvider, key)}
        />
      )}
    </>
  )
}
