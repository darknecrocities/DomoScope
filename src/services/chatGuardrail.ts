import { RepoAnalysis } from '../types';

/**
 * DomoScope Repository Scope & Safety Guardrail
 * Ensures all chat interactions remain safe, professional, and strictly scoped
 * to repository architecture, code files, APIs, database schemas, and security.
 */

export const GUARDRAIL_REJECTION_MESSAGE =
  'Sorry, I can only answer questions within the scope of this repository (architecture, code files, API routes, database schemas, and security). Please ask a question related to this project.';

export const SAFETY_VIOLATION_MESSAGE =
  'I cannot fulfill this request. DomoScope is strictly committed to a safe, respectful, and professional developer environment. Content involving harassment, hate speech, sexual content, violence, or abuse is strictly prohibited.';

export const SYSTEM_PROMPT_GUARDRAIL = `
SAFETY & CONTENT GUARDRAIL:
You must strictly refuse any prompts containing sexual content, sexualization, harassment, hate speech, profanity, threats of violence, or abuse. You must immediately refuse by replying:
"${SAFETY_VIOLATION_MESSAGE}"

SCOPE & RELEVANCE GUARDRAIL:
You are strictly an expert assistant for this specific repository.
- When the user sends a greeting or asks who you are (e.g. "hello", "hi", "hey", "how are you", "who are you", "what can you do"), respond warmly and professionally, introduce yourself as DomoScope Assistant for this repository, and briefly highlight what you can help inspect.
- You MUST answer questions concerning this codebase: its architecture, files, components, API endpoints, dependencies, database schema, security, and setup.
- If the user's input is off-topic, nonsense, or completely unrelated to software engineering or this repository (such as general trivia, recipes, poetry, creative fiction, jokes, or non-coding queries), you MUST immediately refuse by replying:
"${GUARDRAIL_REJECTION_MESSAGE}"`;

/**
 * Sexual content, sexualization, and explicit NSFW patterns
 */
export const SEXUAL_CONTENT_PATTERNS: RegExp[] = [
  /\b(nsfw|porn|porno|pornography|erotic\w*|hentai|sex|sexual\w*|sexy|nudes?|nudity|naked|masturbat\w*|orgasm\w*|intercourse|fetish\w*|horny|boobs?|breast\w*|penis\w*|vagina\w*|dildo\w*|blowjob\w*|anal\s+sex|threesome|xxx|escort|camgirl)\b/i,
  /\b(send\s+nudes?|undress|touch\s+yourself|sexual\s+fantasy|dirty\s+talk|talk\s+dirty|roleplay\s+sex|be\s+my\s+(boyfriend|girlfriend|lover))\b/i,
  /\b(child\s+porn|cp|pedophil\w*|underage\s+sex)\b/i,
];

/**
 * Harassment, hate speech, abuse, and violence patterns
 */
export const HARASSMENT_ABUSE_PATTERNS: RegExp[] = [
  // Harassment and self-harm
  /\b(kill\s+yourself|kys|commit\s+suicide|die\s+bitch|hang\s+yourself|slit\s+your\s+wrists)\b/i,
  /\b(i\s+will\s+kill\s+you|i\s+will\s+hurt\s+you|i\s+will\s+murder|i\s+will\s+find\s+you\s+and|threat\s+to\s+kill)\b/i,
  // Slurs and severe hate speech
  /\b(faggot|nigger|nigga|chink|kike|spic|retard|cunt|whore|slut|bitch|bastard)\b/i,
  // Violent threats & terrorism
  /\b(terroris\w*|bomb\s+threat|mass\s+shooting|school\s+shooting|behead\w*)\b/i,
  // Targeted harassment / doxxing
  /\b(doxx\w*|stalk\w*|swat\w*)\s+(someone|them|her|him|user)\b/i,
];

/**
 * Common greetings and introductory phrases
 */
