import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { MODELS, DEFAULT_MODELS as CORE_DEFAULT_MODELS, type ModelId, type Provider as CoreProvider } from '@quantulabs/hivemind-core'

// Use Provider type from core (same definition)
export type Provider = CoreProvider

// Re-export DEFAULT_MODELS from core
export const DEFAULT_MODELS = CORE_DEFAULT_MODELS

// Valid models per provider (derived from MODELS)
export const VALID_MODELS: Record<Provider, ModelId[]> = {
  openai: MODELS.filter(m => m.provider === 'openai').map(m => m.id),
  anthropic: MODELS.filter(m => m.provider === 'anthropic').map(m => m.id),
  google: MODELS.filter(m => m.provider === 'google').map(m => m.id),
}

// Validate model ID for a provider
export function validateModelId(provider: Provider, modelId: string | undefined): { valid: boolean; error?: string } {
  if (!modelId) {
    return { valid: false, error: `No model specified for ${provider}` }
  }

  const validModels = VALID_MODELS[provider]
  if (!validModels.includes(modelId as ModelId)) {
    return {
      valid: false,
      error: `Invalid model "${modelId}" for ${provider}. Valid models: ${validModels.join(', ')}`
    }
  }

  return { valid: true }
}

// Standard environment variable names for API keys
const ENV_VAR_NAMES = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
} as const

export interface HivemindSettings {
  useGrounding: boolean
  claudeCodeMode: boolean // Skip Anthropic API when running inside Claude Code
}

export interface HivemindConfig {
  apiKeys: {
    openai?: string
    anthropic?: string
    google?: string
  }
  settings: HivemindSettings
}

// Key source types for transparency
export type KeySource = 'env' | 'dotenv' | 'none'

export interface KeySourceInfo {
  provider: Provider
  source: KeySource
  configured: boolean
}

// Auto-detect Claude Code environment
function isRunningInClaudeCode(): boolean {
  return !!(
    process.env.CLAUDE_CODE ||
    process.env.MCP_CLAUDE_CODE ||
    process.title?.toLowerCase().includes('claude') ||
    process.env.TERM_PROGRAM === 'claude' ||
    process.argv.some(arg => arg.includes('hivemind') && arg.includes('mcp'))
  )
}

const DEFAULT_SETTINGS: HivemindSettings = {
  useGrounding: true,
  claudeCodeMode: true,
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'hivemind')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const ENV_FILE = path.join(CONFIG_DIR, '.env')

// Settings config (JSON file)
interface SettingsConfig {
  settings: HivemindSettings
}

function getSettingsConfig(): SettingsConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      return {
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      }
    }
  } catch {
    // Ignore errors, return defaults
  }
  return { settings: DEFAULT_SETTINGS }
}

function saveSettingsConfig(config: SettingsConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 })
}

// .env file handling
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

function getEnvFileKeys(): Record<string, string> {
  try {
    if (fs.existsSync(ENV_FILE)) {
      const content = fs.readFileSync(ENV_FILE, 'utf-8')
      return parseEnvFile(content)
    }
  } catch {
    // Ignore errors
  }
  return {}
}

// Get the set of managed env var names
const MANAGED_ENV_VARS = new Set(Object.values(ENV_VAR_NAMES))

function saveEnvFile(keys: Record<string, string>): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  }

  // Read existing file to preserve comments and order
  let existingContent = ''
  try {
    if (fs.existsSync(ENV_FILE)) {
      existingContent = fs.readFileSync(ENV_FILE, 'utf-8')
    }
  } catch {
    // Ignore
  }

  // Build new content
  const lines: string[] = []
  const writtenKeys = new Set<string>()

  if (existingContent) {
    // Preserve existing structure, update values
    for (const line of existingContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        lines.push(line)
        continue
      }

      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) {
        lines.push(line)
        continue
      }

      const key = trimmed.slice(0, eqIndex).trim()
      if (key in keys) {
        // Update the key with new value
        lines.push(`${key}=${keys[key]}`)
        writtenKeys.add(key)
      } else if (!MANAGED_ENV_VARS.has(key)) {
        // Preserve non-managed keys (user's own env vars)
        lines.push(line)
      }
      // Managed keys not in 'keys' are deleted (skipped)
    }
  }

  // Add new keys that weren't in the file
  for (const [key, value] of Object.entries(keys)) {
    if (!writtenKeys.has(key)) {
      lines.push(`${key}=${value}`)
    }
  }

  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', { mode: 0o600 })
}

