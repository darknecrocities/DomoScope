import { AIModelOption, AIProvider } from '../types';

// Up-to-date default models for 2025/2026 (newest and highest capability first)
export const DEFAULT_AI_MODELS: AIModelOption[] = [
  // ── Local AI (Zero-Install Engine) ───────────────────────────────────────
  {
    id: 'local-grounded',
    name: 'Direct Intelligent Engine (Zero-Install)',
    provider: 'local',
    description: 'Runs directly in your browser. 0MB download, 0 install, 100% private. Works instantly on mobile & desktop.',
    isDefault: true,
  },
  {
    id: 'vercel-serverless',
    name: 'Vercel Serverless AI (Cloud Proxy)',
    provider: 'local',
    description: 'Routes directly to your Vercel cloud deployment. Uses server environment variables with zero user setup.',
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B (Optional WebGPU)',
    provider: 'local',
    description: 'Optional on-device neural model for WebGPU-compatible desktop browsers.',
  },

  // ── Google Gemini — Gemini 3 & 2.5 Family ─────────────────────────────────
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash (Next-Gen)',
    provider: 'gemini',
    description: 'Google next-gen flagship Flash model with high-throughput reasoning and configurable thinking effort.',
    isDefault: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro (Deep Reasoning)',
    provider: 'gemini',
    description: 'Flagship model for complex architecture analysis, deep code reasoning, and multi-file logic.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'High-speed hybrid reasoning model supporting low/medium/high thinking levels.',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    provider: 'gemini',
    description: 'Ultra-fast, budget-friendly model for instant repository question answering.',
  },

  // ── Anthropic Claude — Latest Flagship Roster ─────────────────────────────
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet (Latest)',
    provider: 'anthropic',
    description: 'Anthropic flagship hybrid reasoning model with state-of-the-art coding abilities.',
    isDefault: true,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Balanced model for complex architecture analysis and code generation.',
  },

  // ── OpenAI GPT & Reasoning Roster ────────────────────────────────────────
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    provider: 'openai',
    description: 'Fast, highly accurate repository analysis and explanation.',
    isDefault: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Lightweight and fast variant for quick repository lookups.',
  },
  {
    id: 'o3-mini',
    name: 'o3-mini (Reasoning)',
    provider: 'openai',
    description: 'Specialized reasoning model with configurable effort for deep code logic.',
  },
  {
    id: 'o1',
    name: 'o1 Reasoning',
    provider: 'openai',
    description: 'Deep reasoning model for multi-step refactoring and architectural plans.',
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5 Preview',
    provider: 'openai',
    description: 'OpenAI largest and most capable model for complex engineering reasoning.',
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

      // Filter chat & reasoning models only
      const chatModels = rawList
        .map((m) => m.id)
        .filter((id) => {
          if (
            id.includes('embedding') ||
            id.includes('tts') ||
            id.includes('whisper') ||
            id.includes('dall-e') ||
            id.includes('babbage') ||
            id.includes('davinci')
          ) {
            return false;
          }
          return (
            (id.startsWith('gpt-4') && !id.includes('vision-preview')) ||
            id.startsWith('o1') ||
            id.startsWith('o3')
          );
        });

      // Sort newest / reasoning models first
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

      // Filter only generative chat models; filter out deprecated 1.0/1.5/2.0
      const geminiModels = rawList
        .filter((m) => m.name.includes('gemini') && !m.name.includes('embedding') && !m.name.includes('aqa'))
        .map((m) => {
          const cleanId = m.name.replace(/^models\//, '');
          return {
            id: cleanId,
            name: m.displayName || formatModelName(cleanId),
            provider: 'gemini' as AIProvider,
            description: m.description || `Google Gemini model (${cleanId})`,
          };
        })
        .filter((m) => !m.id.includes('1.5') && !m.id.includes('1.0') && !m.id.includes('2.0')); // exclude deprecated 1.0, 1.5, 2.0

      // Sort Gemini 3.x and 2.5 models to the top
      geminiModels.sort((a, b) => {
        if (a.id.includes('3.5')) return -1;
        if (b.id.includes('3.5')) return 1;
        if (a.id.includes('2.5-pro')) return -1;
        if (b.id.includes('2.5-pro')) return 1;
        if (a.id.includes('2.5-flash')) return -1;
        if (b.id.includes('2.5-flash')) return 1;
        if (a.id.includes('2.5')) return -1;
        if (b.id.includes('2.5')) return 1;
        return a.id.localeCompare(b.id);
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
  if (id === 'gemini-3.5-flash') return 'Gemini 3.5 Flash (Next-Gen)';
  if (id === 'gemini-2.5-pro') return 'Gemini 2.5 Pro (Deep Reasoning)';
  if (id === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
  if (id === 'gemini-2.5-flash-lite') return 'Gemini 2.5 Flash-Lite';
  if (id === 'gpt-4o') return 'GPT-4o (Omni)';
  if (id === 'gpt-4o-mini') return 'GPT-4o Mini';
  if (id === 'gpt-4.5-preview') return 'GPT-4.5 Preview';
  if (id === 'o3-mini') return 'o3-mini (Reasoning)';
  if (id === 'o1') return 'o1 Reasoning';
  return id
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
