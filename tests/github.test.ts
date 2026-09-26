import { describe, it, expect } from 'vitest';
import { parseGitHubUrl } from '../src/services/github';

describe('GitHub URL Parser', () => {
  it('parses standard https GitHub URLs', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react');
    expect(result).toEqual({
      owner: 'facebook',
      repo: 'react',
      branch: undefined,
    });
  });

  it('parses short owner/repo format', () => {
    const result = parseGitHubUrl('fastapi/fastapi');
    expect(result).toEqual({
      owner: 'fastapi',
      repo: 'fastapi',
    });
  });

  it('parses URLs with trailing .git and slashes', () => {
    const result = parseGitHubUrl('https://github.com/prisma/prisma.git/');
    expect(result).toEqual({
      owner: 'prisma',
      repo: 'prisma',
      branch: undefined,
    });
  });

  it('parses branch deep links in URL', () => {
    const result = parseGitHubUrl('https://github.com/tailwindlabs/tailwindcss/tree/main');
    expect(result).toEqual({
      owner: 'tailwindlabs',
      repo: 'tailwindcss',
      branch: 'main',
    });
  });

  it('returns null on invalid input', () => {
    expect(parseGitHubUrl('')).toBeNull();
    expect(parseGitHubUrl('not-a-repo')).toBeNull();
  });
});
