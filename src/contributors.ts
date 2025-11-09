export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  name?: string;
  bio?: string;
}

export class ContributorsService {
  private contributors: Contributor[] = [];
  private isLoading = false;
  private hasError = false;

  async fetchContributors(): Promise<Contributor[]> {
    if (this.contributors.length > 0) {
      return this.contributors;
    }

    this.isLoading = true;
    this.hasError = false;

    try {
      // Fetch contributors from GitHub API
      const response = await fetch(
        "https://api.github.com/repos/pranavgundu/Strategy-Board/contributors"
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      this.contributors = await response.json();

      // Fetch additional user details for top contributors
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

      // Update with detailed info
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

  getTopContributors(count: number = 10): Contributor[] {
    return this.contributors.slice(0, count);
  }

  isLoadingContributors(): boolean {
    return this.isLoading;
  }

  hasLoadError(): boolean {
    return this.hasError;
  }
}
