import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sanitizeRepoSlug } from '../services/github';

export interface OpenRepoItem {
  owner: string;
  repo: string;
}

const STORAGE_KEY = 'domoscope_open_repositories';

function loadStoredRepos(): OpenRepoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const sanitizedList: OpenRepoItem[] = [];
      const seen = new Set<string>();

      for (const item of parsed) {
        if (typeof item?.owner === 'string' && typeof item?.repo === 'string') {
          const owner = sanitizeRepoSlug(item.owner);
          const repo = sanitizeRepoSlug(item.repo);
          if (owner && repo) {
            const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              sanitizedList.push({ owner, repo });
            }
          }
        }
      }

      // If any entries were repaired or pruned, update localStorage immediately
      if (sanitizedList.length !== parsed.length) {
        saveStoredRepos(sanitizedList);
      }
      return sanitizedList;
    }
  } catch (e) {
    console.warn('Failed to parse open repositories from storage', e);
  }
  return [];
}

function saveStoredRepos(repos: OpenRepoItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(repos));
  } catch (e) {
    console.warn('Failed to save open repositories to storage', e);
  }
}

export function useOpenRepositories(rawOwner: string, rawRepo: string, activeTab?: string) {
  const navigate = useNavigate();
  const currentOwner = useMemo(() => sanitizeRepoSlug(rawOwner), [rawOwner]);
  const currentRepo = useMemo(() => sanitizeRepoSlug(rawRepo), [rawRepo]);

  const [openRepos, setOpenRepos] = useState<OpenRepoItem[]>(() => {
    const stored = loadStoredRepos();
    if (currentOwner && currentRepo) {
      const exists = stored.some(
        (r) =>
          r.owner.toLowerCase() === currentOwner.toLowerCase() &&
          r.repo.toLowerCase() === currentRepo.toLowerCase()
      );
      if (!exists) {
        const updated = [{ owner: currentOwner, repo: currentRepo }, ...stored];
        saveStoredRepos(updated);
        return updated;
      }
    }
    return stored.length > 0 ? stored : currentOwner && currentRepo ? [{ owner: currentOwner, repo: currentRepo }] : [];
  });

  // Keep openRepos in sync if route params change
  useEffect(() => {
    if (!currentOwner || !currentRepo) return;

    setOpenRepos((prev) => {
      const exists = prev.some(
        (r) =>
          r.owner.toLowerCase() === currentOwner.toLowerCase() &&
          r.repo.toLowerCase() === currentRepo.toLowerCase()
      );

      if (!exists) {
        const next = [...prev, { owner: currentOwner, repo: currentRepo }];
        saveStoredRepos(next);
        return next;
      }
      return prev;
    });
  }, [currentOwner, currentRepo]);

  // Add a repository and switch to it
  const addRepository = useCallback(
    (newOwner: string, newRepo: string) => {
      const cleanOwner = sanitizeRepoSlug(newOwner);
      const cleanRepo = sanitizeRepoSlug(newRepo);
      if (!cleanOwner || !cleanRepo) return;

      setOpenRepos((prev) => {
        const existingIdx = prev.findIndex(
          (r) =>
            r.owner.toLowerCase() === cleanOwner.toLowerCase() &&
            r.repo.toLowerCase() === cleanRepo.toLowerCase()
        );

        let updated: OpenRepoItem[];
        if (existingIdx !== -1) {
          updated = prev;
        } else {
          updated = [...prev, { owner: cleanOwner, repo: cleanRepo }];
        }
        saveStoredRepos(updated);
        return updated;
      });

      // Navigate to newly added repo, preserving active tab if reasonable
      const tabSegment = activeTab && activeTab !== 'overview' ? `/${activeTab}` : '';
      navigate(`/repository/${cleanOwner}/${cleanRepo}${tabSegment}`);
    },
    [navigate, activeTab]
  );

  // Switch to an already open repository
  const switchRepository = useCallback(
    (targetOwner: string, targetRepo: string) => {
      const cleanOwner = sanitizeRepoSlug(targetOwner);
      const cleanRepo = sanitizeRepoSlug(targetRepo);
      if (
        cleanOwner.toLowerCase() === currentOwner.toLowerCase() &&
        cleanRepo.toLowerCase() === currentRepo.toLowerCase()
      ) {
        return; // already active
      }
      const tabSegment = activeTab && activeTab !== 'overview' ? `/${activeTab}` : '';
      navigate(`/repository/${cleanOwner}/${cleanRepo}${tabSegment}`);
    },
    [currentOwner, currentRepo, activeTab, navigate]
  );

  // Close a repository tab
  const closeRepository = useCallback(
    (targetOwner: string, targetRepo: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }

      const cleanOwner = sanitizeRepoSlug(targetOwner);
      const cleanRepo = sanitizeRepoSlug(targetRepo);

      setOpenRepos((prev) => {
        const targetIndex = prev.findIndex(
          (r) =>
            r.owner.toLowerCase() === cleanOwner.toLowerCase() &&
            r.repo.toLowerCase() === cleanRepo.toLowerCase()
        );

        if (targetIndex === -1) return prev;

        const updated = prev.filter((_, idx) => idx !== targetIndex);
        saveStoredRepos(updated);

        // If closing the currently active repository
        const isClosingActive =
          targetOwner.toLowerCase() === currentOwner.toLowerCase() &&
          targetRepo.toLowerCase() === currentRepo.toLowerCase();

        if (isClosingActive) {
          if (updated.length > 0) {
            // Pick adjacent repository (previous or next)
            const nextIndex = Math.min(targetIndex, updated.length - 1);
            const nextRepo = updated[nextIndex];
            const tabSegment = activeTab && activeTab !== 'overview' ? `/${activeTab}` : '';
            navigate(`/repository/${nextRepo.owner}/${nextRepo.repo}${tabSegment}`);
          } else {
            // No repos left, return home
            navigate('/');
          }
        }

        return updated;
      });
    },
    [currentOwner, currentRepo, activeTab, navigate]
  );

  return {
    openRepos,
    addRepository,
    switchRepository,
    closeRepository,
  };
}
