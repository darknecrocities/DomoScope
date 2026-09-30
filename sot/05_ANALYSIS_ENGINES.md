# 05 — Core Analysis Engines

**Methodology:** Framework-Agnostic Deterministic AST Parsing  
**Memory Model:** In-Process AST Representation + Atomic JSON Cache  
**Safety Bounds:** Symlink Traversal Protection & 2MB File Ceiling  

---

## 1. Safe Ingestion & Incremental Cache Engine

Located in `src/services/local/localScanner.ts` and `src/services/local/localCacheManager.ts`.

### 1.1. Path Traversal & Symlink Resolution
Every file accessed by DomoScope undergoes double containment checking:
1. **Lexical Normalization:** Ensures `path.resolve(target)` starts with `path.resolve(rootDir)`.
2. **Realpath Resolution:** Uses `fs.realpath` to resolve any symbolic links. If the true underlying inode resides outside the project root, access is rejected immediately.

### 1.2. Incremental SHA-256 Hashing Algorithm
Rather than re-parsing entire projects on every change, DomoScope fingerprints each file:
```typescript
function computeFileHash(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
```
During re-analysis:
- If `file.sha256 === cachedFile.sha256`, the cached AST nodes, module imports, database tables, and API routes are preserved.
- Only added or modified files are run through the parser pipeline.
- Deleted files have their nodes purged and foreign key / import references re-indexed.

---

## 2. Polyglot Database & ERD Parser

Located in `src/services/databaseParser.ts`.

DomoScope extracts relational schemas into a unified abstract data model without requiring database connections or runtime ORM binaries:

### 2.1. Prisma Schema Engine (`schema.prisma`)
- Matches model blocks: `model\s+(\w+)\s*\{([^}]+)\}`.
- Parses field lines: `(\w+)\s+(\w+)(\[\])?(\?)?(\s+@.*)?`.
- Detects primary keys: `@id`, `@@id([...])`.
- Resolves foreign keys and relations:
  `@relation\s*\(\s*fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]\)`
  Maps table `User` -> table `Post` with foreign key `userId -> id`.

### 2.2. SQL DDL Parser (`*.sql`, migration files)
- Matches `CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"'\w\.]+)` across PostgreSQL, MySQL, and SQLite dialects.
- Extracts column types (`VARCHAR`, `INTEGER`, `BIGINT`, `BOOLEAN`, `UUID`, `TIMESTAMP`, `JSONB`).
- Identifies `PRIMARY KEY`, `NOT NULL`, `DEFAULT`, and inline or table-level `FOREIGN KEY (col) REFERENCES other_table(other_col)`.

### 2.3. Mongoose & MongoDB Engine
- Detects `new (?:mongoose\.)?Schema\(\s*\{([^;]+)\}\s*\)`.
- Extracts field keys, types (`String`, `Number`, `Date`, `ObjectId`), and reference links (`ref: 'User'`).

### 2.4. TypeORM & Sequelize Engine
- Identifies class decorators: `@Entity('table_name')`.
- Parses column decorators: `@Column()`, `@PrimaryGeneratedColumn('uuid')`, `@ManyToOne(() => OtherEntity)`.

---

## 3. API Route Discovery Catalog

Located in `src/services/apiRouteCatalog.ts`.

Scans source code files to discover API endpoints, methods, and line numbers:

### 3.1. Node.js & TypeScript Frameworks
- **Express & Fastify:**
  Regex: `(?:app|router|server)\.(get|post|put|delete|patch|all)\s*\(\s*['"\`]([^'"\`]+)['"\`]`
- **Next.js App Router (`app/**/route.ts`):**
  Regex: `export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH|HEAD)\s*\(`
  Maps file path `app/api/v1/users/[id]/route.ts` -> `/api/v1/users/:id`.
- **Next.js Pages Router (`pages/api/**/*.ts`):**
  Extracts exported default handlers and switch expressions on `req.method`.

### 3.2. Python Ecosystem
- **FastAPI / Flask:**
  Regex: `@(?:app|router|bp)\.(get|post|put|delete|patch|route)\s*\(\s*['"\`]([^'"\`]+)['"\`]`
- **Django REST Framework:**
  Parses `urlpatterns = [...]` and `path('endpoint/', ...)` declarations.

### 3.3. Go, Java, and Ruby Frameworks
- **Go Gin / Fiber:** `(?:r|app|api)\.(GET|POST|PUT|DELETE)\s*\(\s*"([^"]+)"`
- **Java Spring Boot:** `@(?:Get|Post|Put|Delete)Mapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']`
- **Rails:** `resources :users`, `get '/login', to: 'sessions#new'`

---

## 4. Security & Secret Leak Scanner

Located in `src/services/securityScanner.ts`.

Combines static regex matching with Shannon entropy analysis to detect hardcoded credentials before they reach production:

### 4.1. High-Entropy Scanner
Shannon entropy calculates information density to detect random strings typical of secret keys:
```typescript
function calculateShannonEntropy(str: string): number {
  const map: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    map[str[i]] = (map[str[i]] || 0) + 1;
  }
  let entropy = 0;
  for (const char in map) {
    const p = map[char] / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}
```
Strings with length > 24 and entropy > 4.5 are flagged as suspected secrets.

### 4.2. Pattern Catalog & Severity Ratings

| Severity | Risk Category | Pattern Checked |
|---|---|---|
| **CRITICAL** | Cloud Provider Credential | AWS Access Key (`AKIA[0-9A-Z]{16}`) |
| **CRITICAL** | VCS Access Token | GitHub PAT (`ghp_[0-9a-zA-Z]{36}`) |
| **CRITICAL** | Cryptographic Key | Private RSA/EC Keys (`BEGIN .*PRIVATE KEY`) |
| **HIGH** | Database Connection URI | Exposed password in `postgres://`, `mysql://`, `mongodb+srv://` |
| **HIGH** | Third-Party API Key | OpenAI (`sk-...`), Slack (`xoxb-...`), Stripe (`sk_live_...`) |
| **MEDIUM** | Hardcoded JWT Secret | Hardcoded signing secret strings in `jwt.sign(..., 'secret')` |
| **LOW** | Insecure Protocol | Plaintext HTTP endpoints used for sensitive actions |
