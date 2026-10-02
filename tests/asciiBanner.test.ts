import { describe, it, expect } from 'vitest';
import {
  getAsciiBanner,
  gradientText,
  stripAnsi,
  formatBox,
  DOMOSCOPE_ASCII_ART_WIDE,
  DOMOSCOPE_ASCII_ART_COMPACT,
} from '../src/services/local/asciiBanner';

describe('DomoScope ASCII Banner Designer', () => {
  it('strips ANSI codes correctly', () => {
    const raw = '\x1b[36m🔭 DomoScope\x1b[0m \x1b[1m\x1b[32mActive\x1b[0m';
    const plain = stripAnsi(raw);
    expect(plain).toBe('🔭 DomoScope Active');
  });

  it('renders gradient text without color when noColor is true', () => {
    const text = 'DOMOSCOPE';
    const plain = gradientText(text, [56, 189, 248], [192, 132, 252], true);
    expect(plain).toBe('DOMOSCOPE');
  });

  it('renders gradient text with ANSI escape codes when enabled', () => {
    const text = 'DOMOSCOPE';
    const colored = gradientText(text, [56, 189, 248], [192, 132, 252], false);
    expect(colored).toContain('\x1b[38;2;');
    expect(stripAnsi(colored)).toBe('DOMOSCOPE');
  });

  it('renders wide ASCII art banner', () => {
    const banner = getAsciiBanner({ compact: false, noColor: true, showBox: false });
    expect(banner).toContain('██████╗');
    expect(banner).toContain('██╔══██╗');
    expect(banner.split('\n').length).toBeGreaterThanOrEqual(DOMOSCOPE_ASCII_ART_WIDE.length);
  });

  it('renders compact ASCII art banner', () => {
    const banner = getAsciiBanner({ compact: true, noColor: true, showBox: false });
    expect(banner).toContain('___');
    expect(banner).toContain('/ _ \\');
    expect(banner.split('\n').length).toBeGreaterThanOrEqual(DOMOSCOPE_ASCII_ART_COMPACT.length);
  });

  it('renders metadata box with project name and branch', () => {
    const banner = getAsciiBanner({
      projectName: 'my-awesome-repo',
      activeBranch: 'feature/antigravity',
      noColor: true,
      showBox: true,
    });

    expect(banner).toContain('my-awesome-repo');
    expect(banner).toContain('feature/antigravity');
    expect(banner).toContain('AST + Polyglot ERD');
    expect(banner).toContain('Antigravity CLI REPL');
    expect(banner).toContain('MCP 2024-11-05');
    expect(banner).toContain('╭');
    expect(banner).toContain('╰');
  });

  it('formats custom boxes with aligned borders and titles', () => {
    const content = ['First line of test data', 'Second line with more details'];
    const boxed = formatBox(content, { title: 'Test Window', width: 60 });
    const lines = boxed.split('\n');

    expect(lines[0]).toContain('Test Window');
    expect(lines[0]).toContain('╭');
    expect(lines[lines.length - 1]).toContain('╰');
    // Ensure all rows have equal visible width
    const widths = lines.map((l) => stripAnsi(l).length);
    const firstWidth = widths[0];
    widths.forEach((w) => {
      expect(Math.abs(w - firstWidth)).toBeLessThanOrEqual(2);
    });
  });
});
