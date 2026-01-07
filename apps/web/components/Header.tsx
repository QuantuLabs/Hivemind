'use client'

import Link from 'next/link'
import { Settings, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { useConversationStore } from '@/lib/stores/conversation-store'

export function Header() {
  const conversation = useConversationStore((state) => state.getActiveConversation())

  return (
    <header className="h-12 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
            <span className="text-lg">🐝</span>
            <span className="font-semibold text-sm">Hivemind</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Center: Current conversation title */}
        <div className="absolute left-1/2 -translate-x-1/2">
          {conversation && (
            <span className="text-sm text-muted-foreground max-w-[300px] truncate">
              {conversation.title}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
