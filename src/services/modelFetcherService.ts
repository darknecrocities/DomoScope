import { AIModelOption, AIProvider } from '../types';

// Up-to-date default models for 2025/2026 (newest first)
export const DEFAULT_AI_MODELS: AIModelOption[] = [
  // Local AI (WebLLM Automated)
  {
    id: 'local-grounded',
    name: 'Local AI Engine (WebLLM Automated)',
    provider: 'local',
    description: '100% on-device automated WebLLM engine with deterministic fallback. Zero token cost & full privacy.',
    isDefault: true,
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B (WebLLM)',
    provider: 'local',
    description: 'Ultra-fast in-browser LLM running on WebGPU with high code accuracy.',
  },
  {
    id: 'SmolLM2-135M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 135M (WebLLM)',
    provider: 'local',
    description: 'Lightweight on-device LLM with sub-millisecond local inference.',
  },

  // Anthropic Claude — Latest Roster
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet (Latest)',
    provider: 'anthropic',
    description: 'Anthropic newest hybrid reasoning model with state-of-the-art coding abilities.',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Flagship balanced model for complex architecture analysis and code generation.',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Ultra-fast, compact model optimized for high-speed repository Q&A.',
  },

  // Google Gemini — Latest Roster
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro (Latest)',
    provider: 'gemini',
    description: 'Google flagship 2025 model with 1M+ token context and deep code comprehension.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'High-throughput Gemini 2.5 model built for rapid developer workflows.',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Next-gen flash model with sub-second response times.',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Versatile 1M token context model for massive file comparisons.',
  },

  // OpenAI GPT — Latest Roster
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5 (Latest Flagship)',
    provider: 'openai',
    description: 'OpenAI largest and most capable model for complex reasoning and engineering.',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Omni model providing fast, highly accurate repository analysis.',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast, cost-effective GPT-4o variant ideal for quick repository lookup.',
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    provider: 'openai',
    description: 'OpenAI specialized reasoning model optimized for math, code, and logic.',
  },
  {
    id: 'o1',
    name: 'o1 Reasoning',
    provider: 'openai',
    description: 'Deep reasoning model for complex multi-step refactoring plans.',
  },
];

export const ModelFetcherService = {
  /**
   * Dynamically fetch live models from OpenAI if API key provided, otherwise return fallback
   */
  async fetchOpenAIModels(apiKey?: string): Promise<AIModelOption[]> {
    if (!apiKey) {
      return DEFAULT_AI_MODELS.filter((m) => m.provider === 'openai');
    }

    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      const data = await res.json();
      const rawList: Array<{ id: string }> = data.data || [];

      // Filter only chat models (exclude embeddings, audio, fine-tunes, TTS, whisper, dall-e)
      const chatModels = rawList
        .map((m) => m.id)
        .filter((id) => {
          if (id.includes('embedding') || id.includes('tts') || id.includes('whisper') || id.includes('dall-e') || id.includes('babbage') || id.includes('davinci')) {
            return false;
          }
          return id.startsWith('gpt-4') || id.startsWith('gpt-3.5') || id.startsWith('o1') || id.startsWith('o3');
        });

      // Sort newest / flagship models first
      const sortedIds = chatModels.sort((a, b) => {
        if (a.includes('4.5')) return -1;
        if (b.includes('4.5')) return 1;
        if (a.startsWith('o3')) return -1;
        if (b.startsWith('o3')) return 1;
        if (a.startsWith('o1')) return -1;
        if (b.startsWith('o1')) return 1;
        if (a.includes('4o') && !b.includes('4o')) return -1;
        if (b.includes('4o') && !a.includes('4o')) return 1;
        return b.localeCompare(a);
      });

      if (sortedIds.length === 0) {
        return DEFAULT_AI_MODELS.filter((m) => m.provider === 'openai');
      }

      return sortedIds.map((id) => ({
        id,
        name: formatModelName(id),
        provider: 'openai' as AIProvider,
        description: `Dynamically fetched OpenAI model (${id})`,
      }));
    } catch (err) {
      console.warn('Could not dynamically fetch OpenAI models, using fallback roster:', err);
      return DEFAULT_AI_MODELS.filter((m) => m.provider === 'openai');
    }
  },

  /**
   * Dynamically fetch live models from Google Gemini API if key provided
   */
  async fetchGeminiModels(apiKey?: string): Promise<AIModelOption[]> {
    if (!apiKey) {
      return DEFAULT_AI_MODELS.filter((m) => m.provider === 'gemini');
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      const data = await res.json();
      const rawList: Array<{ name: string; displayName?: string; description?: string }> = data.models || [];

      const geminiModels = rawList
        .filter((m) => m.name.includes('gemini'))
        .map((m) => {
          const cleanId = m.name.replace(/^models\//, '');
          return {
            id: cleanId,
            name: m.displayName || formatModelName(cleanId),
            provider: 'gemini' as AIProvider,
            description: m.description || `Dynamic Gemini model (${cleanId})`,
          };
        });

      if (geminiModels.length === 0) {
        return DEFAULT_AI_MODELS.filter((m) => m.provider === 'gemini');
      }

      return geminiModels;
    } catch (err) {
      console.warn('Could not dynamically fetch Gemini models, using fallback roster:', err);
      return DEFAULT_AI_MODELS.filter((m) => m.provider === 'gemini');
    }
  },

  /**
   * Get models for provider dynamically
   */
  async getModels(provider: AIProvider, keys?: { openaiKey?: string; geminiKey?: string }): Promise<AIModelOption[]> {
    if (provider === 'local') {
      return DEFAULT_AI_MODELS.filter((m) => m.provider === 'local');
    }
    if (provider === 'anthropic') {
      return DEFAULT_AI_MODELS.filter((m) => m.provider === 'anthropic');
    }
    if (provider === 'openai') {
      return await this.fetchOpenAIModels(keys?.openaiKey);
    }
    if (provider === 'gemini') {
      return await this.fetchGeminiModels(keys?.geminiKey);
    }
    return DEFAULT_AI_MODELS;
  },
};

function formatModelName(id: string): string {
  if (id === 'gpt-4o') return 'GPT-4o';
  if (id === 'gpt-4o-mini') return 'GPT-4o Mini';
  if (id === 'gpt-4.5-preview') return 'GPT-4.5 Preview';
  if (id === 'o3-mini') return 'o3-mini';
  if (id === 'o1') return 'o1 Reasoning';
  return id
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
