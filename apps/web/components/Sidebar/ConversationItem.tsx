'use client'

import type { Conversation } from '@hivemind/core'
import { MessageSquare, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors group',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{conversation.title}</span>
      {conversation.mode === 'hivemind' && (
        <span className="text-xs">🐝</span>
      )}
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </button>
  )
}
