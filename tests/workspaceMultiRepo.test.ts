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
});
