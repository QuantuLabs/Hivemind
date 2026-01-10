import { OpenAIProvider, AnthropicProvider, GoogleProvider } from '@quantulabs/hivemind-core'
import type { Provider } from '@quantulabs/hivemind-core'

export async function validateApiKey(
  provider: Provider,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API key is required' }
  }

  try {
    let providerInstance

    switch (provider) {
      case 'openai':
        providerInstance = new OpenAIProvider({ apiKey })
        break
      case 'anthropic':
        providerInstance = new AnthropicProvider({ apiKey })
        break
      case 'google':
        providerInstance = new GoogleProvider({ apiKey })
        break
      default:
        return { valid: false, error: 'Unknown provider' }
    }

    const isValid = await providerInstance.validateKey()
    return isValid
      ? { valid: true }
      : { valid: false, error: 'Invalid API key' }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    }
  }
}

export function getProviderInfo(provider: Provider) {
  const info = {
    openai: {
      name: 'OpenAI',
      placeholder: 'sk-...',
      helpUrl: 'https://platform.openai.com/api-keys',
    },
    anthropic: {
      name: 'Anthropic',
      placeholder: 'sk-ant-...',
      helpUrl: 'https://console.anthropic.com/settings/keys',
    },
    google: {
      name: 'Google AI',
      placeholder: 'AIza...',
      helpUrl: 'https://aistudio.google.com/app/apikey',
    },
  }

  return info[provider]
}
