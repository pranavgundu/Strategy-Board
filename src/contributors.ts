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
  private teams: string[] = [];

  /**
   * Fetches team numbers from contributors.txt file.
   *
   * @returns Array of team numbers.
   */
  async fetchTeams(): Promise<string[]> {
    if (this.teams.length > 0) {
      return this.teams;
    }

    try {
      const response = await fetch('/contributors.txt');
      if (!response.ok) {
        throw new Error(`Failed to load contributors.txt: ${response.status}`);
      }
      const text = await response.text();
      this.teams = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      return this.teams;
    } catch (error) {
      console.error("Error fetching teams:", error);
      return [];
    }
  }

  /**
   * Fetches contributors from GitHub repository and caches the results.
   *
   * @returns Array of contributor information with details.
   * @throws Error if the GitHub API request fails.
   */
  async fetchContributors(): Promise<Contributor[]> {
    if (this.contributors.length > 0) {
      return this.contributors;
    }

    this.isLoading = true;
    this.hasError = false;

    try {
      // Fetch all contributors using the contributors API
      const contributorsResponse = await fetch(
        "https://api.github.com/repos/pranavgundu/Strategy-Board/contributors?per_page=100"
      );

      if (!contributorsResponse.ok) {
        throw new Error(`GitHub API error: ${contributorsResponse.status}`);
      }

      const contributorsData = await contributorsResponse.json();

      const detailedContributors = await Promise.all(
        contributorsData.map(async (contributor: any) => {
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
                contributions: contributor.contributions, 
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
            contributions: contributor.contributions,
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

  /**
   * Gets the most recent contributors from the cached list.
   *
   * @param count - Number of contributors to return. Defaults to 4.
   * @returns Array of the most recent contributors.
   */
  getRecentContributors(count: number = 4): Contributor[] {
    return this.contributors.slice(0, count);
  }

  /**
   * Checks if contributors are currently being loaded.
   *
   * @returns True if loading, false otherwise.
   */
  isLoadingContributors(): boolean {
    return this.isLoading;
  }

  /**
   * Checks if an error occurred during the last load attempt.
   *
   * @returns True if there was an error, false otherwise.
   */
  hasLoadError(): boolean {
    return this.hasError;
  }

  /**
   * Fetches the last commit information from build metadata.
   *
   * @returns The last commit information, or null if unavailable.
   */
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
