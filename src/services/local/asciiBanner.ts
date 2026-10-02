/**
 * DomoScope Terminal ASCII Art & Banner Designer
 * Designed for Antigravity CLI, Gemini Terminal, and Autonomous Agent DX
 */

import path from 'node:path';
import { getLocalGitBranch } from './localAnalysisEngine';

// ANSI escape color definitions
export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground 16-color
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright / High-Intensity
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgDark: '\x1b[48;5;234m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m',
};

/**
 * Strips all ANSI escape codes from a string to measure exact visible width
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Applies a smooth RGB truecolor gradient across a line of text
 */
export function gradientText(
  text: string,
  startRgb: [number, number, number] = [56, 189, 248], // Sky Blue / Cyan
  endRgb: [number, number, number] = [192, 132, 252],  // Electric Purple
  noColor = false
): string {
  if (noColor || process.env.NO_COLOR) {
    return text;
  }
  const chars = Array.from(text);
  const n = chars.length;
  if (n <= 1) return text;

  return chars
    .map((c, i) => {
      if (c === ' ') return ' ';
      const factor = i / (n - 1);
      const r = Math.round(startRgb[0] + (endRgb[0] - startRgb[0]) * factor);
      const g = Math.round(startRgb[1] + (endRgb[1] - startRgb[1]) * factor);
      const b = Math.round(startRgb[2] + (endRgb[2] - startRgb[2]) * factor);
      return `\x1b[38;2;${r};${g};${b}m${c}${ANSI.reset}`;
    })
    .join('');
}

/**
 * 3D Monumental Block Font for DomoScope (Width: ~85 columns)
 */
export const DOMOSCOPE_ASCII_ART_WIDE = [
  ' ██████╗   ██████╗  ███╗   ███╗  ██████╗  ███████╗  ██████╗  ██████╗  ██████╗  ███████╗',
  ' ██╔══██╗ ██╔═══██╗ ████╗ ████║ ██╔═══██╗ ██╔════╝ ██╔════╝ ██╔═══██╗ ██╔══██╗ ██╔════╝',
  ' ██║  ██║ ██║   ██║ ██╔████╔██║ ██║   ██║ ███████╗ ██║      ██║   ██║ ██████╔╝ █████╗  ',
  ' ██║  ██║ ██║   ██║ ██║╚██╔╝██║ ██║   ██║ ╚════██║ ██║      ██║   ██║ ██╔═══╝  ██╔══╝  ',
  ' ██████╔╝ ╚██████╔╝ ██║ ╚═╝ ██║ ╚██████╔╝ ███████║ ╚██████╗ ╚██████╔╝ ██║      ███████╗',
  ' ╚═════╝   ╚═════╝  ╚═╝     ╚═╝  ╚═════╝  ╚══════╝  ╚═════╝  ╚═════╝  ╚═╝      ╚══════╝',
];

/**
 * Modern Compact Slanted Font for DomoScope (Width: ~58 columns)
 */
export const DOMOSCOPE_ASCII_ART_COMPACT = [
  '   ___                             ____                     ',
  '  / _ \\ ___  __ _  ___  ___ ____  / __/______  ___  ___   ',
  " / // / _ \\/  ' \\/ _ \\(_-</ __/ _\\ \\ / __/ _ \\/ _ \\/ -_)  ",
  '/____/\\___/_/_/_/\\___/___/\\__/ /___/ \\__/\\___/ .__/\\__/   ',
  '                                             /_/          ',
];

/**
 * Minimalist Single-Line Banner for compact terminal windows
 */
export const DOMOSCOPE_ASCII_ART_MINI = [
  '─── [ 🔭 DOMOSCOPE // REPOSITORY INTELLIGENCE ] ───',
];

export interface BannerOptions {
  rootDir?: string;
  compact?: boolean;
  noColor?: boolean;
  showBox?: boolean;
  activeBranch?: string;
  projectName?: string;
  mcpStatus?: string;
  version?: string;
}

/**
 * Renders the DomoScope ASCII art banner with dynamic gradients and metadata box
 */
