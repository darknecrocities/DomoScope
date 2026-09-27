import { describe, it, expect } from 'vitest';
import { validateQuestionScope, GUARDRAIL_REJECTION_MESSAGE } from '../src/services/chatGuardrail';

describe('Chat Guardrail Service', () => {
  it('allows valid repository-scoped architecture and code questions', () => {
    const validQuestions = [
      'What is the architecture of this repository?',
      'How does the authentication flow work?',
      'Which API routes handle user signup?',
      'Can you explain src/services/aiService.ts?',
      'What database schema or ORM is used?',
      'Are there any security vulnerabilities in the dependencies?',
      'Where is the entry point defined in package.json?',
      'How do components interact in this project?',
    ];

    for (const q of validQuestions) {
      const result = validateQuestionScope(q);
      expect(result.allowed).toBe(true);
      expect(result.message).toBeUndefined();
    }
  });

  it('rejects empty and ultra-short inputs', () => {
    expect(validateQuestionScope('').allowed).toBe(false);
    expect(validateQuestionScope(' ').allowed).toBe(false);
    expect(validateQuestionScope('a').allowed).toBe(false);
    expect(validateQuestionScope('?').allowed).toBe(false);
    expect(validateQuestionScope('a').message).toBe(GUARDRAIL_REJECTION_MESSAGE);
  });

  it('rejects pure symbols and punctuation', () => {
    expect(validateQuestionScope('???').allowed).toBe(false);
    expect(validateQuestionScope('!@#$%^&*').allowed).toBe(false);
    expect(validateQuestionScope('.....').allowed).toBe(false);
  });

  it('rejects character spam and keyboard mash', () => {
    expect(validateQuestionScope('aaaaaa').allowed).toBe(false);
    expect(validateQuestionScope('zzzzzzzzzz').allowed).toBe(false);
    expect(validateQuestionScope('asdfghjkl').allowed).toBe(false);
    expect(validateQuestionScope('qwertyuiop').allowed).toBe(false);
    expect(validateQuestionScope('zxcvbnm').allowed).toBe(false);
  });

  it('rejects laughter and gibberish repeats', () => {
    expect(validateQuestionScope('hahahaha').allowed).toBe(false);
    expect(validateQuestionScope('lolololol').allowed).toBe(false);
    expect(validateQuestionScope('hehehehe').allowed).toBe(false);
  });

  it('rejects off-topic queries like trivia, weather, cooking, and jokes', () => {
    const offTopicQueries = [
      'who is the president of the united states?',
      "what is the capital of France?",
      "what's the weather in Tokyo today?",
      'tell me a joke',
      'sing me a song',
      'write a poem about love',
      'recipe for chocolate cake',
      'how to bake bread',
      'recommend a movie for tonight',
      'how to lose weight quickly',
      'solve 45 + 98 * 12',
    ];

    for (const q of offTopicQueries) {
      const result = validateQuestionScope(q);
      expect(result.allowed).toBe(false);
      expect(result.message).toBe(GUARDRAIL_REJECTION_MESSAGE);
    }
  });
});
