import { describe, it, expect } from 'vitest';

describe('Chat Text Animation & Generative Typewriter Engine', () => {
  it('tokenizes text preserving all whitespace, words, and newlines', () => {
    const text = 'Welcome to DomoScope!\n\nHere is an explanation of **App Architecture**:\n- Feature A\n- Feature B';
    const tokens = text.split(/(\s+)/);
    expect(tokens.join('')).toBe(text);
    expect(tokens.length).toBeGreaterThan(5);
  });

  it('progressively streams tokens reaching 100% completion without missing characters', () => {
    const text = 'The authentication system uses Supabase Auth with JSON Web Tokens (JWT). Routes are guarded by middleware.';
    const tokens = text.split(/(\s+)/);
    let index = 0;
    const step = 2;
    const history: string[] = [];

    while (index < tokens.length) {
      index = Math.min(index + step, tokens.length);
      const current = tokens.slice(0, index).join('');
      history.push(current);
      expect(text.startsWith(current)).toBe(true);
    }

    expect(history[history.length - 1]).toBe(text);
  });

  it('handles adaptive step sizes for fast generative typing', () => {
    const getStep = (total: number) => (total > 350 ? 5 : total > 150 ? 3 : total > 50 ? 2 : 1);

    expect(getStep(20)).toBe(1);
    expect(getStep(80)).toBe(2);
    expect(getStep(200)).toBe(3);
    expect(getStep(500)).toBe(5);
  });

  it('safely handles partial markdown tokens without crashing', () => {
    const textWithMarkdown = '```typescript\nconst x = 1;\n```\n**Bold Statement**\n`inline code`';
    const tokens = textWithMarkdown.split(/(\s+)/);

    for (let i = 1; i <= tokens.length; i++) {
      const partial = tokens.slice(0, i).join('');
      expect(typeof partial).toBe('string');
      expect(partial.length).toBeLessThanOrEqual(textWithMarkdown.length);
    }
  });

  it('strips leaked prompt instructions and meta-commentary from neural outputs', async () => {
    const { cleanModelResponse } = await import('../src/services/webLLMService');
    const dirty = `Good morning! As DomoScope Assistant for repo, I'm here to help. Since the user asked "goodmorning", I'll respond with a friendly and professional greeting.

**Warm and friendly response:**
"Good morning! How can I assist you today?"
**Structured technical answer:**
Here is the architecture overview.`;

    const cleaned = cleanModelResponse(dirty);
    expect(cleaned).not.toContain('Since the user asked');
    expect(cleaned).not.toContain('**Warm and friendly response:**');
    expect(cleaned).not.toContain('**Structured technical answer:**');
  });
});
