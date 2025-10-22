import { GET } from "@/db.ts";
import { Config } from "@/config.ts";

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

export interface TBAEvent {
  key: string;
  name: string;
  event_code: string;
  event_type: number;
  start_date: string;
  end_date: string;
  year: number;
  city?: string;
  state_prov?: string;
  country?: string;
}

export interface TBASimpleEvent {
  key: string;
  name: string;
  location: string;
  dateRange: string;
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

    // If no user API key, use shared key
    if (!this.apiKey && Config.sharedTBAApiKey) {
      this.apiKey = Config.sharedTBAApiKey;
    }

    return this.apiKey;
  }

  public setApiKey(key: string): void {
    this.apiKey = key;
  }

  public hasApiKey(): boolean {
    // Check if we have user key or shared key
    return (
      (this.apiKey !== null && this.apiKey.length > 0) ||
      (Config.sharedTBAApiKey && Config.sharedTBAApiKey.length > 0)
    );
  }

  private async makeRequest(endpoint: string): Promise<any> {
    // Use user API key if set, otherwise use shared key
    const apiKey = this.apiKey || Config.sharedTBAApiKey;

    if (!apiKey) {
      throw new Error("TBA API key not set");
    }

    const url = `${TBA_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "X-TBA-Auth-Key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `TBA API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  public async getEvents(year: number): Promise<TBAEvent[]> {
    const endpoint = `/events/${year}`;
    return await this.makeRequest(endpoint);
  }

  public async getTeamsAtEvent(eventKey: string): Promise<string[]> {
    const endpoint = `/event/${eventKey}/teams/keys`;
    return await this.makeRequest(endpoint);
  }

  public parseEventsToSimple(events: TBAEvent[]): TBASimpleEvent[] {
    // Sort by start date (most recent first)
    const sortedEvents = events.sort((a, b) => {
      return (
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );
    });

    return sortedEvents.map((event) => {
      // Format location
      let location = "";
      if (event.city && event.state_prov) {
        location = `${event.city}, ${event.state_prov}`;
      } else if (event.city) {
        location = event.city;
      } else if (event.state_prov) {
        location = event.state_prov;
      }
      if (event.country && event.country !== "USA") {
        location += `, ${event.country}`;
      }

      // Format date range
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      const dateRange = this.formatDateRange(startDate, endDate);

      return {
        key: event.key,
        name: event.name,
        location,
        dateRange,
      };
    });
  }

  private formatDateRange(start: Date, end: Date): string {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const startMonth = monthNames[start.getMonth()];
    const startDay = start.getDate();
    const endMonth = monthNames[end.getMonth()];
    const endDay = end.getDate();

    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} ${startDay}-${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
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

  public async fetchAndParseEvents(year: number): Promise<TBASimpleEvent[]> {
    const events = await this.getEvents(year);
    return this.parseEventsToSimple(events);
  }

  public async fetchTeamsAtEvent(eventKey: string): Promise<string[]> {
    const teamKeys = await this.getTeamsAtEvent(eventKey);
    // Convert frc1234 to just 1234
    return teamKeys.map((key) => key.replace("frc", ""));
  }
}
