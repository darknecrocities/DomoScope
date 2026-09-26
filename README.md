# DomoScope

> Free and open-source GitHub repository inspection and visualization tool. Understand any project at a glance.

DomoScope lets developers paste any public GitHub repository URL and instantly explore its architecture, file relationships, dependencies, database ERD, branches, and security audit in a single unified workspace.

---

## Key Features

- **Interactive Architecture Graph**: Generates real directed dependency graphs from actual `import`, `require`, and module statements with automated hierarchical layout via Dagre and React Flow.
- **Database ERD Extraction**: Automatically parses Prisma schema files, SQL DDL migrations, and Drizzle definitions into interactive entity-relationship diagrams showing explicit and inferred table relationships.
- **Dependency Map**: Scans `package.json`, `requirements.txt`, `go.mod`, and `Cargo.toml`, and detects where packages are imported throughout the codebase.
- **Security Scanner**: In-browser static analysis detecting hardcoded API keys, private certificates, unsafe dynamic code execution (`eval`), command injection vulnerabilities, and raw SQL concatenation patterns.
- **Local AI Assistant (WebLLM)**: On-device repository assistant powered by MLC WebLLM with zero server roundtrips, no API keys, and deterministic grounded fallback.
- **Code Viewer & File Explorer**: Syntax-highlighted read-only viewer powered by Monaco Editor with word wrap, fullscreen mode, and file explanations.
- **Branch Inspection & Comparison**: Compares branches to display added, modified, and removed files along with database migration detections.
- **Fast IndexedDB Caching**: Persists repository trees, parsed graphs, and file contents locally for instant reload.
- **Strict Editorial Aesthetics**: Pure monochrome design system (white, black, grayscale) without neon colors, glowing gradients, or visual clutter.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Visualization**: `@xyflow/react`, `dagre`
- **Code Editor**: `@monaco-editor/react`
- **Local AI**: `@mlc-ai/web-llm` with WebGPU acceleration
- **Storage**: IndexedDB (`idb`)
- **Icons**: Lucide React
- **Testing**: Vitest

---

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node v22)
- npm or yarn

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/darknecrocities/DomoScope.git
cd DomoScope

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## Environment Variables (Optional)

DomoScope does not require any paid API keys or remote backend services.

GitHub’s unauthenticated public API limit is 60 requests/hour per IP address. To increase your limit to 5,000 requests/hour, you can optionally provide a personal access token in `.env` or directly through the in-app **Settings** modal:

```env
# .env
VITE_GITHUB_TOKEN=ghp_your_token_here
```

---

## Running Tests

DomoScope includes a comprehensive Vitest test suite covering URL parsing, import resolution, graph layout, database parsing, dependency detection, and security rules:

```bash
npx vitest run
```

---

## Deployment

DomoScope is fully optimized for Vercel, Netlify, or any static hosting platform:

```bash
npm run build
```

The output in `dist/` is deployable out of the box. A `vercel.json` rewrite configuration is included for client-side routing.

---

## Security & Privacy

- **Untrusted Code**: DomoScope never executes repository source code, npm scripts, or binaries.
- **Local Isolation**: Repository files, schemas, and AI prompts run client-side in the user's browser.
- **Prompt Injection Defense**: Repository content is sandboxed and marked strictly as reference data for the assistant.

---

## License

This project is licensed under the [MIT License](LICENSE).
