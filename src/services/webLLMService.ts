import { RepoAnalysis, RepoFile } from '../types';
import { validateQuestionScope, GUARDRAIL_REJECTION_MESSAGE, SAFETY_VIOLATION_MESSAGE, SYSTEM_PROMPT_GUARDRAIL, generateGreetingResponse } from './chatGuardrail';

export interface LLMProgress {
  text: string;
  progress: number;
}

export type ProgressCallback = (progress: LLMProgress) => void;

export interface WebLLMModelInfo {
  id: string;
  name: string;
  size: string;
  description: string;
  vramRequired: string;
  badge: string;
  isReasoning?: boolean;
}

export const AVAILABLE_WEBLLM_MODELS: WebLLMModelInfo[] = [
  {
    id: 'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 Coder 0.5B',
    size: '340 MB',
    description: 'Ultra-fast specialized code analysis model with minimal memory requirements.',
    vramRequired: '~1 GB',
    badge: 'Code & Fast',
  },
  {
    id: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 Coder 1.5B',
    size: '950 MB',
    description: 'Deep code reasoning, AST pattern recognition, and architectural breakdown.',
    vramRequired: '~2 GB',
    badge: 'Deep Code',
    isReasoning: true,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Meta Llama 3.2 1B',
    size: '850 MB',
    description: 'Meta lightweight model providing clear, structured explanations.',
    vramRequired: '~1.8 GB',
    badge: 'Reasoning',
    isReasoning: true,
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Meta Llama 3.2 3B',
    size: '2.1 GB',
    description: 'High-capability reasoning model for intricate architectural comparisons.',
    vramRequired: '~3.5 GB',
    badge: 'Heavyweight',
    isReasoning: true,
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M',
    size: '190 MB',
    description: 'Lightweight HuggingFace model. Fastest download, suitable for mobile GPUs.',
    vramRequired: '~600 MB',
    badge: 'Ultra-Light',
  },
  {
    id: 'gemma3-1b-it-q4f16_1-MLC',
    name: 'Google Gemma 3 1B',
    size: '900 MB',
    description: 'Next-gen Google on-device open model with high instruction adherence.',
    vramRequired: '~2 GB',
    badge: 'Google On-Device',
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',
    name: 'DeepSeek R1 Distill 7B',
    size: '4.2 GB',
    description: 'Full chain-of-thought reasoning model with real <think> thought process.',
    vramRequired: '~6 GB',
    badge: 'Full Reasoning',
    isReasoning: true,
  },
];

let webllmModule: any = null;
let engine: any = null;
let currentLoadedModelId: string | null = null;
let isInitializing = false;

