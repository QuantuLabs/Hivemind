'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ModelSelector } from '../ModelSelector'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string, useHivemind: boolean) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [useHivemind, setUseHivemind] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return

    onSend(input.trim(), useHivemind)
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
          <div className="flex items-center gap-2">
            {!useHivemind && <ModelSelector />}

            <div className="flex items-center rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setUseHivemind(false)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  !useHivemind
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Solo
              </button>
              <button
                type="button"
                onClick={() => setUseHivemind(true)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1',
                  useHivemind
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>🐝</span>
                Hive
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                useHivemind
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

        {useHivemind && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            🐝 Hivemind: GPT-4o, Claude, and Gemini will deliberate to reach consensus
          </p>
        )}
      </form>
    </div>
  )
}
