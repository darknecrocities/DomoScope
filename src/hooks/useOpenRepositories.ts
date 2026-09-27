import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
      return parsed.filter(
        (item): item is OpenRepoItem =>
          typeof item?.owner === 'string' &&
          typeof item?.repo === 'string' &&
          item.owner.trim().length > 0 &&
          item.repo.trim().length > 0
      );
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

export function useOpenRepositories(currentOwner: string, currentRepo: string, activeTab?: string) {
  const navigate = useNavigate();

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
      const cleanOwner = newOwner.trim();
      const cleanRepo = newRepo.trim();
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
      if (
        targetOwner.toLowerCase() === currentOwner.toLowerCase() &&
        targetRepo.toLowerCase() === currentRepo.toLowerCase()
      ) {
        return; // already active
      }
      const tabSegment = activeTab && activeTab !== 'overview' ? `/${activeTab}` : '';
      navigate(`/repository/${targetOwner}/${targetRepo}${tabSegment}`);
    },
    [currentOwner, currentRepo, activeTab, navigate]
  );

  // Close a repository tab
  const closeRepository = useCallback(
    (targetOwner: string, targetRepo: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }

      setOpenRepos((prev) => {
        const targetIndex = prev.findIndex(
          (r) =>
            r.owner.toLowerCase() === targetOwner.toLowerCase() &&
            r.repo.toLowerCase() === targetRepo.toLowerCase()
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
