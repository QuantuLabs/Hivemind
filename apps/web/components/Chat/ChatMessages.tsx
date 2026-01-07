'use client'

import { useEffect, useRef } from 'react'
import type { Message as MessageType } from '@hivemind/core'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Message } from './Message'

interface ChatMessagesProps {
  messages: MessageType[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="text-5xl">🐝</span>
          <h2 className="text-xl font-semibold">Hivemind</h2>
          <p className="text-muted-foreground max-w-sm">
            Get AI consensus from multiple models. Start a conversation below.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
