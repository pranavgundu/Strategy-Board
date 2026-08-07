import { Model } from "../model.ts";
import { Match } from "../match.ts";
import { initCore } from "../wasm/index.ts";
import { toast } from "./toast.svelte.ts";

export type Screen = "home" | "whiteboard";

const model = new Model();

let _screen = $state<Screen>("home");
let _matches = $state<Match[]>([]);
let _activeMatchId = $state<string | null>(null);
let _loading = $state<boolean>(true);

function syncMatches(): void {
  _matches = [...model.matches];
}

export const app = {
  get screen(): Screen {
    return _screen;
  },

  get matches(): Match[] {
    return _matches;
  },

  get activeMatch(): Match | null {
    if (_activeMatchId === null) return null;
    return _matches.find((m) => m.id === _activeMatchId) ?? null;
  },

  get loading(): boolean {
    return _loading;
  },

  async init(): Promise<void> {
    _loading = true;
    try {
      await initCore();
      await model.loadPersistentData();
      syncMatches();
    } catch (error) {
      console.error("Failed to initialize application:", error);
      toast.show(
        "Failed to start the application. Please refresh the page and try again.",
        "error",
      );
    } finally {
      _loading = false;
    }
  },

  openMatch(id: string): void {
    const match = model.getMatch(id);
    if (!match) return;
    _activeMatchId = id;
    _screen = "whiteboard";
  },

  closeMatch(): void {
    _activeMatchId = null;
    _screen = "home";
  },

  async createMatch(name: string, red: string[], blue: string[]): Promise<void> {
    await model.createNewMatch(
      name,
      red[0] ?? "",
      red[1] ?? "",
      red[2] ?? "",
      blue[0] ?? "",
      blue[1] ?? "",
      blue[2] ?? "",
    );
    syncMatches();
  },

  async duplicateMatch(id: string): Promise<void> {
    const match = model.getMatch(id);
    if (!match) return;

    const duplicatedMatchName = `Copy of ${match.matchName}`;
    const newId = await model.createNewMatch(
      duplicatedMatchName,
      match.redOne,
      match.redTwo,
      match.redThree,
      match.blueOne,
      match.blueTwo,
      match.blueThree,
    );

    const newMatch = model.getMatch(newId);
    if (!newMatch) {
      syncMatches();
      return;
    }

    newMatch.auto = JSON.parse(JSON.stringify(match.auto));
    newMatch.teleop = JSON.parse(JSON.stringify(match.teleop));
    newMatch.transition = JSON.parse(JSON.stringify(match.transition));
    newMatch.endgame = JSON.parse(JSON.stringify(match.endgame));

    await model.updateMatch(newId);
    syncMatches();
  },

  async updateMatch(id: string): Promise<void> {
    await model.updateMatch(id);
    syncMatches();
  },

  get model(): Model {
    return model;
  },

  async deleteMatch(id: string): Promise<void> {
    await model.deleteMatch(id);
    if (_activeMatchId === id) {
      _activeMatchId = null;
      _screen = "home";
    }
    syncMatches();
  },

  async clearAll(): Promise<void> {
    await model.clear();
    _activeMatchId = null;
    _screen = "home";
    syncMatches();
  },
};
