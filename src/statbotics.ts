export interface StatboticsMatch {
  key: string;
  year: number;
  event: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  match_name: string;
  time?: number;
  status?: string;
  alliances?: {
    red?: {
      team_keys: number[];
      surrogate_team_keys?: number[];
      dq_team_keys?: number[];
    };
    blue?: {
      team_keys: number[];
      surrogate_team_keys?: number[];
      dq_team_keys?: number[];
    };
  };
  pred?: {
    winner?: string;
    red_win_prob?: number;
    red_score?: number;
    blue_score?: number;
  };
  result?: {
    winner?: string;
    red_score?: number;
    blue_score?: number;
    red_no_foul?: number;
    blue_no_foul?: number;
  };
}

export interface StatboticsTeamMatch {
  team: number;
  match: string;
  alliance: string;
  epa_start?: number;
  epa_end?: number;
  epa_diff?: number;
  epa_pre_playoffs?: number;
}

export interface StatboticsTeamYear {
  team: number;
  year: number;
  name?: string;
  country?: string;
  state?: string;
  district?: string;
  rookie_year?: number;
  epa?: {
    total_points?: {
      mean?: number;
      sd?: number;
      unitless?: number;
      norm?: number;
    };
    breakdown?: {
      total_points?: number;
      auto_points?: number;
      teleop_points?: number;
      endgame_points?: number;
    };
    stats?: {
      start?: number;
      pre_champs?: number;
      max?: number;
    };
    ranks?: {
      total?: {
        rank?: number;
        percentile?: number;
        team_count?: number;
      };
    };
  };
  record?: {
    wins?: number;
    losses?: number;
    ties?: number;
    count?: number;
    winrate?: number;
  };
  district_points?: number;
  district_rank?: number;
}

export interface EPAPercentiles {
  p99: number;
  p90: number;
  p75: number;
  p25: number;
}

export interface StatboticsYear {
  year: number;
  percentiles: {
    total_points: EPAPercentiles;
    auto_points: EPAPercentiles;
    teleop_points: EPAPercentiles;
    endgame_points: EPAPercentiles;
  };
}

export interface StatboticsTeamEventData {
  team: number;
  teamName: string;
  totalEPA: number;
  autoEPA: number;
  teleopEPA: number;
  endgameEPA: number;
  rank: number | null;
  percentile: number | null;
}

export interface StatboticsMatchData {
  match: StatboticsMatch | null;
  redTeamEPAs: Map<number, number>;
  blueTeamEPAs: Map<number, number>;
  redWinProbability: number;
  blueWinProbability: number;
  redScore?: number;
  blueScore?: number;
  hasScores: boolean;
  teamDetails: Map<number, StatboticsTeamEventData>;
  yearData: StatboticsYear | null;
}

const STATBOTICS_API_BASE = "https://api.statbotics.io/v3";

export class StatboticsService {
  constructor() {}

