import { GET } from "./db.ts";
import { Config } from "./config.ts";

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
  year: number;
}

export interface TBASimpleMatch {
  matchName: string;
  redTeams: string[];
  blueTeams: string[];
}

export class TBAService {
  private apiKey: string | null = null;

  constructor() {}

  /**
   * Loads the TBA API key from storage.
   *
   * @returns The loaded API key, or null if not found.
   */
  public async loadApiKey(): Promise<string | null> {
    const key = await GET("tbaApiKey", (e) => {
      console.error("Failed to load TBA API key:", e);
    });
    this.apiKey = typeof key === "string" ? key : null;

    if (!this.apiKey && Config.sharedTBAApiKey) {
      this.apiKey = Config.sharedTBAApiKey;
    }

    return this.apiKey;
  }

  /**
   * Sets the TBA API key for making authenticated requests.
   *
   * @param key - The Blue Alliance API key.
   */
  public setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Checks if an API key has been set.
   *
   * @returns True if API key exists, false otherwise.
   */
  public hasApiKey(): boolean {
    return (
      (this.apiKey !== null && this.apiKey.length > 0) ||
      (Config.sharedTBAApiKey && Config.sharedTBAApiKey.length > 0)
    );
  }

  private async makeRequest(endpoint: string): Promise<any> {
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

  /**
   * Fetches all events for a given year from The Blue Alliance.
   *
   * @param year - The year to fetch events for.
   * @returns Array of TBA event data.
   */
  public async getEvents(year: number): Promise<TBAEvent[]> {
    const endpoint = `/events/${year}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Fetches all team keys participating at an event.
   *
   * @param eventKey - The event key to fetch teams for.
   * @returns Array of team keys (e.g., "frc467").
   */
  public async getTeamsAtEvent(eventKey: string): Promise<string[]> {
    try {
      const endpoint = `/event/${eventKey}/teams/keys`;
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.warn(
        "Failed to fetch teams directly, falling back to match schedule:",
        error,
      );
      return await this.getTeamsFromMatches(eventKey);
    }
  }

  /**
   * Fetches all matches at an event.
   *
   * @param eventKey - The event key to fetch matches from.
   * @returns Array of TBA match data.
   */
  public async getMatchesAtEvent(eventKey: string): Promise<TBAMatch[]> {
    const endpoint = `/event/${eventKey}/matches`;
    return await this.makeRequest(endpoint);
  }

  private async getTeamsFromMatches(eventKey: string): Promise<string[]> {
    const matches = await this.getMatchesAtEvent(eventKey);
    const teamSet = new Set<string>();

    for (const match of matches) {
      for (const teamKey of match.alliances.red.team_keys) {
        teamSet.add(teamKey);
      }
      for (const teamKey of match.alliances.blue.team_keys) {
        teamSet.add(teamKey);
      }
    }

    return Array.from(teamSet);
  }

  /**
   * Fetches all events a team participated in for a given year.
   *
   * @param teamKey - The team key or number.
   * @param year - The year to fetch events for.
   * @returns Array of TBA event data.
   */
  public async getTeamEvents(
    teamKey: string,
    year: number,
  ): Promise<TBAEvent[]> {
    if (!teamKey.startsWith("frc")) {
      teamKey = `frc${teamKey}`;
    }
    const endpoint = `/team/${teamKey}/events/${year}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Converts TBA event data to simplified format.
   *
   * @param events - Array of TBA event data.
   * @returns Array of simplified event information.
   */
  public parseEventsToSimple(events: TBAEvent[]): TBASimpleEvent[] {
    return events.map((event) => {
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

      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      const dateRange = this.formatDateRange(startDate, endDate);

      return {
        key: event.key,
        name: event.name,
        location,
        dateRange,
        year: event.year,
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

  /**
   * Fetches all matches for a specific team at an event.
   *
   * @param teamKey - The team key or number.
   * @param eventKey - The event key.
   * @returns Array of TBA match data.
   */
  public async getTeamMatchesAtEvent(
    teamKey: string,
    eventKey: string,
  ): Promise<TBAMatch[]> {
    if (!teamKey.startsWith("frc")) {
      teamKey = `frc${teamKey}`;
    }

    const endpoint = `/team/${teamKey}/event/${eventKey}/matches`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Converts TBA match data to simplified format.
   *
   * @param matches - Array of TBA match data.
   * @returns Array of simplified match information sorted by match order.
   */
  public parseMatchesToSimple(matches: TBAMatch[]): TBASimpleMatch[] {
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

  /**
   * Fetches and parses all matches for a team at an event.
   *
   * @param teamKey - The team key or number.
   * @param eventKey - The event key.
   * @returns Array of simplified match information.
   */
  public async fetchAndParseTeamMatches(
    teamKey: string,
    eventKey: string,
  ): Promise<TBASimpleMatch[]> {
    const matches = await this.getTeamMatchesAtEvent(teamKey, eventKey);
    return this.parseMatchesToSimple(matches);
  }

  /**
   * Fetches and parses all events for a given year.
   *
   * @param year - The year to fetch events for.
   * @returns Array of simplified event information.
   */
  public async fetchAndParseEvents(year: number): Promise<TBASimpleEvent[]> {
    const events = await this.getEvents(year);
    return this.parseEventsToSimple(events);
  }

  /**
   * Fetches all team numbers at an event.
   *
   * @param eventKey - The event key.
   * @returns Array of team numbers as strings.
   */
  public async fetchTeamsAtEvent(eventKey: string): Promise<string[]> {
    const teamKeys = await this.getTeamsAtEvent(eventKey);
    return teamKeys.map((key) => key.replace("frc", ""));
  }

  /**
   * Fetches and parses all qualification matches at an event.
   *
   * @param eventKey - The event key.
   * @returns Array of simplified match information.
   */
  public async fetchAndParseAllMatches(
    eventKey: string,
  ): Promise<TBASimpleMatch[]> {
    const matches = await this.getMatchesAtEvent(eventKey);
    return this.parseMatchesToSimple(matches);
  }

  /**
   * Filters events to show all past events and future events up to 1 week from now.
   *
   * @param events - Array of TBA simple events.
   * @returns Array of filtered events.
   */
  public filterEventsWithinOneWeek(events: TBASimpleEvent[]): TBASimpleEvent[] {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return events.filter((event) => {
      // Parse the date range to get the start date
      // Format is either "Mon DD-DD" or "Mon DD - Mon DD"
      const parts = event.dateRange.split(" ");
      const month = parts[0];
      const dayStr = parts[1].split("-")[0];
      const day = parseInt(dayStr, 10);

      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const monthIndex = monthNames.indexOf(month);

      if (monthIndex === -1) {
        return false;
      }

      const eventDate = new Date(event.year, monthIndex, day);
      // Show all past events and future events up to 1 week from now
      return eventDate <= oneWeekFromNow;
    });
  }
}
