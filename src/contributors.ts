declare const __BUILD_COMMIT__: {
  sha: string;
  fullSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

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

  async fetchTeams(): Promise<string[]> {
    if (this.teams.length > 0) {
      return this.teams;
    }

    try {
      const response = await fetch("/contributors.txt");
      if (!response.ok) {
        throw new Error(`Failed to load contributors.txt: ${response.status}`);
      }
      const text = await response.text();
      this.teams = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      return this.teams;
    } catch (error) {
      console.error("Error fetching teams:", error);
      return [];
    }
  }

  async fetchContributors(): Promise<Contributor[]> {
    if (this.contributors.length > 0) {
      return this.contributors;
    }

    this.isLoading = true;
    this.hasError = false;

    try {
      const contributorsResponse = await fetch(
        "https://api.github.com/repos/pranavgundu/Strategy-Board/contributors?per_page=100",
      );

      if (!contributorsResponse.ok) {
        throw new Error(`GitHub API error: ${contributorsResponse.status}`);
      }

      const contributorsData = await contributorsResponse.json();

      const filteredContributors = contributorsData.filter(
        (contributor: any) =>
          contributor.login.toLowerCase() !== "dependabot[bot]" &&
          contributor.login.toLowerCase() !== "dependabot",
      );

      const detailedContributors = await Promise.all(
        filteredContributors.map(async (contributor: any) => {
          try {
            const userResponse = await fetch(
              `https://api.github.com/users/${contributor.login}`,
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
            console.error(
              `Error fetching user details for ${contributor.login}:`,
              error,
            );
          }
          return {
            login: contributor.login,
            avatar_url: contributor.avatar_url,
            html_url: contributor.html_url,
            contributions: contributor.contributions,
          };
        }),
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
        sha: __BUILD_COMMIT__.sha,
        message: __BUILD_COMMIT__.message,
        author: __BUILD_COMMIT__.author,
        date: __BUILD_COMMIT__.date,
        url: __BUILD_COMMIT__.url,
      };
      return this.lastCommit;
    } catch (error) {
      console.error("Error getting build commit info:", error);
      return null;
    }
  }
}
