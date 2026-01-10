'use client'

import { useState } from 'react'
import type { Message as MessageType } from '@quantulabs/hivemind-core'
import { User, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Button } from '@/components/ui/button'

interface MessageProps {
  message: MessageType
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('group px-4 py-5', !isUser && 'bg-muted/30')}>
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-purple-600'
              : message.isConsensus
                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                : 'bg-secondary'
          )}
        >
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : message.isConsensus ? (
            <span className="text-xs">🐝</span>
          ) : (
            <span className="text-xs">✨</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {isUser ? 'You' : message.isConsensus ? 'Hivemind' : 'Assistant'}
            </span>
            {message.model && !message.isConsensus && (
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                {message.model}
              </span>
            )}
            {message.isConsensus && (
              <span className="text-xs text-amber-500/80 px-1.5 py-0.5 rounded bg-amber-500/10">
                consensus
              </span>
            )}
            {/* Copy button - appears on hover */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy message'}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>

          <div className="text-sm text-foreground/90 leading-relaxed">
            <MarkdownRenderer content={message.content} />
          </div>
        </div>
      </div>
    </div>
  )
}
