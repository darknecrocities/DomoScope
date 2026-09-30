# 09 — Security Architecture & Cryptographic Vault

**Security Philosophy:** Zero Remote Egress • Hardware-Backed Encryption • Strict File Containment

---

## 1. Zero Remote Data Egress Guarantee

A fundamental architectural guarantee of DomoScope is that **no source code, AST metadata, file contents, or database credentials ever leave the local environment** during local scans.

```
+-------------------------------------------------------------------+
|                     User Local Environment                        |
|                                                                   |
|   +-----------------------+           +-----------------------+   |
|   |   Target Codebase     |           |   DomoScope CLI /     |   |
|   |   (Local Workspace)   +---------->+   Docker Container    |   |
|   +-----------------------+           +-----------+-----------+   |
|                                                   |               |
|                                       AST & Local Memory Only     |
|                                                   |               |
|                                                   v               |
|                                       +-----------------------+   |
|                                       |   Local Studio /      |   |
|                                       |   localhost:4004      |   |
|                                       +-----------------------+   |
+-------------------------------------------------------------------+
                                  X  NO CLOUD DATA EGRESS
                                  X  NO SOURCE TRANSMISSION
```

- When using `domoscope analyze`, `domoscope serve`, or `domoscope docs`, the entire pipeline runs in-process on Node.js.
- Local LLM inference (WebLLM) executes via WebGPU directly inside the user's browser, completely offline.

---

## 2. Hardware Cryptographic Token Vault (`cryptoService.ts`)

For remote GitHub repository inspection, users can optionally connect a GitHub Personal Access Token to increase their GitHub API rate limit from 60 to 5,000 requests/hour.

### Vault Encryption Mechanics:
1. **Algorithm:** AES-GCM (Galois/Counter Mode) with 256-bit symmetric keys.
2. **Key Derivation:** Web Cryptography API (`window.crypto.subtle`) hardware entropy.
3. **Initialization Vector (IV):** Cryptographically secure random 12-byte IV per encryption operation.
4. **Storage Medium:** Encrypted ciphertexts and IVs are persisted strictly in browser IndexedDB via `idb`. Tokens are never stored in plaintext `localStorage`.
5. **Session Decryption:** Tokens are decrypted in memory only when signing outgoing GitHub REST requests.

---

## 3. Filesystem Sandboxing & Path Containment (`localScanner.ts`, `localServer.ts`)

Because the local server serves files via `GET /api/local/file?path=...`, strict path containment guards are implemented:

```typescript
export async function isPathWithinRoot(targetPath: string, rootDir: string): Promise<boolean> {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(rootDir);

  // 1. Lexical boundary check
  if (!resolvedTarget.startsWith(resolvedRoot + path.sep) && resolvedTarget !== resolvedRoot) {
    return false;
  }

  // 2. Realpath check (resolves symlinks)
  try {
    const realTarget = await fsp.realpath(resolvedTarget);
    const realRoot = await fsp.realpath(resolvedRoot);
    return realTarget.startsWith(realRoot + path.sep) || realTarget === realRoot;
  } catch {
    // If target doesn't exist yet, verify parent directory
    const parentDir = path.dirname(resolvedTarget);
    const realParent = await fsp.realpath(parentDir);
    const realRoot = await fsp.realpath(resolvedRoot);
    return realParent.startsWith(realRoot + path.sep) || realParent === realRoot;
  }
}
```

- Prevents directory traversal attacks (`../../../../etc/passwd`).
- Validates real symlink targets to avoid symlink loop traps.
- Enforces an absolute 2MB per-file boundary to eliminate heap-out-of-memory denial of service.
