'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ModelSelector } from '../ModelSelector'
import { useSettingsStore } from '@/lib/stores/settings-store'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { mode } = useSettingsStore()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return

    onSend(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3">
          {mode === 'solo' && <ModelSelector />}

          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'hivemind'
                  ? 'Ask the Hivemind...'
                  : 'Type your message...'
              }
              disabled={disabled}
              className="min-h-[44px] max-h-[200px] pr-12 resize-none"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || disabled}
              className="absolute right-2 bottom-2"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {mode === 'hivemind' && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            🐝 Hivemind mode: GPT-4o, Claude, and Gemini will deliberate to reach consensus
          </p>
        )}
      </form>
    </div>
  )
}
