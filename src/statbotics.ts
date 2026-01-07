const STATBOTICS_API_BASE = "https://api.statbotics.io/v3";

/** Prediction data from Statbotics for a match */
export interface StatboticsMatchPred {
  winner: string;
  red_win_prob: number;
  blue_win_prob?: number;
  red_score: number;
  blue_score: number;
}

/** Match result data from Statbotics */
export interface StatboticsMatchResult {
  winner: string;
  red_score: number;
  blue_score: number;
}

/** Match data from Statbotics API */
export interface StatboticsMatch {
  key: string;
  year: number;
  event: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  status: string;
  pred: StatboticsMatchPred;
  result: StatboticsMatchResult | null;
}

/** Team event data from Statbotics API including EPA metrics */
export interface StatboticsTeamEvent {
  team: number;
  year: number;
  event: string;
  epa: {
    total_points: {
      mean: number;
      sd: number;
    };
    unitless: number;
    norm: number;
  };
}

/** Team match data from Statbotics API */
export interface StatboticsTeamMatch {
  team: number;
  match: string;
  alliance: string;
  epa: number;
}

/** Compiled Statbotics data for display in the UI */
export interface StatboticsData {
  redWinProb: number;
  blueWinProb: number;
  redTeams: Array<{ team: string; epa: number }>;
  blueTeams: Array<{ team: string; epa: number }>;
  matchResult: string | null;
  redScore: number | null;
  blueScore: number | null;
}

/**
 * Service for interacting with the Statbotics API.
 * Provides EPA data and match predictions for FRC teams.
 */
export class StatboticsService {
  constructor() {}

  /**
   * Makes an authenticated request to the Statbotics API.
   *
   * @param endpoint - The API endpoint to call.
   * @returns The parsed JSON response.
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${STATBOTICS_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Statbotics API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Fetches match data from Statbotics API.
   *
   * @param matchKey - The TBA match key (e.g., "2024cmptx_qm1").
   * @returns Match data from Statbotics.
   */
  public async getMatch(matchKey: string): Promise<StatboticsMatch> {
    const endpoint = `/match/${matchKey}`;
    return await this.makeRequest<StatboticsMatch>(endpoint);
  }

  /**
   * Fetches team event data from Statbotics API.
   *
   * @param team - The team number.
   * @param event - The event key.
   * @returns Team event data from Statbotics.
   */
  public async getTeamEvent(
    team: number,
    event: string,
  ): Promise<StatboticsTeamEvent> {
    const endpoint = `/team_event/${team}/${event}`;
    return await this.makeRequest<StatboticsTeamEvent>(endpoint);
  }

  /**
   * Fetches team match data from Statbotics API.
   *
   * @param team - The team number.
   * @param matchKey - The TBA match key.
   * @returns Team match data from Statbotics.
   */
  public async getTeamMatch(
    team: number,
    matchKey: string,
  ): Promise<StatboticsTeamMatch> {
    const endpoint = `/team_match/${team}/${matchKey}`;
    return await this.makeRequest<StatboticsTeamMatch>(endpoint);
  }

  /**
   * Fetches all Statbotics data for a match including EPA for each team.
   *
   * @param matchKey - The TBA match key.
   * @param redTeams - Array of red team numbers.
   * @param blueTeams - Array of blue team numbers.
   * @returns Compiled Statbotics data for the match.
   */
  public async getMatchData(
    matchKey: string,
    redTeams: string[],
    blueTeams: string[],
  ): Promise<StatboticsData> {
    try {
      // Fetch match data for win probability and result
      const matchData = await this.getMatch(matchKey);
      
      // Extract event key from match key (e.g., "2024cmptx_qm1" -> "2024cmptx")
      const eventKey = matchKey.split("_")[0];

      // Fetch EPA for each team
      const redTeamData = await Promise.all(
        redTeams.filter((t) => t).map(async (team) => {
          try {
            const teamEvent = await this.getTeamEvent(
              parseInt(team),
              eventKey,
            );
            return { team, epa: teamEvent.epa.total_points.mean };
          } catch (error) {
            console.warn(`Failed to fetch EPA for team ${team}:`, error);
            return { team, epa: 0 };
          }
        }),
      );

      const blueTeamData = await Promise.all(
        blueTeams.filter((t) => t).map(async (team) => {
          try {
            const teamEvent = await this.getTeamEvent(
              parseInt(team),
              eventKey,
            );
            return { team, epa: teamEvent.epa.total_points.mean };
          } catch (error) {
            console.warn(`Failed to fetch EPA for team ${team}:`, error);
            return { team, epa: 0 };
          }
        }),
      );

      // Calculate win probabilities from pred
      const redWinProb = matchData.pred?.red_win_prob ?? 0;
      const blueWinProb = 1 - redWinProb;

      // Determine match result from result object
      let matchResult: string | null = null;
      let redScore: number | null = null;
      let blueScore: number | null = null;

      if (matchData.result) {
        redScore = matchData.result.red_score;
        blueScore = matchData.result.blue_score;
        if (matchData.result.winner === "red") {
          matchResult = "Red Wins";
        } else if (matchData.result.winner === "blue") {
          matchResult = "Blue Wins";
        } else if (matchData.result.winner === "tie") {
          matchResult = "Tie";
        }
      }

      return {
        redWinProb: redWinProb * 100,
        blueWinProb: blueWinProb * 100,
        redTeams: redTeamData,
        blueTeams: blueTeamData,
        matchResult,
        redScore,
        blueScore,
      };
    } catch (error) {
      console.error("Failed to fetch Statbotics data:", error);
      throw error;
    }
  }
}