export function getAsciiBanner(options: BannerOptions = {}): string {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : process.cwd();
  const projectName = options.projectName || path.basename(rootDir);
  const gitInfo = options.activeBranch
    ? { branch: options.activeBranch }
    : getLocalGitBranch(rootDir);
  const version = options.version || 'v1.0.0';
  const noColor = Boolean(options.noColor || process.env.NO_COLOR);

  const termCols = (process.stdout && process.stdout.columns) || 80;
  const useCompact = options.compact ?? termCols < 90;
  const useMini = termCols < 50;

  const rawArt = useMini
    ? DOMOSCOPE_ASCII_ART_MINI
    : useCompact
    ? DOMOSCOPE_ASCII_ART_COMPACT
    : DOMOSCOPE_ASCII_ART_WIDE;

  // Start with cyan and transition to vibrant electric purple
  const startColor: [number, number, number] = [56, 189, 248]; // Cyan
  const endColor: [number, number, number] = [192, 132, 252];   // Violet / Purple

  const styledArtLines = rawArt.map((line) => {
    if (noColor) return line;
    return gradientText(line, startColor, endColor, noColor);
  });

  const lines: string[] = [''];
  lines.push(...styledArtLines);

  if (options.showBox !== false) {
    const boxWidth = Math.min(Math.max(termCols - 4, 60), 84);
    const branchLabel = `${gitInfo.branch}${gitInfo.commitSha ? ` (${gitInfo.commitSha})` : ''}`;

    const padLine = (content: string) => {
      const plainLen = stripAnsi(content).length;
      const padSize = Math.max(0, boxWidth - 4 - plainLen);
      return `  ${noColor ? '' : ANSI.gray}│${noColor ? '' : ANSI.reset} ${content}${' '.repeat(padSize)} ${noColor ? '' : ANSI.gray}│${noColor ? '' : ANSI.reset}`;
    };

    const topBorder = `  ${noColor ? '' : ANSI.gray}╭${'─'.repeat(boxWidth - 2)}╮${noColor ? '' : ANSI.reset}`;
    const midBorder = `  ${noColor ? '' : ANSI.gray}├${'─'.repeat(boxWidth - 2)}┤${noColor ? '' : ANSI.reset}`;
    const botBorder = `  ${noColor ? '' : ANSI.gray}╰${'─'.repeat(boxWidth - 2)}╯${noColor ? '' : ANSI.reset}`;

    const titleLine = `${noColor ? '' : ANSI.bold + ANSI.brightWhite}🔭 DomoScope ${version}${noColor ? '' : ANSI.reset} ${noColor ? '' : ANSI.gray}—${noColor ? '' : ANSI.reset} ${noColor ? '' : ANSI.cyan}Autonomous Repository Intelligence & Studio${noColor ? '' : ANSI.reset}`;

    const line1 = `${noColor ? '' : ANSI.cyan}Project:${noColor ? '' : ANSI.reset} ${projectName}    ${noColor ? '' : ANSI.magenta}Branch:${noColor ? '' : ANSI.reset} ${branchLabel}`;
    const line2 = `${noColor ? '' : ANSI.cyan}Engine:${noColor ? '' : ANSI.reset}  AST + Polyglot ERD    ${noColor ? '' : ANSI.magenta}Protocol:${noColor ? '' : ANSI.reset} MCP 2024-11-05 (16 Tools)`;
    const line3 = `${noColor ? '' : ANSI.cyan}Mode:${noColor ? '' : ANSI.reset}    Antigravity CLI REPL  ${noColor ? '' : ANSI.brightGreen}Status:${noColor ? '' : ANSI.reset}   ● Ready`;

    lines.push('');
    lines.push(topBorder);
    lines.push(padLine(titleLine));
    lines.push(midBorder);
    lines.push(padLine(line1));
    lines.push(padLine(line2));
    lines.push(padLine(line3));
    lines.push(botBorder);

    const hint = `${noColor ? '' : ANSI.gray}Type ${noColor ? '' : ANSI.brightCyan}/help${noColor ? '' : ANSI.gray} for commands, or ask any natural question about your codebase.${noColor ? '' : ANSI.reset}`;
    lines.push(`  ${hint}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Formats a styled box around arbitrary content lines
 */
export function formatBox(
  contentLines: string[],
  options: { title?: string; width?: number; borderColor?: string } = {}
): string {
  const width = options.width || 76;
  const color = options.borderColor || ANSI.gray;
  const reset = ANSI.reset;

  const top = options.title
    ? `╭─ ${ANSI.bold}${ANSI.brightWhite}${options.title}${reset} ${'─'.repeat(Math.max(0, width - stripAnsi(options.title).length - 5))}╮`
    : `╭${'─'.repeat(width - 2)}╮`;

  const rows = contentLines.map((line) => {
    const visibleLength = stripAnsi(line).length;
    const padding = Math.max(0, width - 4 - visibleLength);
    return `${color}│${reset} ${line}${' '.repeat(padding)} ${color}│${reset}`;
  });

  const bottom = `╰${'─'.repeat(width - 2)}╯`;

  return [
    `${color}${top}${reset}`,
    ...rows,
    `${color}${bottom}${reset}`,
  ].join('\n');
}
