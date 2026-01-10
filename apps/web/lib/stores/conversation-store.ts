import { create } from 'zustand'
import type { Conversation, Message } from '@hivemind/core'
import { storage } from '../storage'

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

interface ConversationState {
  conversations: Conversation[]
  activeConversationId: string | null
  isLoading: boolean

  // Actions
  loadConversations: () => Promise<void>
  createConversation: (mode: 'solo' | 'hivemind') => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  setActiveConversation: (id: string | null) => void
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>
  updateMessage: (conversationId: string, messageId: string, content: string) => Promise<void>
  getActiveConversation: () => Conversation | undefined
  exportConversations: () => void
  exportActiveConversation: () => void
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,

  loadConversations: async () => {
    set({ isLoading: true })
    try {
      const conversations = await storage.getConversations()
      set({ conversations, isLoading: false })

      if (conversations.length > 0 && !get().activeConversationId) {
        set({ activeConversationId: conversations[0].id })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  createConversation: async (mode) => {
    const id = generateId()
    const conversation: Conversation = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode,
    }

    const conversations = [conversation, ...get().conversations]
    set({ conversations, activeConversationId: id })
    await storage.saveConversations(conversations)
    return id
  },

  deleteConversation: async (id) => {
    const conversations = get().conversations.filter((c) => c.id !== id)
    const activeConversationId =
      get().activeConversationId === id
        ? conversations[0]?.id || null
        : get().activeConversationId

    set({ conversations, activeConversationId })
    await storage.saveConversations(conversations)
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id })
  },

  addMessage: async (conversationId, message) => {
    const conversations = get().conversations.map((conv) => {
      if (conv.id !== conversationId) return conv

      const newMessage: Message = {
        ...message,
        id: generateId(),
        timestamp: Date.now(),
      }

      // Update title from first user message
      const title =
        conv.messages.length === 0 && message.role === 'user'
          ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
          : conv.title

      return {
        ...conv,
        title,
        messages: [...conv.messages, newMessage],
        updatedAt: Date.now(),
      }
    })

    set({ conversations })
    await storage.saveConversations(conversations)
  },

  updateMessage: async (conversationId, messageId, content) => {
    const conversations = get().conversations.map((conv) => {
      if (conv.id !== conversationId) return conv

      return {
        ...conv,
        messages: conv.messages.map((msg) =>
          msg.id === messageId ? { ...msg, content } : msg
        ),
        updatedAt: Date.now(),
      }
    })

    set({ conversations })
    await storage.saveConversations(conversations)
  },

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get()
    return conversations.find((c) => c.id === activeConversationId)
  },

  exportConversations: () => {
    const { conversations } = get()
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      conversations,
    }
    downloadJson(data, `hivemind-conversations-${formatDate()}.json`)
  },

  exportActiveConversation: () => {
    const conversation = get().getActiveConversation()
    if (!conversation) return

    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      conversation,
    }
    const slug = conversation.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    downloadJson(data, `hivemind-${slug}-${formatDate()}.json`)
  },
}))

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatDate(): string {
  return new Date().toISOString().split('T')[0]
}
