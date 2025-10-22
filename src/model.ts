import { GET, GETMANY, SET, DEL, CLEAR } from "@/db.ts";
import { Match } from "@/match.ts";

// this class manages matches and their persistent storage
export class Model {
  public matches: Array<Match> = [];
  private matchIds: Array<string> = [];

  constructor() {}

  public async loadPersistentData(): Promise<void> {
    const matchIds: Array<string> | undefined = await GET("matchIds", (e) => {
      console.error("Failed to load match IDs from IndexedDB:", e);
      alert(
        "Could not load data from IndexedDB. Data will not persist. This could be a permissions issue or code bug.",
      );
    });

    if (matchIds === undefined) return;

    const matches = await GETMANY(matchIds, (e) => {
      console.error("Failed to load matches from IndexedDB:", e);
      alert(
        "Could not load data from IndexedDB. Data will not persist. This could be a permissions issue or code bug.",
      );
    });

    if (matches !== undefined) {
      for (const match of matches) {
        try {
          this.matches.push(Match.fromPacket(match));
          this.matchIds.push(match[7]);
        } catch (error) {
          console.error("Failed to parse match data:", error);
        }
      }
    }
  }

  public async createNewMatch(
    matchName: string,
    redOne: string,
    redTwo: string,
    redThree: string,
    blueOne: string,
    blueTwo: string,
    blueThree: string,
  ): Promise<string> {
    const match = new Match(
      matchName,
      redOne,
      redTwo,
      redThree,
      blueOne,
      blueTwo,
      blueThree,
    );
    return this.addMatch(match);
  }

  public async addMatch(match: Match): Promise<string> {
    this.matches.push(match);
    this.matchIds.push(match.id);
    await SET(match.id, match.getAsPacket(), (e) => {
      console.error("Failed to save match to IndexedDB:", e);
    });
    await SET("matchIds", this.matchIds, (e) => {
      console.error("Failed to save match IDs to IndexedDB:", e);
    });
    return match.id;
  }

  public async deleteMatch(id: string): Promise<void> {
    const index = this.matches.findIndex((e) => e.id === id);
    if (index === -1) return;

    this.matches.splice(index, 1);
    this.matchIds.splice(index, 1);

    await SET("matchIds", this.matchIds, (e) => {
      console.error("Failed to update match IDs after deletion:", e);
    });
    DEL(id);
  }

  public getMatch(id: string): Match | null {
    const index = this.matches.findIndex((e) => e.id === id);
    if (index === -1) return null;
    return this.matches[index];
  }

  public async updateMatch(id: string): Promise<void> {
    const index = this.matches.findIndex((e) => e.id === id);
    if (index === -1) return;

    const match = this.matches[index];
    await SET(match.id, match.getAsPacket(), (e) => {
      console.error("Failed to update match in IndexedDB:", e);
    });
  }

  public async clear(): Promise<void> {
    this.matches = [];
    this.matchIds = [];
    CLEAR();
  }
}