export const GREETING_PATTERNS: RegExp[] = [
  /^(hi+|hello+|he+y+|heya|howdy|sup|yo+|hiya|aloha|hola|bonjour|greetings)(\s+there|\s+assistant|\s+domoscope|\s+bot)?[\s!.,?]*$/i,
  /^(good\s*(morning|afternoon|evening|day|night)|gm|gn|g'?day|mornin'?|morning|afternoon|evening)(\s+there|\s+assistant|\s+domoscope)?[\s!.,?]*$/i,
  /^(how\s+are\s+(you|u)|how\s+r\s+u|how'?s\s+it\s+going|how'?s\s+everything|how\s+do\s+you\s+do|how'?s\s+your\s+day)[\s!.,?]*$/i,
  /^(who\s+are\s+you|what\s+is\s+your\s+name|what\s+can\s+you\s+do|what\s+are\s+you|what\s+do\s+you\s+do|introduce\s+yourself|tell\s+me\s+about\s+yourself|help(\s+me)?|how\s+can\s+you\s+help(\s+me)?)[\s!.,?]*$/i,
  /^(nice\s+to\s+meet\s+you|pleased\s+to\s+meet\s+you|what'?s\s+up|wassup|wazzup)[\s!.,?]*$/i,
  /^(thanks|thank\s+you|ty|thx|thank\s+you\s+so\s+much|appreciate\s+it)[\s!.,?]*$/i,
];

const COMMON_OFF_TOPIC_PATTERNS: RegExp[] = [
  // Creative Writing & Jokes
  /^(sing me a song|tell me a joke|tell a joke|make me laugh)/i,
  /^(write a poem|write a song|write a story|write an essay|write a novel|compose a haiku)/i,
  /^(summarize the plot of|explain the movie|who died in)/i,
  // Trivia & World Knowledge
  /^(who is|who was|who are)\s+(the president|the prime minister|the king|the queen|elon|trump|biden|obama|taylor swift|celebrity)/i,
  /^(what is the capital of|what's the capital of)/i,
  /^(what is the weather|what's the weather|forecast|temperature in)/i,
  /^(who won the|what was the score of)\s+(world cup|super bowl|nba|match|game)/i,
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
 * Checks whether text contains sexual content or harassment.
 */
export function isSafetyViolation(question: string): boolean {
  const lower = (question || '').toLowerCase();
  for (const pattern of SEXUAL_CONTENT_PATTERNS) {
    if (pattern.test(lower)) return true;
  }
  for (const pattern of HARASSMENT_ABUSE_PATTERNS) {
    if (pattern.test(lower)) return true;
  }
  return false;
}

/**
 * Checks whether text is a friendly greeting or introductory query.
 */
export function isGreeting(question: string): boolean {
  const trimmed = (question || '').trim();
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

export interface GuardrailValidationResult {
  allowed: boolean;
  message?: string;
  isGreeting?: boolean;
  violationType?: 'safety' | 'scope';
}

/**
 * Checks whether a question is safe and within repository scope.
 */
export function validateQuestionScope(question: string): GuardrailValidationResult {
  const trimmed = (question || '').trim();

  // 1. Safety Guardrail Check (Sexualization, Harassment, Hate Speech, Abuse)
  if (isSafetyViolation(trimmed)) {
    return {
      allowed: false,
      message: SAFETY_VIOLATION_MESSAGE,
      violationType: 'safety',
    };
  }

  // 2. Greetings and Pleasantries Check
  if (isGreeting(trimmed)) {
    return {
      allowed: true,
      isGreeting: true,
    };
  }

  // 3. Empty or extremely short input (less than 2 chars)
  if (trimmed.length < 2) {
    return {
      allowed: false,
      message: GUARDRAIL_REJECTION_MESSAGE,
      violationType: 'scope',
    };
  }

  // 4. Pure symbols / punctuation
  if (/^[^\w\s]+$/.test(trimmed)) {
    return {
      allowed: false,
      message: GUARDRAIL_REJECTION_MESSAGE,
      violationType: 'scope',
    };
  }

  // 5. Repeated single character (e.g. "aaaaaa", "111111", "......")
  if (/^(.)\1{4,}$/.test(trimmed)) {
    return {
      allowed: false,
      message: GUARDRAIL_REJECTION_MESSAGE,
      violationType: 'scope',
    };
  }

  // 6. Repeated laughing / nonsense syllables
  const noSpaces = trimmed.replace(/\s+/g, '');
  if (
    /^(ha|he|xd|rofl){3,}$/i.test(noSpaces) ||
    /^(lo|ol){3,}l?$/i.test(noSpaces) ||
    /^l(ol){2,}$/i.test(noSpaces) ||
    /^(lmao){2,}$/i.test(noSpaces)
  ) {
    return {
      allowed: false,
      message: GUARDRAIL_REJECTION_MESSAGE,
      violationType: 'scope',
    };
  }

  // 7. Common keyboard mash patterns
  const lower = trimmed.toLowerCase();
  if (/^(asdfghjkl|qwertyuiop|zxcvbnm|qwerasdf|asdfasdf)/i.test(lower)) {
    return {
      allowed: false,
      message: GUARDRAIL_REJECTION_MESSAGE,
      violationType: 'scope',
    };
  }

  // 8. Explicit Off-Topic Patterns
  for (const pattern of COMMON_OFF_TOPIC_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        allowed: false,
        message: GUARDRAIL_REJECTION_MESSAGE,
        violationType: 'scope',
      };
    }
  }

  // 9. Vowelless non-tech token check
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
      return {
        allowed: false,
        message: GUARDRAIL_REJECTION_MESSAGE,
        violationType: 'scope',
      };
    }
  }

  return { allowed: true };
}

/**
 * Generates a warm, dynamic, contextual response for conversational questions,
 * greetings, and check-ins (e.g. "how are you?", "hello", "who are you?").
 */
export function generateGreetingResponse(
  question: string,
  analysis?: RepoAnalysis | null
): { text: string; thoughtProcess: string; referencedFiles: string[] } {
  const repoName = analysis?.metadata?.fullName || 'this repository';
  const entryPoint = analysis?.entryPoints?.[0];
  const totalFiles = analysis?.totalFiles;
  const lang = analysis?.metadata?.language;
  const tools = analysis?.detectedTools || [];
  const toolsStr = tools.slice(0, 3).join(', ');

  const statsSentence = totalFiles
    ? `I have indexed all **${totalFiles} files** across this ${lang ? `${lang} ` : ''}codebase${toolsStr ? ` (utilizing ${toolsStr})` : ''}.`
    : `I have analyzed the repository architecture and structural modules.`;

  const qLower = (question || '').toLowerCase().trim();

  let body = '';

  if (/how\s+are\s+(you|u)|how\s+r\s+u|how'?s\s+it\s+going|how'?s\s+everything|how\s+do\s+you\s+do|how'?s\s+your\s+day/i.test(qLower)) {
    body = `I'm doing great, thank you for asking! 😊 I'm fully primed and ready as your **DomoScope AI Assistant** for **${repoName}**.\n\n${statsSentence} Everything is ready for deep inspection—whether you want to trace system architecture, inspect database schemas, evaluate security findings${entryPoint ? `, or analyze entry points like \`${entryPoint}\`` : ''}, feel free to ask!`;
  } else if (/who\s+are\s+you|what\s+is\s+your\s+name|what\s+are\s+you|introduce\s+yourself|tell\s+me\s+about\s+yourself/i.test(qLower)) {
    body = `I am **DomoScope AI Assistant**, an intelligent software architecture and code inspection assistant dedicated to **${repoName}**.\n\n${statsSentence} I can guide you through the components, API routes, database schemas, security posture, or any specific file${entryPoint ? ` such as \`${entryPoint}\`` : ''}. What would you like to investigate?`;
  } else if (/what\s+can\s+you\s+do|help|how\s+can\s+you\s+help/i.test(qLower)) {
    body = `As your **DomoScope AI Assistant** for **${repoName}**, I can inspect and reverse-engineer any layer of this codebase.\n\n${statsSentence}\n\nYou can ask me to:\n- 🏗️ Trace high-level architecture and component dependencies\n- 🔌 Map API endpoints and HTTP route handlers\n- 🗄️ Inspect database schemas and data persistence models\n- 🛡️ Audit security posture and token exposure\n${entryPoint ? `- 📄 Deep-dive into specific files like \`${entryPoint}\`\n` : ''}\nWhat area would you like to start with?`;
  } else if (/thanks|thank\s+you|ty|thx|appreciate\s+it/i.test(qLower)) {
    body = `You're very welcome! 😊 Glad I could help. Let me know if you'd like to inspect another component, analyze API routes, or evaluate database tables in **${repoName}**!`;
  } else if (/good\s*morning|gm\b|mornin/i.test(qLower)) {
    body = `Good morning! ☀️ I'm your **DomoScope AI Assistant**, ready to inspect **${repoName}** with you.\n\n${statsSentence} What would you like to explore today?`;
  } else if (/good\s*afternoon/i.test(qLower)) {
    body = `Good afternoon! 🌤️ I'm your **DomoScope AI Assistant**, ready to dive into **${repoName}**.\n\n${statsSentence} How can I assist you with this codebase?`;
  } else if (/good\s*evening|gn\b/i.test(qLower)) {
    body = `Good evening! 🌙 I'm your **DomoScope AI Assistant**, ready to analyze **${repoName}**.\n\n${statsSentence} What would you like to inspect tonight?`;
  } else {
    body = `Hello! 👋 Glad to connect. I'm your **DomoScope AI Assistant**, specialized in analyzing **${repoName}**.\n\n${statsSentence} I'm loaded with the full context of this project${entryPoint ? ` (including entry points like \`${entryPoint}\`)` : ''}. How can I help you today?`;
  }

  const thoughtProcess = `1. Intent Recognition: Detected greeting / conversational inquiry ("${question}").
2. Context Retrieval: Target repository is "${repoName}" (${totalFiles || 'multiple'} files indexed).
3. Persona Alignment: DomoScope AI Assistant — conversational, helpful, and grounded in repository architecture.
4. Cognitive Formulation: Synthesizing dynamic response tailored to the developer's specific query.`;

  return {
    text: body,
    thoughtProcess,
    referencedFiles: entryPoint ? [entryPoint] : [],
  };
}
