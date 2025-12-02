import { BUILD_COMMIT } from './build';

export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  name?: string;
  bio?: string;
}

export interface LastCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export class ContributorsService {
  private contributors: Contributor[] = [];
  private isLoading = false;
  private hasError = false;
  private lastCommit: LastCommit | null = null;

  async fetchContributors(): Promise<Contributor[]> {
    if (this.contributors.length > 0) {
      return this.contributors;
    }

    this.isLoading = true;
    this.hasError = false;

    try {
      // Fetch recent commits to get contributors sorted by recent activity
      const commitsResponse = await fetch(
        "https://api.github.com/repos/pranavgundu/Strategy-Board/commits?per_page=100"
      );

      if (!commitsResponse.ok) {
        throw new Error(`GitHub API error: ${commitsResponse.status}`);
      }

      const commits = await commitsResponse.json();

      // Extract unique contributors from recent commits, maintaining order of most recent activity
      const contributorMap = new Map<string, { login: string; avatar_url: string; html_url: string; lastCommitDate: string }>();

      for (const commit of commits) {
        if (commit.author && commit.author.login) {
          const login = commit.author.login;
          // Only add if not already in map (to keep the most recent commit date)
          if (!contributorMap.has(login)) {
            contributorMap.set(login, {
              login: commit.author.login,
              avatar_url: commit.author.avatar_url,
              html_url: commit.author.html_url,
              lastCommitDate: commit.commit.author.date,
            });
          }
        }
      }

      // Convert map to array (already sorted by recent activity due to commit order)
      const recentContributors = Array.from(contributorMap.values());

      // Fetch detailed information for contributors
      const detailedContributors = await Promise.all(
        recentContributors.slice(0, 10).map(async (contributor) => {
          try {
            const userResponse = await fetch(
              `https://api.github.com/users/${contributor.login}`
            );
            if (userResponse.ok) {
              const userData = await userResponse.json();
              return {
                login: contributor.login,
                avatar_url: contributor.avatar_url,
                html_url: contributor.html_url,
                contributions: 0, // Not relevant for recent contributors
                name: userData.name,
                bio: userData.bio,
              };
            }
          } catch (error) {
            console.error(`Error fetching user details for ${contributor.login}:`, error);
          }
          return {
            login: contributor.login,
            avatar_url: contributor.avatar_url,
            html_url: contributor.html_url,
            contributions: 0,
          };
        })
      );

      this.contributors = detailedContributors;
      return this.contributors;
    } catch (error) {
      console.error("Error fetching contributors:", error);
      this.hasError = true;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  getRecentContributors(count: number = 4): Contributor[] {
    return this.contributors.slice(0, count);
  }

  isLoadingContributors(): boolean {
    return this.isLoading;
  }

  hasLoadError(): boolean {
    return this.hasError;
  }

  async fetchLastCommit(): Promise<LastCommit | null> {
    if (this.lastCommit) {
      return this.lastCommit;
    }

    try {
      this.lastCommit = {
        sha: BUILD_COMMIT.sha,
        message: BUILD_COMMIT.message,
        author: BUILD_COMMIT.author,
        date: BUILD_COMMIT.date,
        url: BUILD_COMMIT.url,
      };
      return this.lastCommit;
    } catch (error) {
      console.error("Error getting build commit info:", error);
      return null;
    }
  }
}
