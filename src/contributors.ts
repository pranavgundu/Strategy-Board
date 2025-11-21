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
      const response = await fetch(
        "https://api.github.com/repos/pranavgundu/Strategy-Board/contributors"
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      this.contributors = await response.json();

      const detailedContributors = await Promise.all(
        this.contributors.slice(0, 10).map(async (contributor) => {
          try {
            const userResponse = await fetch(
              `https://api.github.com/users/${contributor.login}`
            );
            if (userResponse.ok) {
              const userData = await userResponse.json();
              return {
                ...contributor,
                name: userData.name,
                bio: userData.bio,
              };
            }
          } catch (error) {
            console.error(`Error fetching user details for ${contributor.login}:`, error);
          }
          return contributor;
        })
      );

      detailedContributors.forEach((detailed, index) => {
        this.contributors[index] = detailed;
      });

      return this.contributors;
    } catch (error) {
      console.error("Error fetching contributors:", error);
      this.hasError = true;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  getTopContributors(count: number = 4): Contributor[] {
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
      // Use the build-time commit info
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
