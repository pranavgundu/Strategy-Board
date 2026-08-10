import { invoke, type InvokeArgs } from "@tauri-apps/api/core";

import type {
  BoardMode, BoardState, BoardTool, Contributor, CreateMatchInput, FieldRobotPositions,
  FuzzyBatchItem, FuzzyBatchMatch, FuzzyMatchResult, JsonValue, MatchPacket, NativeConfig,
  PdfDocumentPlan, QrProgress, StatboticsMatch, StatboticsTeamYear, StatboticsYear, TbaEvent,
  TbaMatch, TbaSimpleEvent, TbaSimpleMatch,
} from "./types";

export class NativeCommandError extends Error {
  readonly command: string;

  constructor(command: string, cause: unknown) {
    super(typeof cause === "string" ? cause : `Native command \"${command}\" failed`);
    this.name = "NativeCommandError";
    this.command = command;
    this.cause = cause;
  }
}

/** One typed boundary for all Tauri calls. Do not use it from pointer-move paths. */
async function call<TResult>(command: string, args?: InvokeArgs): Promise<TResult> {
  try {
    return await invoke<TResult>(command, args);
  } catch (error) {
    throw new NativeCommandError(command, error);
  }
}

/**
 * Native service surface. Commands that move packets use one coarse payload
 * rather than a sequence of per-field IPC calls.
 */
export const native = {
  storage: {
    get: (key: string) => call<JsonValue | null>("storage_get", { key }),
    getMany: (keys: string[]) => call<Array<JsonValue | null>>("storage_get_many", { keys }),
    set: (key: string, value: JsonValue) => call<void>("storage_set", { key, value }),
    delete: (key: string) => call<void>("storage_delete", { key }),
    clear: () => call<void>("storage_clear"),
    entries: () => call<Array<[string, JsonValue]>>("storage_entries"),
  },
  model: {
    loadPackets: () => call<MatchPacket[]>("model_load_packets"),
    addPacket: (packet: MatchPacket) => call<string>("model_add_packet", { packet }),
    /** Atomic import path for TBA, QR, and cloud packets. */
    addPackets: (packets: MatchPacket[]) => call<string[]>("model_add_packets", { packets }),
    /** Atomic normalized replacement for a completed form or canvas commit. */
    replacePacket: (packet: MatchPacket) => call<string>("model_replace_packet", { packet }),
    deleteMatch: (id: string) => call<void>("model_delete_match", { id }),
    clearMatches: () => call<void>("model_clear_matches"),
  },
  matches: {
    createPacket: (input: CreateMatchInput) => call<MatchPacket>("match_create_packet", { ...input }),
    normalizePacket: (packet: MatchPacket) => call<MatchPacket>("match_normalize_packet", { packet }),
  },
  board: {
    state: () => call<BoardState>("board_state"),
    setMode: (mode: BoardMode) => call<BoardState>("board_set_mode", { mode }),
    setTool: (tool: BoardTool) => call<BoardState>("board_set_tool", { tool }),
    setColor: (color: number) => call<BoardState>("board_set_color", { color }),
    /** Call only for completed undoable edits, never while a stroke is moving. */
    recordAction: (action: string) => call<BoardState>("board_record_action", { action }),
    undo: () => call<string | null>("board_undo"),
    redo: () => call<string | null>("board_redo"),
  },
  tba: {
    setApiKey: (apiKey: string) => call<void>("tba_set_api_key", { apiKey }),
    hasApiKey: () => call<boolean>("tba_has_api_key"),
    events: (year: number) => call<TbaEvent[]>("tba_events", { year }),
    matchesAtEvent: (eventKey: string) => call<TbaMatch[]>("tba_matches_at_event", { eventKey }),
    teamMatches: (teamKey: string, eventKey: string) => call<TbaMatch[]>("tba_team_matches", { teamKey, eventKey }),
    teamEvents: (teamKey: string, year: number) => call<TbaEvent[]>("tba_team_events", { teamKey, year }),
    teamsAtEvent: (eventKey: string) => call<string[]>("tba_teams_at_event", { eventKey }),
    simpleEvents: (events: TbaEvent[]) => call<TbaSimpleEvent[]>("tba_simple_events", { events }),
    simpleMatches: (matches: TbaMatch[]) => call<TbaSimpleMatch[]>("tba_simple_matches", { matches }),
  },
  statbotics: {
    cached: (matchKey: string) => call<JsonValue | null>("statbotics_cached", { matchKey }),
    cacheTimestamp: (matchKey: string) => call<number | null>("statbotics_cache_timestamp", { matchKey }),
    clearCache: () => call<number>("statbotics_clear_cache"),
    fetch: (endpoint: string) => call<JsonValue>("statbotics_fetch", { endpoint }),
    matchKey: (eventKey: string, matchName: string) => call<string>("statbotics_match_key", { eventKey, matchName }),
    match: (matchKey: string) => call<StatboticsMatch>("statbotics_match", { matchKey }),
    year: (year: number) => call<StatboticsYear>("statbotics_year", { year }),
    teamYear: (team: number, year: number) => call<StatboticsTeamYear>("statbotics_team_year", { team, year }),
  },
  github: {
    teams: () => call<string[]>("github_teams"),
    contributors: (count?: number) => call<Contributor[]>("github_contributors", { count }),
  },
  cloud: {
    upload: (packet: MatchPacket) => call<string>("cloud_upload", { packet }),
    download: (shareCode: string) => call<MatchPacket | null>("cloud_download", { shareCode }),
    shareExists: (shareCode: string) => call<boolean>("cloud_share_exists", { shareCode }),
  },
  qr: {
    encode: (payload: string) => call<string[]>("qr_encode", { payload }),
    reset: () => call<void>("qr_reset"),
    receive: (frame: string) => call<QrProgress>("qr_receive", { frame }),
    restorePacket: (payload: string) => call<MatchPacket>("qr_restore_packet", { payload }),
  },
  search: {
    match: (searchTerm: string, target: string, originalTarget?: string) =>
      call<FuzzyMatchResult | null>("fuzzy_match", { searchTerm, target, originalTarget }),
    batch: (items: FuzzyBatchItem[], searchLower: string, minScore?: number) =>
      call<FuzzyBatchMatch[]>("fuzzy_search_batch", { items, searchLower, minScore }),
  },
  pdf: {
    standardPlan: (frames: string[], matchName: string) => call<PdfDocumentPlan>("pdf_standard_plan", { frames, matchName }),
    largePlan: (frames: string[], matchName: string) => call<PdfDocumentPlan>("pdf_large_plan", { frames, matchName }),
  },
  field: {
    years: () => call<number[]>("field_years"),
    image: (year?: number) => call<string>("field_image", { year }),
    robotPositions: (year?: number) => call<FieldRobotPositions>("field_robot_positions", { year }),
  },
  platform: {
    validateUrl: (url: string) => call<string>("platform_validate_url", { url }),
    openUrl: (url: string) => call<void>("platform_open_url", { url }),
  },
  config: {
    current: () => call<NativeConfig>("config_current"),
  },
} as const;
