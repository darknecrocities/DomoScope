import { describe, it, expect } from 'vitest';
import { calculateStreamingStep } from '../src/components/common/StreamingText';

describe('Dynamic Text & Metric Animation Engine', () => {
  it('correctly splits text into word and whitespace tokens', () => {
    const text = 'DomoScope is an AI architecture explorer for GitHub repositories.';
    const tokens = text.split(/(\s+)/);
    expect(tokens.join('')).toBe(text);
    expect(tokens.length).toBeGreaterThan(5);
  });

  it('calculates adaptive typing step sizes appropriately', () => {
    const calculateStep = (totalTokens: number, speed: 'fast' | 'normal' | 'slow') => {
      if (speed === 'fast') {
        return totalTokens > 300 ? 6 : totalTokens > 100 ? 4 : 2;
      }
      if (speed === 'slow') {
        return totalTokens > 300 ? 3 : totalTokens > 100 ? 2 : 1;
      }
      return totalTokens > 350 ? 5 : totalTokens > 150 ? 3 : totalTokens > 50 ? 2 : 1;
    };

    expect(calculateStep(20, 'normal')).toBe(1);
    expect(calculateStep(80, 'normal')).toBe(2);
    expect(calculateStep(200, 'normal')).toBe(3);
    expect(calculateStep(400, 'normal')).toBe(5);

    expect(calculateStep(120, 'fast')).toBe(4);
    expect(calculateStep(120, 'slow')).toBe(2);
  });

  it('scales step sizes appropriately for large specifications via calculateStreamingStep', () => {
    // Small string
    expect(calculateStreamingStep(20, 'normal')).toBe(1);
    // Medium paragraph
    expect(calculateStreamingStep(200, 'normal')).toBe(3);
    // Fast medium prompt
    expect(calculateStreamingStep(150, 'fast')).toBe(4);
    // Large 2500-token markdown specification in fast mode
    const largeStep = calculateStreamingStep(2500, 'fast');
    expect(largeStep).toBe(Math.ceil(2500 / 60)); // ~42 tokens per tick
    expect(largeStep).toBeGreaterThan(30);

    // Slow mode large spec
    const slowLargeStep = calculateStreamingStep(2000, 'slow');
    expect(slowLargeStep).toBe(Math.ceil(2000 / 80)); // ~25 tokens per tick
  });

  it('computes cubic ease-out curve progression from 0 to 1', () => {
    const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5); // Ease-out is faster early
  });

  it('interpolates metric values accurately across duration steps', () => {
    const start = 0;
    const end = 1696;
    const progress = 0.5;
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const interpolated = start + (end - start) * easeOut;

    expect(interpolated).toBeGreaterThan(0);
    expect(interpolated).toBeLessThan(end);
    expect(Math.round(interpolated)).toBe(1484);
  });
});
