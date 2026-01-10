const SALT_LENGTH = 16
const IV_LENGTH = 12
const ITERATIONS = 600000 // OWASP 2023 recommendation
const PASSWORD_HASH_SALT_LENGTH = 32
const PASSWORD_HASH_ITERATIONS = 600000

export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(
    salt.length + iv.length + encrypted.byteLength
  )
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(
  encryptedData: string,
  password: string
): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedData)
      .split('')
      .map((c) => c.charCodeAt(0))
  )

  const salt = combined.slice(0, SALT_LENGTH)
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const data = combined.slice(SALT_LENGTH + IV_LENGTH)

  const key = await deriveKey(password, salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return new TextDecoder().decode(decrypted)
}

// Helper functions for base64 encoding/decoding
function toBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
}

function fromBase64(base64: string): Uint8Array {
  return new Uint8Array(
    atob(base64)
      .split('')
      .map((c) => c.charCodeAt(0))
  )
}

// Timing-safe comparison to prevent timing attacks
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }
  return result === 0
}

/**
 * Hash password using PBKDF2 with random salt
 * Format: pbkdf2-sha512$iterations$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_HASH_SALT_LENGTH))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PASSWORD_HASH_ITERATIONS,
      hash: 'SHA-512',
    },
    keyMaterial,
    512 // 64 bytes
  )

  const hashArray = new Uint8Array(hashBuffer)
  return `pbkdf2-sha512$${PASSWORD_HASH_ITERATIONS}$${toBase64(salt)}$${toBase64(hashArray)}`
}

/**
 * Verify password against stored hash using timing-safe comparison
 */
export async function verifyPasswordHash(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split('$')

  // Handle legacy SHA-256 hashes (migration support)
  if (parts.length === 1) {
    // Legacy format: just the hash
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest('SHA-256', data)
    const legacyHash = btoa(String.fromCharCode(...new Uint8Array(hash)))
    return legacyHash === storedHash
  }

  // New format: pbkdf2-sha512$iterations$salt$hash
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha512') {
    return false
  }

  const [, iterationsStr, saltB64, hashB64] = parts
  const iterations = parseInt(iterationsStr, 10)
  const salt = fromBase64(saltB64)
  const expectedHash = fromBase64(hashB64)

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: iterations,
      hash: 'SHA-512',
    },
    keyMaterial,
    512
  )

  const computedHash = new Uint8Array(hashBuffer)
  return timingSafeEqual(computedHash, expectedHash)
}
