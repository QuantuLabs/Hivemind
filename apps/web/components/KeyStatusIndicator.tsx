'use client'

import { Check, X, Loader2 } from 'lucide-react'

interface KeyStatusIndicatorProps {
  status: 'configured' | 'not-configured' | 'validating' | 'invalid'
}

export function KeyStatusIndicator({ status }: KeyStatusIndicatorProps) {
  switch (status) {
    case 'configured':
      return (
        <span className="flex items-center gap-1.5 text-sm text-green-500">
          <Check className="h-4 w-4" />
          Configured
        </span>
      )
    case 'not-configured':
      return (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <X className="h-4 w-4" />
          Not configured
        </span>
      )
    case 'validating':
      return (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validating...
        </span>
      )
    case 'invalid':
      return (
        <span className="flex items-center gap-1.5 text-sm text-destructive">
          <X className="h-4 w-4" />
          Invalid
        </span>
      )
  }
}