// Get API key from system environment variable
function getApiKeyFromEnv(provider: Provider): string | undefined {
  const envVarName = ENV_VAR_NAMES[provider]
  const value = process.env[envVarName]
  return value && value.trim().length > 0 ? value : undefined
}

// Get API key from .env file
function getApiKeyFromDotenv(provider: Provider): string | undefined {
  const envVarName = ENV_VAR_NAMES[provider]
  const envKeys = getEnvFileKeys()
  const value = envKeys[envVarName]
  return value && value.trim().length > 0 ? value : undefined
}

// Get all API keys with priority: system env > .env file
function getApiKeys(): HivemindConfig['apiKeys'] {
  const apiKeys: HivemindConfig['apiKeys'] = {}
  const providers: Provider[] = ['openai', 'anthropic', 'google']

  for (const provider of providers) {
    // 1. System environment variable (highest priority)
    const envKey = getApiKeyFromEnv(provider)
    if (envKey) {
      apiKeys[provider] = envKey
      continue
    }

    // 2. .env file
    const dotenvKey = getApiKeyFromDotenv(provider)
    if (dotenvKey) {
      apiKeys[provider] = dotenvKey
    }
  }

  return apiKeys
}

// Cache for synchronous access
let cachedApiKeys: HivemindConfig['apiKeys'] = {}
let cacheInitialized = false

async function initializeCache(): Promise<void> {
  if (!cacheInitialized) {
    cachedApiKeys = getApiKeys()
    cacheInitialized = true
  }
}

// Initialize cache on module load
initializeCache().catch(() => {})

export function getConfig(): HivemindConfig {
  // Refresh cache on each call to pick up .env changes
  cachedApiKeys = getApiKeys()
  const settingsConfig = getSettingsConfig()
  return {
    apiKeys: cachedApiKeys,
    settings: settingsConfig.settings,
  }
}

export function saveConfig(config: HivemindConfig): void {
  // Save settings to JSON file
  saveSettingsConfig({ settings: config.settings })
  // Update cache
  cachedApiKeys = config.apiKeys
}

export async function setApiKey(provider: Provider, key: string): Promise<void> {
  const envVarName = ENV_VAR_NAMES[provider]
  const existingKeys = getEnvFileKeys()
  existingKeys[envVarName] = key
  saveEnvFile(existingKeys)
  // Update cache
  cachedApiKeys[provider] = key
}

export async function deleteApiKey(provider: Provider): Promise<void> {
  const envVarName = ENV_VAR_NAMES[provider]
  const existingKeys = getEnvFileKeys()
  delete existingKeys[envVarName]
  saveEnvFile(existingKeys)
  delete cachedApiKeys[provider]
}

export function hasRequiredKeys(): boolean {
  const config = getConfig()
  return !!(config.apiKeys.openai || config.apiKeys.anthropic || config.apiKeys.google)
}

export function getAvailableProviders(): Provider[] {
  const config = getConfig()
  const providers: Provider[] = []
  if (config.apiKeys.openai) providers.push('openai')
  const skipAnthropic = config.settings.claudeCodeMode ?? isRunningInClaudeCode()
  if (config.apiKeys.anthropic && !skipAnthropic) {
    providers.push('anthropic')
  }
  if (config.apiKeys.google) providers.push('google')
  return providers
}

export { isRunningInClaudeCode }

export function updateSettings(settings: Partial<HivemindSettings>): HivemindSettings {
  const config = getConfig()
  config.settings = { ...config.settings, ...settings }
  saveConfig(config)
  return config.settings
}

export function getSettings(): HivemindSettings {
  return getConfig().settings
}

// Determine the source of an API key for a provider
export function getKeySource(provider: Provider): KeySourceInfo {
  // Check system environment variable first
  if (getApiKeyFromEnv(provider)) {
    return { provider, source: 'env', configured: true }
  }

  // Check .env file
  if (getApiKeyFromDotenv(provider)) {
    return { provider, source: 'dotenv', configured: true }
  }

  return { provider, source: 'none', configured: false }
}

// Get sources for all providers
export function getAllKeySources(): KeySourceInfo[] {
  return [
    getKeySource('openai'),
    getKeySource('anthropic'),
    getKeySource('google'),
  ]
}

// Get the path to the .env file for display
export function getEnvFilePath(): string {
  return ENV_FILE
}

export { initializeCache, getApiKeys }
