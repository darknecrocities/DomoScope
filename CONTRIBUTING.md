# Contributing to DomoScope

Thank you for your interest in contributing to DomoScope! DomoScope is a free, open-source GitHub repository inspection and visualization tool.

## Philosophy & Guidelines

1. **Monochrome Design System**: DomoScope uses a strict grayscale color palette (white, black, very light gray, dark gray). Please avoid introducing colors like purple, green, blue gradients, pink, or neon AI glow effects.
2. **No Emojis**: We use Lucide React icons instead of emojis throughout the UI.
3. **Simple, Human Language**: Avoid jargon such as AST, neural embeddings, or vector retrieval on the user-facing interface. Keep labels clear: Files, Project, Connections, Database, Branches, Security, Ask.
4. **Real Data**: No mock or fabricated data in production repository inspection flows.

## Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/darknecrocities/DomoScope.git
cd DomoScope

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Run tests
npx vitest run
```

## Pull Request Guidelines

1. Ensure all Vitest tests pass (`npx vitest run`).
2. Verify production build succeeds (`npm run build`).
3. Ensure no lint errors or regressions.
