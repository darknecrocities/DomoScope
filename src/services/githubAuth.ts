import { StorageService } from './storage';
import { GitHubService } from './github';

export interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
}

export const GitHubAuthService = {
  async getStoredToken(): Promise<string> {
    return StorageService.getSetting<string>('github_token', '');
  },

  async getUserProfile(): Promise<GitHubUserProfile | null> {
    const cachedProfile = await StorageService.getSetting<GitHubUserProfile | null>('github_user_profile', null);
    if (cachedProfile) {
      // Automatically purge legacy static 'developer' dummy account
      if (cachedProfile.login === 'developer') {
        await this.logout();
        return null;
      }
      GitHubService.setAuthenticatedQuota(5000);
      return cachedProfile;
    }

    const token = await this.getStoredToken();
    if (!token) return null;

    try {
      return await this.verifyAndStoreToken(token);
    } catch {
      return null;
    }
  },

  async verifyAndStoreToken(token: string): Promise<GitHubUserProfile> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      throw new Error('Please enter a valid GitHub Personal Access Token.');
    }

    const res = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${cleanToken}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Invalid GitHub Token. Please check your token permissions and try again.');
      }
      throw new Error(`GitHub API authentication failed (${res.status} ${res.statusText}).`);
    }

    const data = await res.json();
    const profile: GitHubUserProfile = {
      login: data.login,
      name: data.name || data.login,
      avatarUrl: data.avatar_url,
      htmlUrl: data.html_url,
      publicRepos: data.public_repos || 0,
    };

    GitHubService.setAuthenticatedQuota(5000);
    await StorageService.setSetting('github_token', cleanToken);
    await StorageService.setSetting('github_user_profile', profile);

    return profile;
  },

  async logout(): Promise<void> {
    await StorageService.setSetting('github_token', '');
    await StorageService.setSetting('github_user_profile', null);
    const limit = GitHubService.getRateLimit();
    if (limit) {
      limit.isAuthenticated = false;
    }
  },
};
