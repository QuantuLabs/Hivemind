'use client'

import type { Message as MessageType } from '@hivemind/core'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './MarkdownRenderer'

interface MessageProps {
  message: MessageType
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-4 px-4 py-6',
        isUser ? 'bg-transparent' : 'bg-muted/30'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : message.isConsensus ? (
          <span className="text-sm">🐝</span>
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? 'You' : message.isConsensus ? 'Hivemind Consensus' : 'Assistant'}
          </span>
          {message.model && !message.isConsensus && (
            <span className="text-xs text-muted-foreground">
              {message.model}
            </span>
          )}
        </div>

        <div className="text-sm">
          <MarkdownRenderer content={message.content} />
        </div>
      </div>
    </div>
  )
}
