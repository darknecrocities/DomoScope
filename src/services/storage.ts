import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { RepoAnalysis, RepoFile, DatabaseSchema, SecurityFinding, BranchInfo } from '../types';
import { CryptoService } from './cryptoService';

interface DomoScopeDB extends DBSchema {
  repositories: {
    key: string; // `${owner}/${repo}`
    value: {
      id: string;
      analysis: RepoAnalysis;
      cachedAt: number;
    };
  };
  fileTrees: {
    key: string; // `${owner}/${repo}@${branch}`
    value: {
      id: string;
      files: RepoFile[];
      cachedAt: number;
    };
  };
  fileContents: {
    key: string; // `${owner}/${repo}@${branch}:${path}`
    value: {
      key: string;
      content: string;
      cachedAt: number;
    };
  };
  databaseSchemas: {
    key: string; // `${owner}/${repo}@${branch}`
    value: {
      id: string;
      schema: DatabaseSchema;
      cachedAt: number;
    };
  };
  securityFindings: {
    key: string; // `${owner}/${repo}@${branch}`
    value: {
      id: string;
      findings: SecurityFinding[];
      cachedAt: number;
    };
  };
  branches: {
    key: string; // `${owner}/${repo}`
    value: {
      id: string;
      branches: BranchInfo[];
      cachedAt: number;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'domoscope_cache_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DomoScopeDB>> | null = null;

function getDB(): Promise<IDBPDatabase<DomoScopeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DomoScopeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('repositories')) {
          db.createObjectStore('repositories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('fileTrees')) {
          db.createObjectStore('fileTrees', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('fileContents')) {
          db.createObjectStore('fileContents', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('databaseSchemas')) {
          db.createObjectStore('databaseSchemas', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('securityFindings')) {
          db.createObjectStore('securityFindings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('branches')) {
          db.createObjectStore('branches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

export const StorageService = {
  async getAnalysis(owner: string, repo: string, branch?: string): Promise<RepoAnalysis | null> {
    try {
      const db = await getDB();
      const baseKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
      if (branch) {
        const branchKey = `${baseKey}@${branch.toLowerCase()}`;
        const branchRecord = await db.get('repositories', branchKey);
        if (branchRecord && Date.now() - branchRecord.cachedAt < 1000 * 60 * 60 * 24) {
          return branchRecord.analysis;
        }
      }
      const record = await db.get('repositories', baseKey);
      if (record && Date.now() - record.cachedAt < 1000 * 60 * 60 * 24) { // 24hr cache
        return record.analysis;
      }
      return null;
    } catch {
      return null;
    }
  },

  async saveAnalysis(owner: string, repo: string, analysis: RepoAnalysis, branch?: string): Promise<void> {
    try {
      const db = await getDB();
      const baseKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
      
      const isDefault =
        !branch ||
        (analysis.metadata.defaultBranch &&
          branch.toLowerCase() === analysis.metadata.defaultBranch.toLowerCase());

      if (isDefault) {
        await db.put('repositories', {
          id: baseKey,
          analysis,
          cachedAt: Date.now(),
        });
      }

      if (branch) {
        await db.put('repositories', {
          id: `${baseKey}@${branch.toLowerCase()}`,
          analysis,
          cachedAt: Date.now(),
        });
      }
    } catch (e) {
      console.warn('Storage saveAnalysis error:', e);
    }
  },

  async getFileTree(owner: string, repo: string, branch: string): Promise<RepoFile[] | null> {
    try {
      const db = await getDB();
      const key = `${owner.toLowerCase()}/${repo.toLowerCase()}@${branch.toLowerCase()}`;
      const record = await db.get('fileTrees', key);
      if (record && Date.now() - record.cachedAt < 1000 * 60 * 60 * 24) {
        return record.files;
      }
      return null;
    } catch {
      return null;
    }
  },

  async saveFileTree(owner: string, repo: string, branch: string, files: RepoFile[]): Promise<void> {
    try {
      const db = await getDB();
      const key = `${owner.toLowerCase()}/${repo.toLowerCase()}@${branch.toLowerCase()}`;
      await db.put('fileTrees', {
        id: key,
        files,
        cachedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Storage saveFileTree error:', e);
    }
  },

  async getFileContent(owner: string, repo: string, branch: string, path: string): Promise<string | null> {
    try {
      const db = await getDB();
      const key = `${owner.toLowerCase()}/${repo.toLowerCase()}@${branch}:${path}`;
      const record = await db.get('fileContents', key);
      return record?.content ?? null;
    } catch {
      return null;
    }
  },

  async saveFileContent(owner: string, repo: string, branch: string, path: string, content: string): Promise<void> {
    try {
      const db = await getDB();
      const key = `${owner.toLowerCase()}/${repo.toLowerCase()}@${branch}:${path}`;
      await db.put('fileContents', {
        key,
        content,
        cachedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Storage saveFileContent error:', e);
    }
  },

  async getDatabaseSchema(owner: string, repo: string, branch: string): Promise<DatabaseSchema | null> {
    try {
      const db = await getDB();
      const record = await db.get('databaseSchemas', `${owner.toLowerCase()}/${repo.toLowerCase()}@${branch}`);
      return record?.schema ?? null;
    } catch {
      return null;
    }
  },

  async saveDatabaseSchema(owner: string, repo: string, branch: string, schema: DatabaseSchema): Promise<void> {
    try {
      const db = await getDB();
      await db.put('databaseSchemas', {
        id: `${owner.toLowerCase()}/${repo.toLowerCase()}@${branch}`,
        schema,
        cachedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Storage saveDatabaseSchema error:', e);
    }
  },

  async getSecurityFindings(owner: string, repo: string, branch: string): Promise<SecurityFinding[] | null> {
    try {
      const db = await getDB();
      const record = await db.get('securityFindings', `${owner.toLowerCase()}/${repo.toLowerCase()}@${branch}`);
      return record?.findings ?? null;
    } catch {
      return null;
    }
  },

  async saveSecurityFindings(owner: string, repo: string, branch: string, findings: SecurityFinding[]): Promise<void> {
    try {
      const db = await getDB();
      await db.put('securityFindings', {
        id: `${owner.toLowerCase()}/${repo.toLowerCase()}@${branch}`,
        findings,
        cachedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Storage saveSecurityFindings error:', e);
    }
  },

  async getBranches(owner: string, repo: string): Promise<BranchInfo[] | null> {
    try {
      const db = await getDB();
      const record = await db.get('branches', `${owner.toLowerCase()}/${repo.toLowerCase()}`);
      return record?.branches ?? null;
    } catch {
      return null;
    }
  },

  async saveBranches(owner: string, repo: string, branches: BranchInfo[]): Promise<void> {
    try {
      const db = await getDB();
      await db.put('branches', {
        id: `${owner.toLowerCase()}/${repo.toLowerCase()}`,
        branches,
        cachedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Storage saveBranches error:', e);
    }
  },

  async clearRepoCache(owner: string, repo: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete('repositories', `${owner.toLowerCase()}/${repo.toLowerCase()}`);
      await db.delete('branches', `${owner.toLowerCase()}/${repo.toLowerCase()}`);
    } catch (e) {
      console.warn('Storage clearRepoCache error:', e);
    }
  },

  async clearAllRepoCaches(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear('repositories');
      await db.clear('fileTrees');
      await db.clear('fileContents');
      await db.clear('databaseSchemas');
      await db.clear('securityFindings');
      await db.clear('branches');
    } catch (e) {
      console.warn('Storage clearAllRepoCaches error:', e);
    }
  },

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const db = await getDB();
      const val = await db.get('settings', key);
      if (val === undefined) return defaultValue;

      // Transparent decryption for sensitive credentials
      if (key === 'github_token' && typeof val === 'string') {
        const decrypted = await CryptoService.decrypt(val);
        return (decrypted as unknown) as T;
      }

      if (key === 'ai_config' && val && typeof val === 'object') {
        const conf = { ...(val as any) };
        if (conf.openaiKey) conf.openaiKey = await CryptoService.decrypt(conf.openaiKey);
        if (conf.anthropicKey) conf.anthropicKey = await CryptoService.decrypt(conf.anthropicKey);
        if (conf.geminiKey) conf.geminiKey = await CryptoService.decrypt(conf.geminiKey);
        return (conf as unknown) as T;
      }

      return val as T;
    } catch {
      return defaultValue;
    }
  },

  async setSetting(key: string, value: any): Promise<void> {
    try {
      const db = await getDB();
      let storedValue = value;

      // Transparent encryption for sensitive credentials
      if (key === 'github_token' && typeof value === 'string' && value.trim() !== '') {
        storedValue = await CryptoService.encrypt(value.trim());
      } else if (key === 'ai_config' && value && typeof value === 'object') {
        const conf = { ...value };
        if (conf.openaiKey) conf.openaiKey = await CryptoService.encrypt(conf.openaiKey);
        if (conf.anthropicKey) conf.anthropicKey = await CryptoService.encrypt(conf.anthropicKey);
        if (conf.geminiKey) conf.geminiKey = await CryptoService.encrypt(conf.geminiKey);
        storedValue = conf;
      }

      await db.put('settings', storedValue, key);
    } catch (e) {
      console.warn('Storage setSetting error:', e);
    }
  },
};