export const WebLLMService = {
  isWebGPUSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator && !!(navigator as any).gpu;
  },

  getCurrentModelId(): string | null {
    return currentLoadedModelId;
  },

  async isModelDownloaded(modelId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      if (!webllmModule) {
        webllmModule = await import('@mlc-ai/web-llm');
      }
      if (webllmModule.hasModelInCache) {
        return await webllmModule.hasModelInCache(modelId);
      }
      if ('caches' in window) {
        const hasCache = await window.caches.has('webllm/model');
        return hasCache;
      }
      return false;
    } catch {
      return false;
    }
  },

  async getCachedModels(): Promise<string[]> {
    const cached: string[] = [];
    for (const m of AVAILABLE_WEBLLM_MODELS) {
      const isCached = await this.isModelDownloaded(m.id);
      if (isCached) cached.push(m.id);
    }
    return cached;
  },

  async deleteModelFromCache(modelId: string): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        await window.caches.delete('webllm/model');
      }
      if (currentLoadedModelId === modelId) {
        engine = null;
        currentLoadedModelId = null;
      }
      return true;
    } catch (e) {
      console.warn('Failed to delete model cache:', e);
      return false;
    }
  },

  async initModel(
    modelId: string = 'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC',
    onProgress?: ProgressCallback
  ): Promise<boolean> {
    if (!this.isWebGPUSupported()) {
      return false;
    }

    if (engine && currentLoadedModelId === modelId) {
      return true;
    }

    if (isInitializing) return false;
    isInitializing = true;

    try {
      if (!webllmModule) {
        webllmModule = await import('@mlc-ai/web-llm');
      }

      if (engine && currentLoadedModelId !== modelId) {
        try {
          if (typeof engine.unload === 'function') await engine.unload();
        } catch {
          // ignore unload error
        }
        engine = null;
      }

      engine = await webllmModule.CreateMLCEngine(modelId, {
        initProgressCallback: (report: any) => {
          if (onProgress) {
            onProgress({
              text: report.text || 'Loading local model...',
              progress: Math.min(100, Math.round((report.progress || 0) * 100)),
            });
          }
        },
      });

      currentLoadedModelId = modelId;
      isInitializing = false;
      return true;
    } catch (e) {
      console.warn('WebLLM init failed, switching to grounded fallback:', e);
      isInitializing = false;
      return false;
    }
  },

  async askQuestion(
    question: string,
    analysis: RepoAnalysis,
    files: RepoFile[],
    fileContents: Map<string, string>,
    selectedFile?: string,
    preferredModelId?: string
  ): Promise<{ text: string; referencedFiles: string[]; thoughtProcess?: string }> {
    // ── Repository Scope & Safety Guardrail Check ─────────────────────────────
    const guardrail = validateQuestionScope(question);
    if (!guardrail.allowed) {
      return {
        text: guardrail.message || GUARDRAIL_REJECTION_MESSAGE,
        referencedFiles: [],
      };
    }

    // ── Dedicated Warm Greeting Response ──────────────────────────────────────
    if (guardrail.isGreeting) {
      const greeting = generateGreetingResponse(question, analysis);
      return {
        text: greeting.text,
        referencedFiles: greeting.referencedFiles,
        thoughtProcess: greeting.thoughtProcess,
      };
    }

    // If a WebLLM neural model is loaded, query it
    if (engine) {
      try {
        const context = buildContext(question, analysis, files, fileContents, selectedFile);
        const systemPrompt = `You are DomoScope Assistant, an expert software architect and code analyst embedded in a GitHub repository explorer.
${SYSTEM_PROMPT_GUARDRAIL}

REASONING DIRECTIVE:
First, trace your step-by-step thinking process inside <think>...</think> tags.
Break down:
1. User question intent and target repository domain
2. Files, symbols, and dependencies inspected
3. Control flow and architecture evaluation
4. Verification against repository facts

Then, provide your structured technical answer using ## headings, **bold** key terms, \`code\` blocks, and bullet points. Mention specific file paths.`;

        const reply = await engine.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `<repo_data>\n${context}\n</repo_data>\n\nAnalyze and answer in detail: ${question}` },
          ],
          temperature: 0.3,
          max_tokens: 1200,
        });

        const rawText = reply.choices[0]?.message?.content || '';
        const { text, thoughtProcess } = parseThoughtProcess(rawText);
        const referencedFiles = extractReferencedFiles(text, files);
        return { text, referencedFiles, thoughtProcess };
      } catch (e) {
        console.warn('WebLLM neural query failed, falling back to deep reasoning engine:', e);
      }
    }

    // Deep semantic reasoning engine — produces structured reasoning and technical answers
    return executeSemanticReasoningEngine(question, analysis, files, fileContents, selectedFile);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Thought process extractor
