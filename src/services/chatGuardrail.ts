/**
 * DomoScope Repository Scope Guardrail
 * Ensures all chat interactions remain strictly scoped to the repository, its architecture,
 * files, APIs, database schemas, and security.
 */

export const GUARDRAIL_REJECTION_MESSAGE =
  'Sorry, I can only answer questions within the scope of this repository (architecture, code files, API routes, database schemas, and security). Please ask a question related to this project.';

export const SYSTEM_PROMPT_GUARDRAIL = `
SCOPE & RELEVANCE GUARDRAIL:
You are strictly an expert assistant for this specific repository.
You MUST ONLY answer questions concerning this codebase: its architecture, files, components, API endpoints, dependencies, database schema, security, and setup.
If the user's input is off-topic, nonsense, unrelated to software engineering or this repository (such as general trivia, personal questions, recipes, poetry, creative fiction, jokes, or non-coding queries), you MUST immediately refuse by replying:
"${GUARDRAIL_REJECTION_MESSAGE}"
Do not entertain off-scope queries under any circumstances.`;

const COMMON_OFF_TOPIC_PATTERNS: RegExp[] = [
  // General chat / personal
  /^(how are you|who are you|what is your name|who created you|sing me a song|tell me a joke|tell a joke|make me laugh)/i,
  // Trivia & World Knowledge
  /^(who is|who was|who are)\s+(the president|the prime minister|the king|the queen|elon|trump|biden|obama|taylor swift|celebrity)/i,
  /^(what is the capital of|what's the capital of)/i,
  /^(what is the weather|what's the weather|forecast|temperature in)/i,
  /^(who won the|what was the score of)\s+(world cup|super bowl|nba|match|game)/i,
  // Creative Writing & Academics
  /^(write a poem|write a song|write a story|write an essay|write a novel|compose a haiku)/i,
  /^(summarize the plot of|explain the movie|who died in)/i,
  // Cooking & Lifestyle
  /^(recipe(s)? for|how to cook|how to bake)/i,
  /^(how to make)\s+(.*?\b)?(cake|pizza|bread|coffee|soup|pasta|cookies|salad|pie|steak|chicken|dessert|meal)/i,
  /^(how to lose weight|workout routine|exercise for|fitness plan)/i,
  /^(recommend a (movie|song|book|restaurant|hotel|gift))/i,
  // Meaning of life & philosophical nonsense
  /^(what is the meaning of life|who created the universe|are aliens real)/i,
  // Math solver (unrelated to coding)
  /^(solve (this equation|\d+\s*[\+\-\*\/=]))/i,
];

/**
 * Checks whether a question is valid and within repository scope.
 */
export function validateQuestionScope(question: string): { allowed: boolean; message?: string } {
  const trimmed = (question || '').trim();

  // 1. Empty or extremely short input
  if (trimmed.length < 2) {
    return { allowed: false, message: GUARDRAIL_REJECTION_MESSAGE };
  }

  // 2. Pure symbols / punctuation
  if (/^[^\w\s]+$/.test(trimmed)) {
    return { allowed: false, message: GUARDRAIL_REJECTION_MESSAGE };
  }

  // 3. Repeated single character (e.g. "aaaaaa", "111111", "......")
  if (/^(.)\1{4,}$/.test(trimmed)) {
    return { allowed: false, message: GUARDRAIL_REJECTION_MESSAGE };
  }

  // 4. Repeated laughing / nonsense syllables (e.g. "hahaha", "lololol", "hehehe", "lmao")
  const noSpaces = trimmed.replace(/\s+/g, '');
  if (
    /^(ha|he|xd|rofl){3,}$/i.test(noSpaces) ||
    /^(lo|ol){3,}l?$/i.test(noSpaces) ||
    /^l(ol){2,}$/i.test(noSpaces) ||
    /^(lmao){2,}$/i.test(noSpaces)
  ) {
    return { allowed: false, message: GUARDRAIL_REJECTION_MESSAGE };
  }

  // 5. Common keyboard mash patterns
  const lower = trimmed.toLowerCase();
  if (/^(asdfghjkl|qwertyuiop|zxcvbnm|qwerasdf|asdfasdf)/i.test(lower)) {
    return { allowed: false, message: GUARDRAIL_REJECTION_MESSAGE };
  }

  // 6. Explicit Off-Topic Patterns
  for (const pattern of COMMON_OFF_TOPIC_PATTERNS) {
    if (pattern.test(lower)) {
      return { allowed: false, message: GUARDRAIL_REJECTION_MESSAGE };
    }
  }

  // 7. Check if query is high-length single word with zero vowels and not a known tech token
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && words[0].length > 7) {
    const word = words[0].toLowerCase();
    const knownTech = [
      'typescript',
      'javascript',
      'dockerfile',
      'eslintignore',
      'gitignore',
      'postgresql',
      'supabase',
      'cloudflare',
      'kubernetes',
      'filesystem',
      'components',
      'middleware',
      'architecture',
      'dependency',
      'dependencies',
      'encryption',
      'repository',
    ];
    const hasVowels = /[aeiouy]/.test(word);
    if (!hasVowels && !knownTech.some((k) => k.includes(word))) {
      return { allowed: false, message: GUARDRAIL_REJECTION_MESSAGE };
    }
  }

  return { allowed: true };
}
