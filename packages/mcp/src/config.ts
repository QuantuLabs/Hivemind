import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface HivemindConfig {
  apiKeys: {
    openai?: string
    anthropic?: string
    google?: string
  }
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'hivemind')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

export function getConfig(): HivemindConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // Ignore errors, return empty config
  }
  return { apiKeys: {} }
}

export function saveConfig(config: HivemindConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function setApiKey(provider: 'openai' | 'anthropic' | 'google', key: string): void {
  const config = getConfig()
  config.apiKeys[provider] = key
  saveConfig(config)
}

export function hasRequiredKeys(): boolean {
  const config = getConfig()
  return !!(config.apiKeys.openai && config.apiKeys.anthropic && config.apiKeys.google)
}