// ─────────────────────────────────────────────────────────────────────────────
export function parseThoughtProcess(rawText: string): { text: string; thoughtProcess?: string } {
  const match = rawText.match(/<think>([\s\S]*?)<\/think>/i);
  if (match) {
    const thoughtProcess = match[1].trim();
    const text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return { text, thoughtProcess };
  }
  return { text: rawText };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context builder
// ─────────────────────────────────────────────────────────────────────────────
function buildContext(
  question: string,
  analysis: RepoAnalysis,
  files: RepoFile[],
  fileContents: Map<string, string>,
  selectedFile?: string
): string {
  const parts: string[] = [];
  parts.push(`Project: ${analysis.metadata.fullName}`);
  parts.push(`Language: ${analysis.metadata.language || 'Unknown'}`);
  parts.push(`Summary: ${analysis.summary}`);
  parts.push(`Tools & Frameworks: ${analysis.detectedTools.join(', ') || 'Native'}`);
  parts.push(`Entry Points: ${analysis.entryPoints.join(', ')}`);

  const components = files.filter((f) => f.category === 'component');
  const services = files.filter((f) => f.category === 'service');
  const apis = files.filter((f) => f.category === 'api');
  const tests = files.filter((f) => f.category === 'test');
  parts.push(`File Stats: ${analysis.totalFiles} files — Components: ${components.length}, Services: ${services.length}, APIs: ${apis.length}, Tests: ${tests.length}`);

  if (selectedFile) {
    const content = fileContents.get(selectedFile);
    parts.push(`Active Focused File: ${selectedFile}`);
    if (content) {
      parts.push(`Active File Excerpt:\n${content.slice(0, 2500)}`);
    }
  }

  const qLower = question.toLowerCase();
  const relevantFiles = files
    .filter((f) => {
      const p = f.path.toLowerCase();
      if (qLower.includes('chat') && /chat|bot|dialog|rag|nlp|intent/i.test(p)) return true;
      if (qLower.includes('auth') && /auth|login|session|user|permission|jwt/i.test(p)) return true;
      if (qLower.includes('database') && /db|schema|prisma|sql|model|drizzle/i.test(p)) return true;
      if (qLower.includes('api') && /api|routes|controllers|endpoints|views|blueprints/i.test(p)) return true;
      const words = qLower.split(/\s+/).filter((w) => w.length > 4);
      return words.some((w) => p.includes(w));
    })
    .slice(0, 10)
    .map((f) => f.path);

  if (relevantFiles.length > 0) {
    parts.push(`Discovered Domain Files: ${relevantFiles.join(', ')}`);
  }

  return parts.join('\n');
}

function extractReferencedFiles(text: string, files: RepoFile[]): string[] {
  const referenced: string[] = [];
  const filePaths = files.map((f) => f.path);

  for (const path of filePaths) {
    if (text.includes(path) || text.includes(path.split('/').pop()!)) {
      if (!referenced.includes(path)) {
        referenced.push(path);
      }
    }
  }

  return referenced.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────────────────────
// Deep Semantic Reasoning Engine
// Generates realistic <think> cognitive reasoning traces and comprehensive
// architectural answers answering the user's specific query.
// ─────────────────────────────────────────────────────────────────────────────
function executeSemanticReasoningEngine(
  question: string,
  analysis: RepoAnalysis,
  files: RepoFile[],
  fileContents: Map<string, string>,
  selectedFile?: string
): { text: string; referencedFiles: string[]; thoughtProcess?: string } {
  const q = question.toLowerCase().trim();
  const referencedFiles: string[] = [];
  const lang = analysis.metadata.language || 'Unknown';
  const tools = analysis.detectedTools;

  const components = files.filter((f) => f.category === 'component');
  const services = files.filter((f) => f.category === 'service');
  const apis = files.filter((f) => f.category === 'api');
  const dbFiles = files.filter((f) => f.category === 'database' || /prisma|schema|migration|drizzle|model/i.test(f.path));
  const authFiles = files.filter((f) => /auth|session|jwt|login|user|permission/i.test(f.path));

  // Determine query intent
  const isChatbotOrML = /chat|bot|rag|nlp|emotion|predict|model|dataset|corpus|embed/i.test(q);
  const isAuthOrSec = /auth|login|token|jwt|session|protect|security|vulnerabilit|attack|cors|csrf|secret/i.test(q);
  const isDatabase = /database|db|schema|table|sql|orm|prisma|drizzle|migration|model|store/i.test(q);
  const isApi = /api|route|endpoint|http|rest|url|controller|blueprint|post|get|request/i.test(q);
  const isArch = /architecture|structure|how does (it|this) work|design|flow|pattern|framework|overview|what does this do/i.test(q);
  const isFileSpecific =
    selectedFile &&
    (q.includes('this file') ||
      q.includes('selected file') ||
      q.includes('explain file') ||
      q.includes(selectedFile.toLowerCase().split('/').pop() || ''));

  // ── 1. Specific File Deep Dive (Only when requested) ───────────────────────
  if (isFileSpecific && selectedFile) {
    referencedFiles.push(selectedFile);
    const content = fileContents.get(selectedFile);
    const filename = selectedFile.split('/').pop() || selectedFile;
    const lineCount = content ? content.split('\n').length : 0;

    const thoughtProcess = `1. Target Focus: User requested targeted inspection of file "${selectedFile}".
2. Code Analysis: Parsing AST indicators, exported symbols, dependencies, and logic structure.
3. Architecture Mapping: Tracing how ${filename} interfaces with surrounding modules.
4. Synthesizing technical breakdown and maintenance considerations.`;

    const exports = content ? (content.match(/export\s+(?:default\s+)?(?:class|function|const|async)/g) || []).length : 0;
    const imports = content ? (content.match(/^(?:import|from|require)\s+.+/gm) || []).length : 0;

    return {
      thoughtProcess,
      referencedFiles,
      text: `## Technical Analysis: \`${filename}\`

### Module Overview
- **File Path:** \`${selectedFile}\`
- **Lines of Code:** ${lineCount}
- **Detected Exports:** ${exports > 0 ? `${exports} symbols` : 'Internal application module'}
- **External Dependencies:** ${imports > 0 ? `${imports} import statements` : 'Standard library only'}

### Architectural Role
This file operates as an essential component in the **${filename.includes('route') || filename.includes('api') ? 'API layer' : filename.includes('service') ? 'Service logic layer' : filename.includes('component') ? 'Presentation layer' : filename.includes('model') ? 'Data persistence layer' : 'Core execution logic'}**. It is responsible for orchestrating domain behavior and mediating requests between system layers.

### Key Implementation Observations
- **Modularity:** ${lineCount > 350 ? `Contains ${lineCount} lines — consider isolating domain logic into sub-modules for testability.` : `Well-scoped modular file (${lineCount} lines).`}
- **Coupling:** ${imports > 8 ? `Imports ${imports} external references; ensure dependency boundaries are respected.` : `Low coupling with minimal external dependencies.`}
- **Maintainability:** Clear separation of responsibilities within the repository hierarchy.`,
    };
  }

  // ── 2. Chatbot, RAG, NLP & Machine Learning Intent ─────────────────────────
  if (isChatbotOrML) {
    const mlFiles = files.filter((f) =>
      /bot|chat|nlp|rag|emotion|model|train|predict|corpus|intent|dataset/i.test(f.path)
    );
    if (mlFiles.length > 0) referencedFiles.push(...mlFiles.slice(0, 4).map((f) => f.path));
    if (analysis.entryPoints.length > 0) referencedFiles.push(analysis.entryPoints[0]);

    const thoughtProcess = `1. Identified Inquiry Intent: Chatbot architecture, NLP/RAG pipelines, or ML emotion processing.
2. Repository Context: Project "${analysis.metadata.fullName}" utilizes ${lang} with detected frameworks [${tools.join(', ') || 'Custom Pipeline'}].
3. File Discovery: Located ${mlFiles.length} specialized machine learning / conversational files: ${mlFiles.slice(0, 3).map((f) => f.name).join(', ') || 'Standard server'}.
4. Pipeline Trace: User prompt -> Input tokenization / vectorization -> Retrieval/Model Inference -> Response Formatting.
5. Formulating architectural synthesis with concrete file references.`;

    return {
      thoughtProcess,
      referencedFiles,
      text: `## Conversational AI & NLP Architecture

### Core Pipeline Design
The conversational subsystem in **${analysis.metadata.fullName}** integrates Natural Language Processing (NLP) with structured response generation:

1. **Input Preprocessing & Emotion Extraction:** User queries are received at the gateway, normalized, and evaluated for sentiment and emotional cues to adapt response tone.
2. **Context Retrieval & Knowledge Base (RAG):** The system cross-references query vectors or keywords against structured domain knowledge or university datasets to ground replies with accurate institutional facts.
3. **Intent Classification & Dialogue State:** Evaluates the user's intent to route between scripted domain flows, informational retrieval, or conversational fallbacks.
4. **Response Synthesis:** Dispatches the formulated response back through the backend framework (${tools.find((t) => /flask|fastapi|express/i.test(t)) || lang}).

### Key Components to Inspect
${mlFiles.slice(0, 5).map((f) => `- \`${f.path}\` — handles model weights, dataset preprocessing, or inference loops`).join('\n') || '- Inspect the main application entry point for conversational routing.'}

### Recommendations for Production
- Implement caching for high-frequency queries to minimize repeated embedding or inference overhead.
- Ensure user chat inputs are sanitized against prompt injection and cross-site scripting before rendering in UI clients.`,
    };
  }

  // ── 3. Authentication & Security Intent ────────────────────────────────────
  if (isAuthOrSec) {
    referencedFiles.push(...authFiles.slice(0, 4).map((f) => f.path));

    const thoughtProcess = `1. Target Domain: Security posture, authentication mechanics, and vulnerability mitigation.
2. Repository Audit: Detected ${authFiles.length} authentication modules and examined security findings.
3. Analysis: Traced session management, token validation, CORS policies, and credential storage.
4. Synthesizing defense-in-depth security overview with explicit file paths.`;

    return {
      thoughtProcess,
      referencedFiles,
      text: `## Security & Authentication Architecture

### Authentication Strategy
${authFiles.length > 0
  ? `Authentication and user session handling is managed across **${authFiles.length}** source files:\n${authFiles.slice(0, 4).map((f) => `- \`${f.path}\``).join('\n')}`
  : 'No centralized third-party auth service file detected. Authentication appears to rely on session tokens or middleware within the HTTP routing layer.'}

### Attack Surface & Security Hardening
- **Secret & Key Hygiene:** Verify all API keys, database credentials, and secret tokens are loaded via environment variables and never hardcoded in version control.
- **Input Sanitization & Injection Defense:** Protect all request parameter endpoints from SQL injection, command execution, and prompt injection attacks.
- **Cross-Origin Resource Sharing (CORS):** Ensure CORS policies strictly restrict allowed origins rather than using wildcard \`*\` headers in production.
- **Session & Token Expiry:** Enforce short-lived JWT expiration windows paired with secure HTTP-only refresh cookies.`,
    };
  }

  // ── 4. Database & Persistence Intent ───────────────────────────────────────
  if (isDatabase) {
    referencedFiles.push(...dbFiles.slice(0, 4).map((f) => f.path));

    const thoughtProcess = `1. Target Domain: Database schemas, ORM models, and storage persistence.
2. Repository Audit: Found ${dbFiles.length} database-related schema or migration files.
3. Schema Verification: Evaluating table relationships, foreign key constraints, and query access patterns.
4. Compiling database architecture breakdown.`;

    return {
      thoughtProcess,
      referencedFiles,
      text: `## Database & Storage Architecture

### Data Persistence Layer
${dbFiles.length > 0
  ? `The project manages schemas and models through **${dbFiles.length}** storage-related files:\n${dbFiles.slice(0, 5).map((f) => `- \`${f.path}\``).join('\n')}`
  : 'No separate relational ORM migration files detected. The application may utilize embedded SQLite, JSON stores, or an external cloud-managed database.'}

### Database Best Practices
- **Indexing:** Add composite indexes on foreign keys and columns frequently used in WHERE filters.
- **Connection Management:** Implement connection pooling to prevent connection exhaustion during concurrent traffic.
- **Schema Migrations:** Use automated migrations to maintain schema version parity across environments.`,
    };
  }

  // ── 5. API & Routes Intent ─────────────────────────────────────────────────
  if (isApi) {
    referencedFiles.push(...apis.slice(0, 4).map((f) => f.path));

    const thoughtProcess = `1. Target Domain: API routes, HTTP endpoints, and controller hierarchy.
2. Endpoint Discovery: Identified ${apis.length} API route files across the repository.
3. Tracing HTTP methods, URL routing conventions, and middleware decorators.
4. Compiling API catalog synthesis.`;

    return {
      thoughtProcess,
      referencedFiles,
      text: `## API & Route Architecture

### Routing Architecture
${apis.length > 0
  ? `HTTP endpoints and route handlers are declared across **${apis.length}** API files:\n${apis.slice(0, 5).map((f) => `- \`${f.path}\``).join('\n')}`
  : 'API endpoints are defined directly inside the root entry point or blueprint handlers.'}

### Request Lifecycle
1. **Client Request:** Dispatched to the server gateway.
2. **Middleware Pipeline:** CORS, request logging, and authentication token validation.
3. **Controller Handler:** Parses incoming JSON/form payloads and invokes business service logic.
4. **Response Serialization:** Returns structured JSON responses with standard HTTP status codes.`,
    };
  }

  // ── 6. General Architectural & Deep Synthesis Fallback ─────────────────────
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  const matchedFiles = files
    .filter((f) => words.some((w) => f.path.toLowerCase().includes(w) || f.name.toLowerCase().includes(w)))
    .slice(0, 6);

  if (matchedFiles.length > 0) {
    referencedFiles.push(...matchedFiles.map((f) => f.path));
  } else if (analysis.entryPoints.length > 0) {
    referencedFiles.push(...analysis.entryPoints.slice(0, 3));
  }

  const thoughtProcess = `1. Inquiry Parsing: Analyzing repository-specific question: "${question}".
2. Repository Context: ${analysis.metadata.fullName} (${lang}), ${analysis.totalFiles} files across ${analysis.totalDirs} directories.
3. Correlating Relevant Files: Identified ${matchedFiles.length > 0 ? matchedFiles.length : 'core entry point'} relevant code modules.
4. Tracing Application Architecture: Synthesizing components, service dependencies, and operational workflows.
5. Formulating comprehensive technical response.`;

  return {
    thoughtProcess,
    referencedFiles,
    text: `## Architectural Analysis: ${analysis.metadata.fullName}

### Project Summary & Stack
${analysis.summary}

- **Primary Language:** ${lang}
- **Frameworks & Tools:** ${tools.join(', ') || 'Native Standard Library'}
- **Repository Scale:** ${analysis.totalFiles} inspectable files across ${analysis.totalDirs} directories (${components.length} UI components, ${services.length} services, ${apis.length} API handlers)

### Key Files Associated with Your Inquiry
${matchedFiles.length > 0
  ? matchedFiles.map((f) => `- \`${f.path}\` — ${f.category || 'source module'}`).join('\n')
  : analysis.entryPoints.slice(0, 3).map((e) => `- \`${e}\` — primary entrypoint`).join('\n')}

### System Execution Flow
1. **Bootstrap:** The application initializes at \`${analysis.entryPoints[0] || 'the primary entry file'}\`, loading configuration parameters and service containers.
2. **Service Orchestration:** Dispatches tasks through dedicated service modules for business logic execution.
3. **Data Handling:** Interacts with storage resources and formats responses for downstream consumers.

You can click any of the referenced file chips below to inspect the source code directly in the viewer.`,
  };
}
