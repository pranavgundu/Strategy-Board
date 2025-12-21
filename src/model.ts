import { GET, GETMANY, SET, DEL, CLEAR } from "./db.ts";
import { Match } from "./match.ts";

// this class manages matches and their persistent storage
export class Model {
  public matches: Array<Match> = [];
  private matchIds: Array<string> = [];

  constructor() {}

  /**
   * Loads match data from IndexedDB storage.
   */
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

  /**
   * Creates a new match and adds it to the model.
   *
   * @param matchName - Name of the match.
   * @param redOne - Red alliance robot 1 team number.
   * @param redTwo - Red alliance robot 2 team number.
   * @param redThree - Red alliance robot 3 team number.
   * @param blueOne - Blue alliance robot 1 team number.
   * @param blueTwo - Blue alliance robot 2 team number.
   * @param blueThree - Blue alliance robot 3 team number.
   * @returns The unique ID of the created match.
   */
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

  /**
   * Adds an existing match to the model and persists it.
   *
   * @param match - The match to add.
   * @returns The unique ID of the added match.
   */
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

  /**
   * Deletes a match by ID from the model and storage.
   *
   * @param id - The unique ID of the match to delete.
   */
  public async deleteMatch(id: string): Promise<void> {
    const index = this.matches.findIndex((e) => e.id === id);
    if (index === -1) return;

    this.matches.splice(index, 1);
    this.matchIds.splice(index, 1);

    await SET("matchIds", this.matchIds, (e) => {
      console.error("Failed to update match IDs after deletion:", e);
    });
    await DEL(id);
  }

  /**
   * Retrieves a match by ID.
   *
   * @param id - The unique ID of the match.
   * @returns The match if found, or null if not found.
   */
  public getMatch(id: string): Match | null {
    const index = this.matches.findIndex((e) => e.id === id);
    if (index === -1) return null;
    return this.matches[index];
  }

  /**
   * Updates a match in storage with its current state.
   *
   * @param id - The unique ID of the match to update.
   */
  public async updateMatch(id: string): Promise<void> {
    const index = this.matches.findIndex((e) => e.id === id);
    if (index === -1) return;

    const match = this.matches[index];
    await SET(match.id, match.getAsPacket(), (e) => {
      console.error("Failed to update match in IndexedDB:", e);
    });
  }

  /**
   * Clears all matches from the model and storage.
   */
  public async clear(): Promise<void> {
    this.matches = [];
    this.matchIds = [];
    await CLEAR();
  }
}
