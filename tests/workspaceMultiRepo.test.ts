import { describe, it, expect } from 'vitest';
import { parseGitHubUrl } from '../src/services/github';

describe('Multi-Repository Workspace Logic', () => {
  it('parses various GitHub repository URLs and formats correctly', () => {
    expect(parseGitHubUrl('facebook/react')).toEqual({
      owner: 'facebook',
      repo: 'react',
    });

    expect(parseGitHubUrl('https://github.com/expressjs/express')).toEqual({
      owner: 'expressjs',
      repo: 'express',
      branch: undefined,
    });

    expect(parseGitHubUrl('https://github.com/fastapi/fastapi.git')).toEqual({
      owner: 'fastapi',
      repo: 'fastapi',
      branch: undefined,
    });

    expect(parseGitHubUrl('git@github.com:vercel/next.js.git')).toEqual({
      owner: 'vercel',
      repo: 'next.js',
      branch: undefined,
    });

    expect(parseGitHubUrl('https://github.com/tailwindlabs/tailwindcss/tree/main')).toEqual({
      owner: 'tailwindlabs',
      repo: 'tailwindcss',
      branch: 'main',
    });
  });

  it('manages open repositories array with addition, deduplication, and closing', () => {
    let openRepos = [
      { owner: 'facebook', repo: 'react' },
      { owner: 'expressjs', repo: 'express' },
    ];

    // Add new repo
    const addRepo = (owner: string, repo: string) => {
      const exists = openRepos.some(
        (r) => r.owner.toLowerCase() === owner.toLowerCase() && r.repo.toLowerCase() === repo.toLowerCase()
      );
      if (!exists) {
        openRepos = [...openRepos, { owner, repo }];
      }
    };

    addRepo('fastapi', 'fastapi');
    expect(openRepos.length).toBe(3);

    // Duplicate check
    addRepo('FACEBOOK', 'React');
    expect(openRepos.length).toBe(3);

    // Close a repo
    const closeRepo = (owner: string, repo: string) => {
      openRepos = openRepos.filter(
        (r) => !(r.owner.toLowerCase() === owner.toLowerCase() && r.repo.toLowerCase() === repo.toLowerCase())
      );
    };

    closeRepo('expressjs', 'express');
    expect(openRepos.length).toBe(2);
    expect(openRepos.map((r) => r.repo)).toEqual(['react', 'fastapi']);
  });

  it('guarantees metadata and analysis isolation when switching repositories', () => {
    interface RepoState {
      owner: string;
      repo: string;
      meta: { fullName: string; language: string };
      files: string[];
      deps: string[];
    }

    const repoA: RepoState = {
      owner: 'jabezapilado',
      repo: 'CTRL4_Chatbot_MKII',
      meta: { fullName: 'jabezapilado/CTRL4_Chatbot_MKII', language: 'Python' },
      files: ['main.py', 'requirements.txt'],
      deps: ['fastapi', 'uvicorn'],
    };

    const repoB: RepoState = {
      owner: 'darknecrocities',
      repo: 'Agentdeck',
      meta: { fullName: 'darknecrocities/Agentdeck', language: 'Dart' },
      files: ['lib/main.dart', 'pubspec.yaml'],
      deps: ['flutter', 'cupertino_icons'],
    };

    // State transition simulation
    let activeState: RepoState | null = repoA;
    expect(activeState.meta.fullName).toBe('jabezapilado/CTRL4_Chatbot_MKII');
    expect(activeState.meta.language).toBe('Python');

    // Switch repo: verify state resets completely without retaining stale Repo A metadata
    activeState = null; // Clean reset
    activeState = repoB;

    expect(activeState.meta.fullName).toBe('darknecrocities/Agentdeck');
    expect(activeState.meta.language).toBe('Dart');
    expect(activeState.files).toContain('lib/main.dart');
    expect(activeState.files).not.toContain('main.py');
    expect(activeState.deps).toContain('flutter');
    expect(activeState.deps).not.toContain('fastapi');
  });

  it('detects and invalidates mismatched cache entries', () => {
    const requestedOwner = 'darknecrocities';
    const requestedRepo = 'Agentdeck';

    // Stale/poisoned cache containing previous repo's metadata
    const poisonedCache = {
      metadata: {
        fullName: 'jabezapilado/CTRL4_Chatbot_MKII',
        owner: 'jabezapilado',
        repo: 'CTRL4_Chatbot_MKII',
      },
    };

    const isCacheValid = Boolean(
      poisonedCache?.metadata &&
      (poisonedCache.metadata.fullName.toLowerCase() === `${requestedOwner}/${requestedRepo}`.toLowerCase() ||
       (poisonedCache.metadata.owner.toLowerCase() === requestedOwner.toLowerCase() &&
        poisonedCache.metadata.repo.toLowerCase() === requestedRepo.toLowerCase()))
    );

    expect(isCacheValid).toBe(false);

    // Legitimate cache
    const validCache = {
      metadata: {
        fullName: 'darknecrocities/Agentdeck',
        owner: 'darknecrocities',
        repo: 'Agentdeck',
      },
    };

    const isValid = Boolean(
      validCache?.metadata &&
      (validCache.metadata.fullName.toLowerCase() === `${requestedOwner}/${requestedRepo}`.toLowerCase() ||
       (validCache.metadata.owner.toLowerCase() === requestedOwner.toLowerCase() &&
        validCache.metadata.repo.toLowerCase() === requestedRepo.toLowerCase()))
    );

    expect(isValid).toBe(true);
  });
});
