'use client'

import { useEffect } from 'react'
import { PenSquare, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConversationList } from './ConversationList'
import { useConversationStore } from '@/lib/stores/conversation-store'

export function Sidebar() {
  const { loadConversations, createConversation, conversations } = useConversationStore()

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const handleNewChat = () => {
    createConversation('solo')
  }

  return (
    <aside className="w-[260px] bg-muted/30 dark:bg-zinc-900/50 flex flex-col h-full border-r">
      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          className="w-full h-10 justify-between bg-secondary hover:bg-secondary/80 border-0"
        >
          <span className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            New chat
          </span>
          <PenSquare className="h-4 w-4 opacity-50" />
        </Button>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 px-2">
        {conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <div className="text-muted-foreground text-sm">
              No conversations yet
            </div>
            <div className="text-muted-foreground/60 text-xs mt-1">
              Start a new chat to begin
            </div>
          </div>
        ) : (
          <ConversationList />
        )}
      </ScrollArea>

      {/* Bottom section */}
      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground text-center">
          Powered by GPT-4o, Claude & Gemini
        </div>
      </div>
    </aside>
  )
}