  /**
   * Makes an HTTP request to the Statbotics API.
   *
   * @param endpoint - The API endpoint to request (e.g., "/match/2024ncwak_qm1")
   * @returns A promise that resolves to the JSON response data
   * @throws Will throw an error if the API request fails
   */
  private async makeRequest(endpoint: string): Promise<any> {
    const url = `${STATBOTICS_API_BASE}${endpoint}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        let errorMessage = response.statusText || "Unknown error";

        if (response.status === 500) {
          console.warn(
            `[Statbotics] Server error (500) for endpoint: ${endpoint}. The Statbotics API may be temporarily unavailable.`,
          );
          errorMessage =
            "Server error - Statbotics API may be temporarily unavailable";
        } else if (response.status === 404) {
          console.warn(
            `[Statbotics] Data not found (404) for endpoint: ${endpoint}`,
          );
          errorMessage = "Data not found";
        } else {
          console.error(
            "[Statbotics] API error:",
            response.status,
            response.statusText,
          );
        }

        throw new Error(
          `Statbotics API error: ${response.status} - ${errorMessage}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Statbotics API error")
      ) {
        throw error;
      }
      console.error("[Statbotics] Network or parsing error:", error);
      throw new Error("Failed to connect to Statbotics API");
    }
  }

  /**
   * Fetches a single match from Statbotics by match key.
   *
   * @param matchKey - The match key (e.g., "2024ncwak_qm1").
   * @returns The match data.
   */
  public async getMatch(matchKey: string): Promise<StatboticsMatch> {
    const endpoint = `/match/${matchKey}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Fetches team match data for a specific team and match.
   *
   * @param team - The team number.
   * @param matchKey - The match key.
   * @returns The team match data.
   */
  public async getTeamMatch(
    team: number,
    matchKey: string,
  ): Promise<StatboticsTeamMatch> {
    const endpoint = `/team_match/${team}/${matchKey}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Fetches team year data for a specific team and year.
   *
   * @param team - The team number.
   * @param year - The year.
   * @returns The team year data.
   */
  public async getTeamYear(
    team: number,
    year: number,
  ): Promise<StatboticsTeamYear> {
    const endpoint = `/team_year/${team}/${year}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Fetches year data including global EPA percentiles.
   *
   * @param year - The year.
   * @returns The year data with percentiles.
   */
  public async getYear(year: number): Promise<StatboticsYear> {
    const endpoint = `/year/${year}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Retrieves comprehensive match data including EPA ratings, win probabilities, and team details.
   * Aggregates data from multiple Statbotics API endpoints.
   *
   * @param matchKey - The TBA match key in format "yearEventKey_compLevel#"
   * @param redTeams - Array of three red alliance team numbers
   * @param blueTeams - Array of three blue alliance team numbers
   * @param year - The competition year (e.g., 2024)
   * @returns A promise that resolves to comprehensive match data with EPA ratings, win probabilities, and team statistics
   * @throws Will log warnings if some data cannot be fetched, but returns partial data when possible
   */
  public async getMatchData(
    matchKey: string,
    redTeams: number[],
    blueTeams: number[],
    year: number,
  ): Promise<StatboticsMatchData> {
    try {
      const redTeamEPAs = new Map<number, number>();
      const blueTeamEPAs = new Map<number, number>();
      const teamDetails = new Map<number, StatboticsTeamEventData>();

      let matchData: StatboticsMatch | null = null;
      try {
        matchData = await this.getMatch(matchKey);
      } catch (error) {
        if (error instanceof Error && error.message.includes("500")) {
          console.warn(
            `[Statbotics] Match data unavailable for ${matchKey} (server error). Calculating estimates from team EPA data.`,
          );
        } else {
          console.warn(
            `[Statbotics] Could not fetch match data for ${matchKey}. Using team EPA data for estimates.`,
            error instanceof Error ? error.message : error,
          );
        }
      }

      let yearData: StatboticsYear | null = null;
      try {
        yearData = await this.getYear(year);
      } catch (error) {
        console.error("[Statbotics] Failed to fetch year data:", error);
      }

      const redEPAPromises = redTeams.map((team) =>
        this.getTeamYear(team, year)
          .then((data) => {
            const epaData = data.epa || {};
            const totalPoints = epaData.total_points || {};
            const breakdown = epaData.breakdown || {};
            const epa =
              totalPoints.mean ||
              epaData.stats?.max ||
              epaData.stats?.start ||
              0;

            teamDetails.set(team, {
              team,
              teamName: data.name || `Team ${team}`,
              totalEPA: epa,
              autoEPA: breakdown.auto_points || 0,
              teleopEPA: breakdown.teleop_points || 0,
              endgameEPA: breakdown.endgame_points || 0,
              rank: epaData.ranks?.total?.rank || null,
              percentile: epaData.ranks?.total?.percentile || null,
            });

            return { team, epa };
          })
          .catch((err) => {
            console.error(`[Statbotics] Failed to fetch team ${team}:`, err);
            return { team, epa: 0 };
          }),
      );

      const blueEPAPromises = blueTeams.map((team) =>
        this.getTeamYear(team, year)
          .then((data) => {
            const epaData = data.epa || {};
            const totalPoints = epaData.total_points || {};
            const breakdown = epaData.breakdown || {};
            const epa =
              totalPoints.mean ||
              epaData.stats?.max ||
              epaData.stats?.start ||
              0;

            teamDetails.set(team, {
              team,
              teamName: data.name || `Team ${team}`,
              totalEPA: epa,
              autoEPA: breakdown.auto_points || 0,
              teleopEPA: breakdown.teleop_points || 0,
              endgameEPA: breakdown.endgame_points || 0,
              rank: epaData.ranks?.total?.rank || null,
              percentile: epaData.ranks?.total?.percentile || null,
            });

            return { team, epa };
          })
          .catch((err) => {
            console.error(`[Statbotics] Failed to fetch team ${team}:`, err);
            return { team, epa: 0 };
          }),
      );

      const redEPAResults = await Promise.all(redEPAPromises);
      const blueEPAResults = await Promise.all(blueEPAPromises);

      redEPAResults.forEach(({ team, epa }) => redTeamEPAs.set(team, epa));
      blueEPAResults.forEach(({ team, epa }) => blueTeamEPAs.set(team, epa));

      let redWinProb = 0.5;
      let blueWinProb = 0.5;
      let redScore: number | undefined;
      let blueScore: number | undefined;
      let hasScores = false;

      if (matchData) {
        redWinProb = matchData.pred?.red_win_prob || 0.5;
        blueWinProb = 1 - redWinProb;

        if (matchData.result) {
          redScore = matchData.result.red_score;
          blueScore = matchData.result.blue_score;
          hasScores = redScore !== undefined && blueScore !== undefined;
        }
      } else {
        const redEPASum = Array.from(redTeamEPAs.values()).reduce(
          (sum, epa) => sum + epa,
          0,
        );
        const blueEPASum = Array.from(blueTeamEPAs.values()).reduce(
          (sum, epa) => sum + epa,
          0,
        );
        const totalEPA = redEPASum + blueEPASum;
        if (totalEPA > 0) {
          redWinProb = redEPASum / totalEPA;
          blueWinProb = blueEPASum / totalEPA;
        }
      }

      const result = {
        match: matchData,
        redTeamEPAs,
        blueTeamEPAs,
        redWinProbability: redWinProb,
        blueWinProbability: blueWinProb,
        redScore: redScore,
        blueScore: blueScore,
        hasScores: hasScores,
        teamDetails: teamDetails,
        yearData: yearData,
      };

      return result;
    } catch (error) {
      console.error("[Statbotics] Error fetching Statbotics data:", error);
      throw error;
    }
  }

  /**
   * Constructs a match key from TBA event key and match name.
   *
   * @param eventKey - The TBA event key (e.g., "2024ncwak").
   * @param matchName - The match name (e.g., "Quals 1" or "Semis 1-2").
   * @returns The Statbotics match key (e.g., "2024ncwak_qm1").
   */
  public constructMatchKey(eventKey: string, matchName: string): string {
    const matchPart = matchName.split(" @ ")[0].trim();

    let compLevel = "";
    let matchNum = "";
    let setNum = "";

    if (matchPart.toLowerCase().includes("quals")) {
      compLevel = "qm";
      const num = matchPart.match(/\d+/);
      matchNum = num ? num[0] : "1";
    } else if (matchPart.toLowerCase().includes("eighths")) {
      compLevel = "ef";
      const parts = matchPart.match(/(\d+)-(\d+)/);
      if (parts) {
        setNum = parts[1];
        matchNum = parts[2];
      }
    } else if (matchPart.toLowerCase().includes("quarters")) {
      compLevel = "qf";
      const parts = matchPart.match(/(\d+)-(\d+)/);
      if (parts) {
        setNum = parts[1];
        matchNum = parts[2];
      }
    } else if (matchPart.toLowerCase().includes("semis")) {
      compLevel = "sf";
      const parts = matchPart.match(/(\d+)-(\d+)/);
      if (parts) {
        setNum = parts[1];
        matchNum = parts[2];
      }
    } else if (matchPart.toLowerCase().includes("finals")) {
      compLevel = "f";
      const parts = matchPart.match(/(\d+)-(\d+)/);
      if (parts) {
        setNum = parts[1];
        matchNum = parts[2];
      } else {
        const num = matchPart.match(/\d+/);
        matchNum = num ? num[0] : "1";
      }
    }

    if (setNum) {
      return `${eventKey}_${compLevel}${setNum}m${matchNum}`;
    } else {
      return `${eventKey}_${compLevel}${matchNum}`;
    }
  }
}
