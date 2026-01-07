'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'unlock'
  onSubmit: (password: string) => Promise<boolean>
  error?: string
}

export function PasswordDialog({
  open,
  onOpenChange,
  mode,
  onSubmit,
  error,
}: PasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (mode === 'create' && password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (password.length < 4) {
      setLocalError('Password must be at least 4 characters')
      return
    }

    setLoading(true)
    const success = await onSubmit(password)
    setLoading(false)

    if (success) {
      setPassword('')
      setConfirmPassword('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Password' : 'Unlock Storage'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a password to encrypt your API keys. You will need this password to access your keys.'
              : 'Enter your password to decrypt your API keys.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
            />
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>
          )}

          {(localError || error) && (
            <p className="text-sm text-destructive">{localError || error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Loading...' : mode === 'create' ? 'Create' : 'Unlock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
