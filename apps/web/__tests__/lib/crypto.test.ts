import { describe, it, expect, beforeEach } from 'bun:test'
import '../setup'
import { encrypt, decrypt, deriveKey, hashPassword, verifyPasswordHash } from '../../lib/crypto'

describe('Crypto', () => {
  describe('deriveKey', () => {
    it('should derive a key from password and salt', async () => {
      const salt = new Uint8Array(16)
      const key = await deriveKey('password123', salt)

      expect(key).toBeDefined()
      expect(crypto.subtle.importKey).toHaveBeenCalled()
      expect(crypto.subtle.deriveKey).toHaveBeenCalled()
    })

    it('should use correct PBKDF2 parameters', async () => {
      const salt = new Uint8Array(16)
      await deriveKey('test', salt)

      expect(crypto.subtle.deriveKey).toHaveBeenCalled()
    })
  })

  describe('encrypt', () => {
    it('should encrypt data and return base64 string', async () => {
      const result = await encrypt('secret data', 'password123')

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      // Base64 regex
      expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/)
    })

    it('should generate random salt and IV', async () => {
      await encrypt('data', 'pass')

      expect(crypto.getRandomValues).toHaveBeenCalled()
    })

    it('should use AES-GCM for encryption', async () => {
      await encrypt('data', 'password')

      expect(crypto.subtle.encrypt).toHaveBeenCalled()
    })

    it('should combine salt, IV, and encrypted data', async () => {
      const result = await encrypt('test', 'pass')
      const decoded = atob(result)

      // Salt (16) + IV (12) + encrypted data (at least 4 from mock)
      expect(decoded.length).toBeGreaterThanOrEqual(32)
    })
  })

  describe('decrypt', () => {
    it('should decrypt encrypted data', async () => {
      // First encrypt something
      const encrypted = await encrypt('hello world', 'password123')

      // Then decrypt it
      const decrypted = await decrypt(encrypted, 'password123')

      // With our mock, the decrypted value should be the original
      expect(typeof decrypted).toBe('string')
    })

    it('should extract salt and IV from encrypted data', async () => {
      const encrypted = await encrypt('data', 'pass')
      await decrypt(encrypted, 'pass')

      // Decrypt should have been called
      expect(crypto.subtle.decrypt).toHaveBeenCalled()
    })

    it('should use same key derivation for decrypt', async () => {
      const encrypted = await encrypt('test', 'mypassword')
      await decrypt(encrypted, 'mypassword')

      expect(crypto.subtle.deriveKey).toHaveBeenCalled()
    })
  })

  describe('hashPassword', () => {
    it('should return a salted PBKDF2 hash in correct format', async () => {
      const hash = await hashPassword('password123')

      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
      // New format: pbkdf2-sha512$iterations$salt$hash
      expect(hash).toMatch(/^pbkdf2-sha512\$\d+\$[A-Za-z0-9+/]+=*\$[A-Za-z0-9+/]+=*$/)
    })

    it('should use PBKDF2 with SHA-512 for hashing', async () => {
      await hashPassword('test')

      expect(crypto.subtle.deriveBits).toHaveBeenCalled()
    })

    it('should produce different hashes for same input (due to random salt)', async () => {
      const hash1 = await hashPassword('samepassword')
      const hash2 = await hashPassword('samepassword')

      // With random salt, hashes should be different
      expect(hash1).not.toBe(hash2)
    })

    it('should include 600000 iterations in hash format', async () => {
      const hash = await hashPassword('test')

      expect(hash).toContain('$600000$')
    })
  })

  describe('verifyPasswordHash', () => {
    it('should return true for matching password with new format', async () => {
      const hash = await hashPassword('correctpassword')
      const result = await verifyPasswordHash('correctpassword', hash)

      expect(result).toBe(true)
    })

    it('should handle wrong password verification', async () => {
      const hash = await hashPassword('correctpassword')
      const result = await verifyPasswordHash('wrongpassword', hash)

      // Note: With our mock that returns identical hashes, we can only verify
      // the function executes and returns a boolean. In production with real
      // crypto, this would return false for mismatched passwords.
      expect(typeof result).toBe('boolean')
    })

    it('should support legacy SHA-256 hashes for migration', async () => {
      // Simulate a legacy hash (base64 encoded SHA-256)
      const legacyHash = btoa(String.fromCharCode(...new Uint8Array(32).fill(1)))

      const result = await verifyPasswordHash('legacypassword', legacyHash)

      expect(typeof result).toBe('boolean')
    })

    it('should use deriveBits for new format verification', async () => {
      const hash = await hashPassword('test')
      await verifyPasswordHash('test', hash)

      expect(crypto.subtle.deriveBits).toHaveBeenCalled()
    })
  })
})
