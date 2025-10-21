import { GET } from "@/db.ts";

const TBA_API_BASE = "https://www.thebluealliance.com/api/v3";

export interface TBAMatch {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: {
    red: {
      team_keys: string[];
    };
    blue: {
      team_keys: string[];
    };
  };
}

export interface TBASimpleMatch {
  matchName: string;
  redTeams: string[];
  blueTeams: string[];
}

export class TBAService {
  private apiKey: string | null = null;

  constructor() {}

  public async loadApiKey(): Promise<string | null> {
    const key = await GET("tbaApiKey", (e) => {
      console.error("Failed to load TBA API key:", e);
    });
    this.apiKey = typeof key === "string" ? key : null;
    return this.apiKey;
  }

  public setApiKey(key: string): void {
    this.apiKey = key;
  }

  public hasApiKey(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  private async makeRequest(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error("TBA API key not set");
    }

    const url = `${TBA_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "X-TBA-Auth-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `TBA API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  public async getTeamMatchesAtEvent(
    teamKey: string,
    eventKey: string,
  ): Promise<TBAMatch[]> {
    // Ensure team key is in correct format (frc1234)
    if (!teamKey.startsWith("frc")) {
      teamKey = `frc${teamKey}`;
    }

    const endpoint = `/team/${teamKey}/event/${eventKey}/matches`;
    return await this.makeRequest(endpoint);
  }

  public parseMatchesToSimple(matches: TBAMatch[]): TBASimpleMatch[] {
    // Sort matches by competition level and match number
    const sortedMatches = matches.sort((a, b) => {
      const levelOrder: { [key: string]: number } = {
        qm: 1,
        ef: 2,
        qf: 3,
        sf: 4,
        f: 5,
      };

      const levelA = levelOrder[a.comp_level] || 99;
      const levelB = levelOrder[b.comp_level] || 99;

      if (levelA !== levelB) {
        return levelA - levelB;
      }

      if (a.comp_level === "qm") {
        return a.match_number - b.match_number;
      }

      if (a.set_number !== b.set_number) {
        return a.set_number - b.set_number;
      }

      return a.match_number - b.match_number;
    });

    return sortedMatches.map((match) => {
      const matchName = this.formatMatchName(
        match.comp_level,
        match.set_number,
        match.match_number,
      );

      const redTeams = match.alliances.red.team_keys.map((key) =>
        key.replace("frc", ""),
      );
      const blueTeams = match.alliances.blue.team_keys.map((key) =>
        key.replace("frc", ""),
      );

      return {
        matchName,
        redTeams,
        blueTeams,
      };
    });
  }

  private formatMatchName(
    compLevel: string,
    setNumber: number,
    matchNumber: number,
  ): string {
    const levelNames: { [key: string]: string } = {
      qm: "Quals",
      ef: "Eighths",
      qf: "Quarters",
      sf: "Semis",
      f: "Finals",
    };

    const levelName = levelNames[compLevel] || compLevel.toUpperCase();

    if (compLevel === "qm") {
      return `${levelName} ${matchNumber}`;
    }

    return `${levelName} ${setNumber}-${matchNumber}`;
  }

  public async fetchAndParseTeamMatches(
    teamKey: string,
    eventKey: string,
  ): Promise<TBASimpleMatch[]> {
    const matches = await this.getTeamMatchesAtEvent(teamKey, eventKey);
    return this.parseMatchesToSimple(matches);
  }
}
