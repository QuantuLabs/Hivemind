import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export type Provider = 'openai' | 'anthropic' | 'google'

// Token pricing per 1M tokens (as of January 2026)
export const TOKEN_PRICING: Record<Provider, { input: number; output: number }> = {
  openai: { input: 2.50, output: 10.00 },      // GPT-5.2 pricing
  anthropic: { input: 3.00, output: 15.00 },   // Claude Opus 4.5 pricing
  google: { input: 1.25, output: 5.00 },       // Gemini 3 Pro pricing
}

export interface ProviderUsage {
  inputTokens: number
  outputTokens: number
  requests: number
}

export interface UsageStats {
  session: {
    startTime: number
    providers: Record<Provider, ProviderUsage>
  }
  monthly: {
    month: string // Format: YYYY-MM
    providers: Record<Provider, ProviderUsage>
  }
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'hivemind')
const USAGE_FILE = path.join(CONFIG_DIR, 'usage.json')

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function createEmptyProviderUsage(): ProviderUsage {
  return { inputTokens: 0, outputTokens: 0, requests: 0 }
}

function createEmptyProvidersRecord(): Record<Provider, ProviderUsage> {
  return {
    openai: createEmptyProviderUsage(),
    anthropic: createEmptyProviderUsage(),
    google: createEmptyProviderUsage(),
  }
}

// Session stats (in-memory, reset on server restart)
let sessionStats: UsageStats['session'] = {
  startTime: Date.now(),
  providers: createEmptyProvidersRecord(),
}

// Load monthly stats from file
function loadMonthlyStats(): UsageStats['monthly'] {
  const currentMonth = getCurrentMonth()

  try {
    if (fs.existsSync(USAGE_FILE)) {
      const content = fs.readFileSync(USAGE_FILE, 'utf-8')
      const data = JSON.parse(content)

      // Reset if it's a new month
      if (data.month === currentMonth) {
        return {
          month: data.month,
          providers: {
            openai: data.providers?.openai || createEmptyProviderUsage(),
            anthropic: data.providers?.anthropic || createEmptyProviderUsage(),
            google: data.providers?.google || createEmptyProviderUsage(),
          }
        }
      }
    }
  } catch {
    // Ignore errors, return fresh stats
  }

  return {
    month: currentMonth,
    providers: createEmptyProvidersRecord(),
  }
}

// Save monthly stats to file
function saveMonthlyStats(stats: UsageStats['monthly']): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  }
  fs.writeFileSync(USAGE_FILE, JSON.stringify(stats, null, 2), { mode: 0o600 })
}

// Track token usage for a provider
export function trackUsage(
  provider: Provider,
  inputTokens: number,
  outputTokens: number
): void {
  // Update session stats
  sessionStats.providers[provider].inputTokens += inputTokens
  sessionStats.providers[provider].outputTokens += outputTokens
  sessionStats.providers[provider].requests += 1

  // Update monthly stats
  const monthlyStats = loadMonthlyStats()
  monthlyStats.providers[provider].inputTokens += inputTokens
  monthlyStats.providers[provider].outputTokens += outputTokens
  monthlyStats.providers[provider].requests += 1
  saveMonthlyStats(monthlyStats)
}

// Calculate cost for a provider
function calculateCost(provider: Provider, usage: ProviderUsage): number {
  const pricing = TOKEN_PRICING[provider]
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

// Get all usage stats
export function getUsageStats(): {
  session: {
    startTime: number
    duration: number
    providers: Record<Provider, ProviderUsage & { cost: number }>
    totalCost: number
    totalTokens: number
    totalRequests: number
  }
  monthly: {
    month: string
    providers: Record<Provider, ProviderUsage & { cost: number }>
    totalCost: number
    totalTokens: number
    totalRequests: number
  }
} {
  const monthlyStats = loadMonthlyStats()

  const sessionProviders = {} as Record<Provider, ProviderUsage & { cost: number }>
  const monthlyProviders = {} as Record<Provider, ProviderUsage & { cost: number }>

  let sessionTotalCost = 0
  let sessionTotalTokens = 0
  let sessionTotalRequests = 0
  let monthlyTotalCost = 0
  let monthlyTotalTokens = 0
  let monthlyTotalRequests = 0

  for (const provider of ['openai', 'anthropic', 'google'] as Provider[]) {
    // Session
    const sessionUsage = sessionStats.providers[provider]
    const sessionCost = calculateCost(provider, sessionUsage)
    sessionProviders[provider] = { ...sessionUsage, cost: sessionCost }
    sessionTotalCost += sessionCost
    sessionTotalTokens += sessionUsage.inputTokens + sessionUsage.outputTokens
    sessionTotalRequests += sessionUsage.requests

    // Monthly
    const monthlyUsage = monthlyStats.providers[provider]
    const monthlyCost = calculateCost(provider, monthlyUsage)
    monthlyProviders[provider] = { ...monthlyUsage, cost: monthlyCost }
    monthlyTotalCost += monthlyCost
    monthlyTotalTokens += monthlyUsage.inputTokens + monthlyUsage.outputTokens
    monthlyTotalRequests += monthlyUsage.requests
  }

  return {
    session: {
      startTime: sessionStats.startTime,
      duration: Date.now() - sessionStats.startTime,
      providers: sessionProviders,
      totalCost: sessionTotalCost,
      totalTokens: sessionTotalTokens,
      totalRequests: sessionTotalRequests,
    },
    monthly: {
      month: monthlyStats.month,
      providers: monthlyProviders,
      totalCost: monthlyTotalCost,
      totalTokens: monthlyTotalTokens,
      totalRequests: monthlyTotalRequests,
    },
  }
}

// Reset session stats
export function resetSessionStats(): void {
  sessionStats = {
    startTime: Date.now(),
    providers: createEmptyProvidersRecord(),
  }
}

// Format duration in human-readable format
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// Format cost as currency
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

// Format tokens with K/M suffix
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}
