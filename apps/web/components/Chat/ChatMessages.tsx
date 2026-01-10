'use client'

import { useEffect, useRef } from 'react'
import type { Message as MessageType } from '@quantulabs/hivemind-core'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Message } from './Message'
import { Sparkles, Zap, Brain } from 'lucide-react'

interface ChatMessagesProps {
  messages: MessageType[]
}

const suggestions = [
  { icon: Sparkles, text: "Explain quantum computing", color: "text-purple-400" },
  { icon: Zap, text: "Compare React vs Vue", color: "text-yellow-400" },
  { icon: Brain, text: "Analyze this code pattern", color: "text-blue-400" },
]

export function ChatMessages({ messages }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-lg">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative">
              <span className="text-6xl">🐝</span>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              How can I help you today?
            </h1>
            <p className="text-muted-foreground text-sm">
              Ask anything. Get consensus from multiple AI models.
            </p>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border transition-all text-sm text-muted-foreground hover:text-foreground"
              >
                <suggestion.icon className={`h-4 w-4 ${suggestion.color}`} />
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto py-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>
    </ScrollArea>
  )
}
