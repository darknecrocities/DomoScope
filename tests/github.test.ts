import { describe, it, expect } from 'vitest';
import {
  parseGitHubUrl,
  sanitizeRepoSlug,
  GitHubService,
  isRestrictedRepository,
  isRestrictedRepoInput,
  RESTRICTED_REPO_ERROR,
} from '../src/services/github';

describe('GitHub Slug Sanitizer', () => {
  it('strips accidental trailing protocol artifacts', () => {
    expect(sanitizeRepoSlug('Easylenshttps')).toBe('Easylens');
    expect(sanitizeRepoSlug('Easylenshttp')).toBe('Easylens');
    expect(sanitizeRepoSlug('Easylenshttps://')).toBe('Easylens');
    expect(sanitizeRepoSlug('Thes-IS-IThttps')).toBe('Thes-IS-IT');
  });

  it('preserves valid package names ending in http or named http', () => {
    expect(sanitizeRepoSlug('http')).toBe('http');
    expect(sanitizeRepoSlug('https')).toBe('https');
    expect(sanitizeRepoSlug('my-http')).toBe('my-http');
  });

  it('strips query parameters, hashes, .git suffixes, and trailing slashes', () => {
    expect(sanitizeRepoSlug('Easylens.git')).toBe('Easylens');
    expect(sanitizeRepoSlug('Easylens/')).toBe('Easylens');
    expect(sanitizeRepoSlug('Easylens?tab=readme-ov-file')).toBe('Easylens');
    expect(sanitizeRepoSlug('Easylens#contributing')).toBe('Easylens');
  });
});

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

  it('correctly handles corrupted paste artifacts like Easylenshttps', () => {
    expect(parseGitHubUrl('https://github.com/Thes-IS-IT/Easylenshttps')).toEqual({
      owner: 'Thes-IS-IT',
      repo: 'Easylens',
      branch: undefined,
    });
    expect(parseGitHubUrl('Thes-IS-IT/Easylenshttps')).toEqual({
      owner: 'Thes-IS-IT',
      repo: 'Easylens',
    });
  });

  it('handles markdown wrappers and angle brackets', () => {
    expect(parseGitHubUrl('[Easylens](https://github.com/Thes-IS-IT/Easylens)')).toEqual({
      owner: 'Thes-IS-IT',
      repo: 'Easylens',
      branch: undefined,
    });
    expect(parseGitHubUrl('<https://github.com/Thes-IS-IT/Easylens>')).toEqual({
      owner: 'Thes-IS-IT',
      repo: 'Easylens',
      branch: undefined,
    });
  });

  it('handles query parameters and duplicated protocols', () => {
    expect(parseGitHubUrl('https://github.com/Thes-IS-IT/Easylens?tab=readme-ov-file')).toEqual({
      owner: 'Thes-IS-IT',
      repo: 'Easylens',
      branch: undefined,
    });
    expect(parseGitHubUrl('httpshttps://github.com/Thes-IS-IT/Easylens')).toEqual({
      owner: 'Thes-IS-IT',
      repo: 'Easylens',
      branch: undefined,
    });
  });

  it('parses repositories named http without corruption', () => {
    expect(parseGitHubUrl('https://github.com/dart-lang/http')).toEqual({
      owner: 'dart-lang',
      repo: 'http',
      branch: undefined,
    });
  });

  it('returns null on invalid input', () => {
    expect(parseGitHubUrl('')).toBeNull();
    expect(parseGitHubUrl('not-a-repo')).toBeNull();
  });
});

describe('Restricted Repository Protection', () => {
  it('correctly identifies darknecrocities/DomoScope and its variations as restricted', () => {
    expect(isRestrictedRepository('darknecrocities', 'DomoScope')).toBe(true);
    expect(isRestrictedRepository('darknecrocities', 'domoscope')).toBe(true);
    expect(isRestrictedRepository('DARKNECROCITIES', 'DOMOSCOPE')).toBe(true);
    expect(isRestrictedRepository('Darknecrocities', 'DomoScope.git')).toBe(true);
    expect(isRestrictedRepository('darknecrocities', 'DomoScope/')).toBe(true);
  });

  it('allows other repositories under darknecrocities or general open-source', () => {
    expect(isRestrictedRepository('darknecrocities', 'Agentdeck')).toBe(false);
    expect(isRestrictedRepository('facebook', 'react')).toBe(false);
    expect(isRestrictedRepository('vercel', 'next.js')).toBe(false);
    expect(isRestrictedRepository(null, null)).toBe(false);
  });

  it('detects restricted repository URLs and input strings', () => {
    expect(isRestrictedRepoInput('https://github.com/darknecrocities/DomoScope')).toBe(true);
    expect(isRestrictedRepoInput('https://github.com/darknecrocities/DomoScope.git')).toBe(true);
    expect(isRestrictedRepoInput('https://github.com/darknecrocities/DomoScope/')).toBe(true);
    expect(isRestrictedRepoInput('https://github.com/darknecrocities/DomoScope/tree/main')).toBe(true);
    expect(isRestrictedRepoInput('darknecrocities/DomoScope')).toBe(true);
    expect(isRestrictedRepoInput('git@github.com:darknecrocities/DomoScope.git')).toBe(true);

    expect(isRestrictedRepoInput('https://github.com/facebook/react')).toBe(false);
    expect(isRestrictedRepoInput('darknecrocities/Agentdeck')).toBe(false);
    expect(isRestrictedRepoInput('')).toBe(false);
  });

  it('GitHubService methods immediately reject darknecrocities/DomoScope without network requests', async () => {
    await expect(GitHubService.fetchRepoMetadata('darknecrocities', 'DomoScope')).rejects.toThrow(
      RESTRICTED_REPO_ERROR
    );
    await expect(GitHubService.fetchRepoTree('darknecrocities', 'DomoScope', 'main')).rejects.toThrow(
      RESTRICTED_REPO_ERROR
    );
    await expect(
      GitHubService.fetchFileContent('darknecrocities', 'DomoScope', 'main', 'package.json')
    ).rejects.toThrow(RESTRICTED_REPO_ERROR);
    await expect(
      GitHubService.compareBranches('darknecrocities', 'DomoScope', 'main', 'feature')
    ).rejects.toThrow(RESTRICTED_REPO_ERROR);
  });
});

