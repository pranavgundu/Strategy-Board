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

export interface StatboticsTeamEventData {
  team: number;
  teamName: string;
  totalEPA: number;
  autoEPA: number;
  teleopEPA: number;
  endgameEPA: number;
  rank: number | null;
  percentile: number | null;
  autoPercentile: number | null;
  teleopPercentile: number | null;
  endgamePercentile: number | null;
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
}

const STATBOTICS_API_BASE = "https://api.statbotics.io/v3";

export class StatboticsService {
  constructor() {}

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `${STATBOTICS_API_BASE}${endpoint}`;
    console.log("[Statbotics] Fetching:", url);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        "[Statbotics] API error:",
        response.status,
        response.statusText,
      );
      throw new Error(
        `Statbotics API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("[Statbotics] Response:", data);
    return data;
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
   * Fetches comprehensive match data including EPAs for all teams.
   *
   * @param matchKey - The match key (e.g., "2024ncwak_qm1").
   * @param redTeams - Array of red alliance team numbers.
   * @param blueTeams - Array of blue alliance team numbers.
   * @param year - The competition year.
   * @returns Comprehensive match data with EPAs and predictions.
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

      // Try to fetch match data from Statbotics
      let matchData: StatboticsMatch | null = null;
      try {
        matchData = await this.getMatch(matchKey);
      } catch (error) {
        console.warn(
          "Could not fetch match from Statbotics, using provided team data",
          error,
        );
      }

      // Fetch EPA data for each team
      const redEPAPromises = redTeams.map((team) =>
        this.getTeamYear(team, year)
          .then((data) => {
            console.log(`[Statbotics] Team ${team} data:`, data);
            // EPA data is nested: epa.total_points.mean
            const epaData = data.epa || {};
            console.log(`[Statbotics] Team ${team} epa object:`, epaData);
            const totalPoints = epaData.total_points || {};
            const breakdown = epaData.breakdown || {};
            console.log(`[Statbotics] Team ${team} total_points:`, totalPoints);
            const epa =
              totalPoints.mean ||
              epaData.stats?.max ||
              epaData.stats?.start ||
              0;
            console.log(`[Statbotics] Team ${team} EPA: ${epa}`);

            // Store detailed data (percentiles will be calculated later)
            teamDetails.set(team, {
              team,
              teamName: data.name || `Team ${team}`,
              totalEPA: epa,
              autoEPA: breakdown.auto_points || 0,
              teleopEPA: breakdown.teleop_points || 0,
              endgameEPA: breakdown.endgame_points || 0,
              rank: epaData.ranks?.total?.rank || null,
              percentile: epaData.ranks?.total?.percentile || null,
              autoPercentile: null,
              teleopPercentile: null,
              endgamePercentile: null,
            });

            return { team, epa };
          })
          .catch((err) => {
            console.warn(
              `[Statbotics] Could not fetch EPA for team ${team}:`,
              err,
            );
            return { team, epa: 0 };
          }),
      );

      const blueEPAPromises = blueTeams.map((team) =>
        this.getTeamYear(team, year)
          .then((data) => {
            console.log(`[Statbotics] Team ${team} data:`, data);
            // EPA data is nested: epa.total_points.mean
            const epaData = data.epa || {};
            console.log(`[Statbotics] Team ${team} epa object:`, epaData);
            const totalPoints = epaData.total_points || {};
            const breakdown = epaData.breakdown || {};
            console.log(`[Statbotics] Team ${team} total_points:`, totalPoints);
            const epa =
              totalPoints.mean ||
              epaData.stats?.max ||
              epaData.stats?.start ||
              0;
            console.log(`[Statbotics] Team ${team} EPA: ${epa}`);

            // Store detailed data (percentiles will be calculated later)
            teamDetails.set(team, {
              team,
              teamName: data.name || `Team ${team}`,
              totalEPA: epa,
              autoEPA: breakdown.auto_points || 0,
              teleopEPA: breakdown.teleop_points || 0,
              endgameEPA: breakdown.endgame_points || 0,
              rank: epaData.ranks?.total?.rank || null,
              percentile: epaData.ranks?.total?.percentile || null,
              autoPercentile: null,
              teleopPercentile: null,
              endgamePercentile: null,
            });

            return { team, epa };
          })
          .catch((err) => {
            console.warn(
              `[Statbotics] Could not fetch EPA for team ${team}:`,
              err,
            );
            return { team, epa: 0 };
          }),
      );

      const redEPAResults = await Promise.all(redEPAPromises);
      const blueEPAResults = await Promise.all(blueEPAPromises);

      redEPAResults.forEach(({ team, epa }) => redTeamEPAs.set(team, epa));
      blueEPAResults.forEach(({ team, epa }) => blueTeamEPAs.set(team, epa));

      // Calculate per-stat percentiles by comparing all teams in this match
      const allTeamsData = Array.from(teamDetails.values());
      if (allTeamsData.length > 0) {
        // Collect all stat values
        const autoValues = allTeamsData
          .map((t) => t.autoEPA)
          .sort((a, b) => a - b);
        const teleopValues = allTeamsData
          .map((t) => t.teleopEPA)
          .sort((a, b) => a - b);
        const endgameValues = allTeamsData
          .map((t) => t.endgameEPA)
          .sort((a, b) => a - b);

        // Calculate percentile for each team's stats
        teamDetails.forEach((data, team) => {
          const autoRank = autoValues.filter((v) => v < data.autoEPA).length;
          const teleopRank = teleopValues.filter(
            (v) => v < data.teleopEPA,
          ).length;
          const endgameRank = endgameValues.filter(
            (v) => v < data.endgameEPA,
          ).length;

          data.autoPercentile =
            allTeamsData.length > 1
              ? autoRank / (allTeamsData.length - 1)
              : 0.5;
          data.teleopPercentile =
            allTeamsData.length > 1
              ? teleopRank / (allTeamsData.length - 1)
              : 0.5;
          data.endgamePercentile =
            allTeamsData.length > 1
              ? endgameRank / (allTeamsData.length - 1)
              : 0.5;

          console.log(
            `[Statbotics] Team ${team} percentiles - Auto: ${(data.autoPercentile * 100).toFixed(1)}%, Teleop: ${(data.teleopPercentile * 100).toFixed(1)}%, Endgame: ${(data.endgamePercentile * 100).toFixed(1)}%`,
          );
          console.log(
            `[Statbotics] Team ${team} values - Auto: ${data.autoEPA.toFixed(1)}, Teleop: ${data.teleopEPA.toFixed(1)}, Endgame: ${data.endgameEPA.toFixed(1)}`,
          );
        });
      }

      // Calculate win probabilities
      let redWinProb = 0.5;
      let blueWinProb = 0.5;
      let redScore: number | undefined;
      let blueScore: number | undefined;
      let hasScores = false;

      if (matchData) {
        // Win probability from predictions
        redWinProb = matchData.pred?.red_win_prob || 0.5;
        blueWinProb = 1 - redWinProb;

        // Get actual scores if match is complete
        if (matchData.result) {
          redScore = matchData.result.red_score;
          blueScore = matchData.result.blue_score;
          hasScores = redScore !== undefined && blueScore !== undefined;
        }
      } else {
        // Calculate simple win probability based on EPA sum if match data not available
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
        console.log("[Statbotics] Calculated win probabilities from EPA:", {
          redEPASum,
          blueEPASum,
          redWinProb,
          blueWinProb,
        });
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
      };

      console.log("[Statbotics] Final match data:", result);
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
    // Extract just the match part without event name
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
