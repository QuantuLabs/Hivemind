import { encrypt, decrypt, hashPassword, verifyPasswordHash } from './crypto'
import type { ApiKeys, Conversation } from '@hivemind/core'

const KEYS_STORAGE_KEY = 'hivemind_api_keys'
const PASSWORD_HASH_KEY = 'hivemind_password_hash'
const CONVERSATIONS_KEY = 'hivemind_conversations'

const SESSION_DURATION = 30 * 60 * 1000 // 30 minutes

export interface StorageState {
  isLocked: boolean
  hasPassword: boolean
  hasKeys: boolean
}

class SecureStorage {
  private password: string | null = null
  private sessionExpiry: number = 0
  private expiryTimer: ReturnType<typeof setTimeout> | null = null

  private checkSession(): void {
    if (this.password && Date.now() >= this.sessionExpiry) {
      this.lock()
    }
  }

  private startExpiryTimer(): void {
    this.stopExpiryTimer()

    const checkExpiry = () => {
      if (Date.now() >= this.sessionExpiry) {
        this.lock()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hivemind:session-expired'))
        }
      } else {
        this.expiryTimer = setTimeout(checkExpiry, 60000) // Check every minute
      }
    }

    this.expiryTimer = setTimeout(checkExpiry, 60000)
  }

  private stopExpiryTimer(): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer)
      this.expiryTimer = null
    }
  }

  /**
   * Extend session on user activity
   */
  extendSession(): void {
    if (this.password) {
      this.sessionExpiry = Date.now() + SESSION_DURATION
    }
  }

  async getState(): Promise<StorageState> {
    this.checkSession()
    const hasPassword = !!localStorage.getItem(PASSWORD_HASH_KEY)
    const hasKeys = !!localStorage.getItem(KEYS_STORAGE_KEY)
    return {
      isLocked: hasPassword && !this.password,
      hasPassword,
      hasKeys,
    }
  }

  async setPassword(password: string): Promise<void> {
    const hash = await hashPassword(password)
    localStorage.setItem(PASSWORD_HASH_KEY, hash)
    this.password = password
    this.sessionExpiry = Date.now() + SESSION_DURATION
    this.startExpiryTimer()
  }

  async unlock(password: string): Promise<boolean> {
    const storedHash = localStorage.getItem(PASSWORD_HASH_KEY)
    if (!storedHash) return false

    const isValid = await verifyPasswordHash(password, storedHash)
    if (isValid) {
      this.password = password
      this.sessionExpiry = Date.now() + SESSION_DURATION
      this.startExpiryTimer()

      // Migrate legacy password hash to new format
      if (!storedHash.startsWith('pbkdf2-')) {
        const newHash = await hashPassword(password)
        localStorage.setItem(PASSWORD_HASH_KEY, newHash)
      }
    }
    return isValid
  }

  lock(): void {
    this.password = null
    this.sessionExpiry = 0
    this.stopExpiryTimer()
  }

  isUnlocked(): boolean {
    this.checkSession()
    return this.password !== null
  }

  async saveApiKeys(keys: ApiKeys): Promise<void> {
    this.checkSession()
    if (!this.password) {
      throw new Error('Storage is locked')
    }

    const encrypted = await encrypt(JSON.stringify(keys), this.password)
    localStorage.setItem(KEYS_STORAGE_KEY, encrypted)
    this.extendSession()
  }

  async getApiKeys(): Promise<ApiKeys | null> {
    this.checkSession()
    if (!this.password) {
      throw new Error('Storage is locked')
    }

    const encrypted = localStorage.getItem(KEYS_STORAGE_KEY)
    if (!encrypted) return null

    try {
      const decrypted = await decrypt(encrypted, this.password)
      this.extendSession()
      return JSON.parse(decrypted)
    } catch {
      return null
    }
  }

  async clearApiKeys(): Promise<void> {
    localStorage.removeItem(KEYS_STORAGE_KEY)
  }

  /**
   * Save conversations (encrypted with user password)
   */
  async saveConversations(conversations: Conversation[]): Promise<void> {
    this.checkSession()
    if (!this.password) {
      // If not unlocked, save unencrypted (legacy behavior for initial setup)
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
      return
    }

    try {
      const encrypted = await encrypt(JSON.stringify(conversations), this.password)
      localStorage.setItem(CONVERSATIONS_KEY, encrypted)
      this.extendSession()
    } catch {
      // Fallback to unencrypted if encryption fails
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
    }
  }

  /**
   * Get conversations (decrypted if encrypted)
   */
  async getConversations(): Promise<Conversation[]> {
    const stored = localStorage.getItem(CONVERSATIONS_KEY)
    if (!stored) return []

    // Try to parse as JSON first (unencrypted/legacy)
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // Not JSON, might be encrypted
    }

    // Try to decrypt if we have password
    this.checkSession()
    if (this.password) {
      try {
        const decrypted = await decrypt(stored, this.password)
        this.extendSession()
        return JSON.parse(decrypted)
      } catch {
        // Decryption failed, return empty
        return []
      }
    }

    return []
  }

  clearAll(): void {
    localStorage.removeItem(KEYS_STORAGE_KEY)
    localStorage.removeItem(PASSWORD_HASH_KEY)
    localStorage.removeItem(CONVERSATIONS_KEY)
    this.password = null
    this.sessionExpiry = 0
    this.stopExpiryTimer()
  }
}

export const storage = new SecureStorage()
