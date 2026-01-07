'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '../ModelSelector'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string, useHivemind: boolean) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [useHivemind, setUseHivemind] = useState(true)
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
    <div className="p-4 pb-6">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        {/* Main input container */}
        <div className="relative bg-secondary/80 dark:bg-zinc-800/80 rounded-2xl border border-border/50 shadow-lg">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={useHivemind ? 'Ask the Hivemind...' : 'Message Hivemind...'}
            disabled={disabled}
            className="w-full bg-transparent text-foreground placeholder-muted-foreground resize-none px-4 pt-4 pb-14 min-h-[56px] max-h-[200px] focus:outline-none text-sm"
            rows={1}
          />

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 pb-3">
            {/* Left: Controls */}
            <div className="flex items-center gap-2">
              {!useHivemind && <ModelSelector />}

              {/* Hive toggle */}
              <button
                type="button"
                onClick={() => setUseHivemind(!useHivemind)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5',
                  useHivemind
                    ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span>🐝</span>
                Hive
              </button>
            </div>

            {/* Right: Send button */}
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || disabled}
              className={cn(
                'h-8 w-8 rounded-lg transition-all',
                input.trim() && !disabled
                  ? 'bg-foreground hover:bg-foreground/90 text-background'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Hivemind info */}
        {useHivemind && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            GPT-4o, Claude, and Gemini will deliberate to reach consensus
          </p>
        )}
      </form>
    </div>
  )
}
