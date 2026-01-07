import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useConversationStore } from '../../../lib/stores/conversation-store'
import { storage } from '../../../lib/storage'

// Mock storage
vi.mock('../../../lib/storage', () => ({
  storage: {
    getConversations: vi.fn(() => []),
    saveConversations: vi.fn(),
  },
}))

describe('Conversation Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useConversationStore.setState({
      conversations: [],
      activeConversationId: null,
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty conversations', () => {
      expect(useConversationStore.getState().conversations).toEqual([])
    })

    it('should have no active conversation', () => {
      expect(useConversationStore.getState().activeConversationId).toBeNull()
    })
  })

  describe('loadConversations', () => {
    it('should load conversations from storage', () => {
      const mockConversations = [
        {
          id: '1',
          title: 'Test',
          messages: [],
          createdAt: 1000,
          updatedAt: 1000,
          mode: 'solo' as const,
        },
      ]
      vi.mocked(storage.getConversations).mockReturnValueOnce(mockConversations)

      useConversationStore.getState().loadConversations()

      expect(useConversationStore.getState().conversations).toEqual(mockConversations)
    })

    it('should set first conversation as active if none selected', () => {
      const mockConversations = [
        { id: '1', title: 'Test 1', messages: [], createdAt: 1000, updatedAt: 1000, mode: 'solo' as const },
        { id: '2', title: 'Test 2', messages: [], createdAt: 2000, updatedAt: 2000, mode: 'solo' as const },
      ]
      vi.mocked(storage.getConversations).mockReturnValueOnce(mockConversations)

      useConversationStore.getState().loadConversations()

      expect(useConversationStore.getState().activeConversationId).toBe('1')
    })

    it('should not change active conversation if already set', () => {
      useConversationStore.setState({ activeConversationId: '2' })
      const mockConversations = [
        { id: '1', title: 'Test 1', messages: [], createdAt: 1000, updatedAt: 1000, mode: 'solo' as const },
        { id: '2', title: 'Test 2', messages: [], createdAt: 2000, updatedAt: 2000, mode: 'solo' as const },
      ]
      vi.mocked(storage.getConversations).mockReturnValueOnce(mockConversations)

      useConversationStore.getState().loadConversations()

      expect(useConversationStore.getState().activeConversationId).toBe('2')
    })
  })

  describe('createConversation', () => {
    it('should create a new conversation', () => {
      const id = useConversationStore.getState().createConversation('solo')

      expect(typeof id).toBe('string')
      expect(useConversationStore.getState().conversations).toHaveLength(1)
    })

    it('should set created conversation as active', () => {
      const id = useConversationStore.getState().createConversation('hivemind')

      expect(useConversationStore.getState().activeConversationId).toBe(id)
    })

    it('should create conversation with correct mode', () => {
      useConversationStore.getState().createConversation('hivemind')

      expect(useConversationStore.getState().conversations[0].mode).toBe('hivemind')
    })

    it('should save to storage', () => {
      useConversationStore.getState().createConversation('solo')

      expect(storage.saveConversations).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ mode: 'solo', title: 'New Chat' }),
        ])
      )
    })

    it('should prepend new conversation to list', () => {
      useConversationStore.getState().createConversation('solo')
      const firstId = useConversationStore.getState().conversations[0].id

      useConversationStore.getState().createConversation('hivemind')

      expect(useConversationStore.getState().conversations[0].id).not.toBe(firstId)
      expect(useConversationStore.getState().conversations[1].id).toBe(firstId)
    })
  })

  describe('deleteConversation', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          { id: '1', title: 'Test 1', messages: [], createdAt: 1000, updatedAt: 1000, mode: 'solo' },
          { id: '2', title: 'Test 2', messages: [], createdAt: 2000, updatedAt: 2000, mode: 'solo' },
        ],
        activeConversationId: '1',
      })
    })

    it('should remove conversation from list', () => {
      useConversationStore.getState().deleteConversation('1')

      expect(useConversationStore.getState().conversations).toHaveLength(1)
      expect(useConversationStore.getState().conversations[0].id).toBe('2')
    })

    it('should update active conversation if deleted', () => {
      useConversationStore.getState().deleteConversation('1')

      expect(useConversationStore.getState().activeConversationId).toBe('2')
    })

    it('should keep active conversation if different one deleted', () => {
      useConversationStore.getState().deleteConversation('2')

      expect(useConversationStore.getState().activeConversationId).toBe('1')
    })

    it('should set active to null if all deleted', () => {
      useConversationStore.getState().deleteConversation('1')
      useConversationStore.getState().deleteConversation('2')

      expect(useConversationStore.getState().activeConversationId).toBeNull()
    })

    it('should save to storage', () => {
      useConversationStore.getState().deleteConversation('1')

      expect(storage.saveConversations).toHaveBeenCalled()
    })
  })

  describe('setActiveConversation', () => {
    it('should update active conversation id', () => {
      useConversationStore.getState().setActiveConversation('test-id')

      expect(useConversationStore.getState().activeConversationId).toBe('test-id')
    })

    it('should allow setting to null', () => {
      useConversationStore.setState({ activeConversationId: 'some-id' })

      useConversationStore.getState().setActiveConversation(null)

      expect(useConversationStore.getState().activeConversationId).toBeNull()
    })
  })

  describe('addMessage', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          { id: '1', title: 'New Chat', messages: [], createdAt: 1000, updatedAt: 1000, mode: 'solo' },
        ],
        activeConversationId: '1',
      })
    })

    it('should add message to conversation', () => {
      useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'Hello',
      })

      const conv = useConversationStore.getState().conversations[0]
      expect(conv.messages).toHaveLength(1)
      expect(conv.messages[0].role).toBe('user')
      expect(conv.messages[0].content).toBe('Hello')
    })

    it('should generate message id and timestamp', () => {
      useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'Test',
      })

      const msg = useConversationStore.getState().conversations[0].messages[0]
      expect(typeof msg.id).toBe('string')
      expect(typeof msg.timestamp).toBe('number')
    })

    it('should update title from first user message', () => {
      useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'This is my question about something',
      })

      expect(useConversationStore.getState().conversations[0].title).toBe(
        'This is my question about something'
      )
    })

    it('should truncate long titles', () => {
      const longContent = 'A'.repeat(100)
      useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: longContent,
      })

      const title = useConversationStore.getState().conversations[0].title
      expect(title.length).toBeLessThanOrEqual(53) // 50 + '...'
      expect(title).toContain('...')
    })

    it('should not update title from assistant message', () => {
      useConversationStore.getState().addMessage('1', {
        role: 'assistant',
        content: 'Hello there!',
      })

      expect(useConversationStore.getState().conversations[0].title).toBe('New Chat')
    })

    it('should not update title after first message', () => {
      useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'First question',
      })
      useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'Second question',
      })

      expect(useConversationStore.getState().conversations[0].title).toBe('First question')
    })

    it('should save to storage', () => {
      useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'Test',
      })

      expect(storage.saveConversations).toHaveBeenCalled()
    })

    it('should update conversation updatedAt', () => {
      const beforeUpdate = useConversationStore.getState().conversations[0].updatedAt

      // Wait a bit to ensure different timestamp
      useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'Test',
      })

      const afterUpdate = useConversationStore.getState().conversations[0].updatedAt
      expect(afterUpdate).toBeGreaterThanOrEqual(beforeUpdate)
    })
  })

  describe('updateMessage', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          {
            id: '1',
            title: 'Test',
            messages: [
              { id: 'msg1', role: 'user', content: 'Original', timestamp: 1000 },
              { id: 'msg2', role: 'assistant', content: 'Response', timestamp: 1001 },
            ],
            createdAt: 1000,
            updatedAt: 1000,
            mode: 'solo',
          },
        ],
        activeConversationId: '1',
      })
    })

    it('should update message content', () => {
      useConversationStore.getState().updateMessage('1', 'msg1', 'Updated content')

      const msg = useConversationStore.getState().conversations[0].messages[0]
      expect(msg.content).toBe('Updated content')
    })

    it('should not affect other messages', () => {
      useConversationStore.getState().updateMessage('1', 'msg1', 'Updated')

      const msg2 = useConversationStore.getState().conversations[0].messages[1]
      expect(msg2.content).toBe('Response')
    })

    it('should save to storage', () => {
      useConversationStore.getState().updateMessage('1', 'msg1', 'Updated')

      expect(storage.saveConversations).toHaveBeenCalled()
    })

    it('should update conversation updatedAt', () => {
      const beforeUpdate = useConversationStore.getState().conversations[0].updatedAt

      useConversationStore.getState().updateMessage('1', 'msg1', 'Updated')

      const afterUpdate = useConversationStore.getState().conversations[0].updatedAt
      expect(afterUpdate).toBeGreaterThanOrEqual(beforeUpdate)
    })
  })

  describe('getActiveConversation', () => {
    it('should return undefined when no active conversation', () => {
      const result = useConversationStore.getState().getActiveConversation()

      expect(result).toBeUndefined()
    })

    it('should return active conversation', () => {
      useConversationStore.setState({
        conversations: [
          { id: '1', title: 'Test 1', messages: [], createdAt: 1000, updatedAt: 1000, mode: 'solo' },
          { id: '2', title: 'Test 2', messages: [], createdAt: 2000, updatedAt: 2000, mode: 'hivemind' },
        ],
        activeConversationId: '2',
      })

      const result = useConversationStore.getState().getActiveConversation()

      expect(result?.id).toBe('2')
      expect(result?.title).toBe('Test 2')
      expect(result?.mode).toBe('hivemind')
    })
  })
})
