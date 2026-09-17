import type {
  BoardMode, BoardState, BoardTool, Contributor, CreateMatchInput, FieldRobotPositions,
  FuzzyBatchItem, FuzzyBatchMatch, FuzzyMatchResult, JsonValue, MatchPacket, NativeConfig,
  PdfDocumentPlan, QrProgress, StatboticsMatch, StatboticsTeamYear, StatboticsYear, TbaEvent,
  TbaMatch, TbaSimpleEvent, TbaSimpleMatch,
} from "./types";
import { whiteboardMatchFromPacket, writeWhiteboardPacket } from "$lib/whiteboard/packet";

const DB_NAME = "strategy-board-web";
const STORE_NAME = "keyval";
const APP_DATA_KEY = "appData";
const SHARE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHARE_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/strategyboard-app/databases/(default)/documents";
// Firebase web API keys identify a project; Firestore rules provide access
// control. Keep the deployed web app functional when CI has no key override.
const FIREBASE_PUBLIC_API_KEY = "AIzaSyDT2M0XwxAJxqrARFe3GVJKDds-IAwomMM";
const TBA_BASE = "https://www.thebluealliance.com/api/v3";
const STATBOTICS_BASE = "https://api.statbotics.io/v3";
const STATBOTICS_TTL_MS = 24 * 60 * 60 * 1000;

let databasePromise: Promise<IDBDatabase> | null = null;
let qrTotal: number | null = null;
let qrChunks = new Map<number, string>();
let boardState: BoardState = { mode: "auto", tool: "marker", color: 0, canUndo: false, canRedo: false };
let boardUndo: string[] = [];
let boardRedo: string[] = [];

function database(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open browser storage"));
  });
  return databasePromise;
}

async function storageGet(key: string): Promise<JsonValue | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as JsonValue | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read browser storage"));
  });
}

async function storageSet(key: string, value: JsonValue): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(structuredClone(value), key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not write browser storage"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Browser storage write was aborted"));
  });
}

async function storageDelete(key: string): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete browser data"));
  });
}

async function storageEntries(): Promise<Array<[string, JsonValue]>> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const output: Array<[string, JsonValue]> = [];
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve(output);
      output.push([String(cursor.key), cursor.value as JsonValue]);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error("Could not list browser data"));
  });
}

function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes].map((value, index) => `${index === 4 || index === 6 || index === 8 || index === 10 ? "-" : ""}${value.toString(16).padStart(2, "0")}`).join("");
}

function positionsForYear(year?: number | null): FieldRobotPositions {
  if (year && year < 2026) {
    return {
      red: { one: { x: 2055, y: 455 }, two: { x: 2055, y: 805 }, three: { x: 2055, y: 1155 } },
      blue: { one: { x: 1455, y: 455 }, two: { x: 1455, y: 805 }, three: { x: 1455, y: 1155 } },
    };
  }
  return {
    red: { one: { x: 2680, y: 205 }, two: { x: 2680, y: 805 }, three: { x: 2680, y: 1405 } },
    blue: { one: { x: 830, y: 205 }, two: { x: 830, y: 805 }, three: { x: 830, y: 1405 } },
  };
}

function phasePacket(positions: FieldRobotPositions): JsonValue[] {
  return [
    [positions.red.one.x, positions.red.one.y, 0],
    [positions.red.two.x, positions.red.two.y, 0],
    [positions.red.three.x, positions.red.three.y, 0],
    [positions.blue.one.x, positions.blue.one.y, 0],
    [positions.blue.two.x, positions.blue.two.y, 0],
    [positions.blue.three.x, positions.blue.three.y, 0],
    [], [], [],
  ];
}

export function createBrowserMatchPacket(input: CreateMatchInput, id = uuid()): MatchPacket {
  if (input.redTeams.length !== 3 || input.blueTeams.length !== 3) throw new Error("A match requires exactly three teams per alliance");
  const positions = positionsForYear(input.tbaYear);
  const dimensions = Array.from({ length: 6 }, () => [152.4, 152.4]);
  return [
    String(input.matchName), ...input.redTeams.map(String), ...input.blueTeams.map(String), id,
    [dimensions, phasePacket(positions), phasePacket(positions), phasePacket(positions), phasePacket(positions), phasePacket(positions)],
    input.tbaEventKey ?? null, input.tbaMatchKey ?? null, input.tbaYear ?? null, null,
  ] as unknown as MatchPacket;
}

export function normalizeBrowserMatchPacket(value: unknown): MatchPacket {
  if (!Array.isArray(value) || value.length < 9) throw new Error("Invalid match packet");
  const strings = (index: number) => typeof value[index] === "string" ? value[index] : "";
  const year = typeof value[11] === "number" && Number.isFinite(value[11]) ? value[11] : undefined;
  const base = createBrowserMatchPacket({
    matchName: strings(0),
    redTeams: [strings(1), strings(2), strings(3)],
    blueTeams: [strings(4), strings(5), strings(6)],
    ...(typeof value[9] === "string" && value[9] ? { tbaEventKey: value[9] } : {}),
    ...(typeof value[10] === "string" && value[10] ? { tbaMatchKey: value[10] } : {}),
    ...(year !== undefined ? { tbaYear: year } : {}),
  }, typeof value[7] === "string" && value[7] ? value[7] : uuid());
  const decoded = whiteboardMatchFromPacket(value);
  decoded.id = base[7];
  const normalized = writeWhiteboardPacket(base, decoded);
  normalized[8][0] = [
    decoded.auto.redOneRobot, decoded.auto.redTwoRobot, decoded.auto.redThreeRobot,
    decoded.auto.blueOneRobot, decoded.auto.blueTwoRobot, decoded.auto.blueThreeRobot,
  ].map((robot) => [robot.w, robot.h]);
  if (value[12] && typeof value[12] === "object" && !Array.isArray(value[12])) normalized[12] = structuredClone(value[12]) as MatchPacket[12];
  return normalized;
}

async function loadPackets(): Promise<MatchPacket[]> {
  const value = await storageGet(APP_DATA_KEY);
  if (!Array.isArray(value)) return [];
  const results = value.map((packet) => {
    try { return normalizeBrowserMatchPacket(packet); } catch { return null; }
  });
  return results.filter((packet): packet is MatchPacket => packet !== null);
}

async function addPackets(values: MatchPacket[]): Promise<string[]> {
  const additions = values.map(normalizeBrowserMatchPacket);
  const packets = await loadPackets();
  const ids = new Set(packets.map((packet) => packet[7]));
  for (const packet of additions) {
    if (ids.has(packet[7])) throw new Error(`A match with id ${packet[7]} already exists`);
    ids.add(packet[7]);
  }
  await storageSet(APP_DATA_KEY, [...packets, ...additions] as JsonValue);
  return additions.map((packet) => packet[7]);
}

function firebaseKey(): string {
  return __FIREBASE_API_KEY__ || FIREBASE_PUBLIC_API_KEY;
}

function generateShareCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(6));
  return [...random].map((value) => SHARE_ALPHABET[value % SHARE_ALPHABET.length]).join("");
}

function firestoreDocument(record: { data: string; createdAt: number; expiresAt: number }): object {
  return { fields: {
    data: { stringValue: record.data },
    createdAt: { integerValue: String(record.createdAt) },
    expiresAt: { integerValue: String(record.expiresAt) },
    version: { integerValue: "1" },
  } };
}

function parseFirestoreInteger(field: unknown): number {
  if (!field || typeof field !== "object") return 0;
  const value = (field as { integerValue?: unknown }).integerValue;
  return typeof value === "string" || typeof value === "number" ? Number(value) : 0;
}

async function cloudUpload(packet: MatchPacket): Promise<string> {
  const portable = structuredClone(packet) as Array<JsonValue>;
  portable[7] = null;
  const createdAt = Date.now();
  const body = firestoreDocument({ data: JSON.stringify(portable), createdAt, expiresAt: createdAt + SHARE_TTL_MS });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateShareCode();
    const response = await fetch(`${FIRESTORE_BASE}/matches?documentId=${code}&key=${encodeURIComponent(firebaseKey())}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (response.ok) return code;
    if (response.status === 403 || response.status === 409) continue;
    throw new Error(`Firestore upload failed (${response.status})`);
  }
  throw new Error("Could not allocate a unique share code");
}

async function cloudDownload(rawCode: string): Promise<MatchPacket | null> {
  const code = rawCode.trim().toUpperCase();
  if (!SHARE_CODE.test(code)) throw new Error("Invalid share code format");
  const response = await fetch(`${FIRESTORE_BASE}/matches/${code}?key=${encodeURIComponent(firebaseKey())}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore download failed (${response.status})`);
  const document = await response.json() as { fields?: Record<string, unknown> };
  const fields = document.fields;
  const data = fields?.data && typeof fields.data === "object" ? (fields.data as { stringValue?: unknown }).stringValue : null;
  const expiresAt = parseFirestoreInteger(fields?.expiresAt);
  if (typeof data !== "string") throw new Error("Shared match data is invalid");
  if (expiresAt && Date.now() > expiresAt) throw new Error("This share code has expired");
  return normalizeBrowserMatchPacket(JSON.parse(data));
}

async function requestJson<T>(url: string, headers: HeadersInit = {}): Promise<T> {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Request failed (${response.status} ${response.statusText})`);
  return response.json() as Promise<T>;
}

async function tbaRequest<T>(endpoint: string): Promise<T> {
  const saved = await storageGet("tbaApiKey");
  const key = typeof saved === "string" && saved ? saved : __TBA_API_KEY__;
  if (!key) throw new Error("A The Blue Alliance API key is required");
  return requestJson<T>(`${TBA_BASE}${endpoint}`, { "X-TBA-Auth-Key": key });
}

function simpleEvents(events: TbaEvent[]): TbaSimpleEvent[] {
  const formatDate = (start: string, end: string) => {
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
    const first = new Date(`${start}T00:00:00Z`);
    const last = new Date(`${end}T00:00:00Z`);
    if (!Number.isFinite(first.valueOf()) || !Number.isFinite(last.valueOf())) return "";
    return `${first.toLocaleDateString("en-US", options)} - ${last.toLocaleDateString("en-US", options)}`;
  };
  return events.filter((event) => event.year >= 2025).map((event) => ({
    key: event.key, name: event.name,
    location: [event.city, event.state_prov ?? event.country].filter(Boolean).join(", "),
    date_range: formatDate(event.start_date, event.end_date), year: event.year,
  })).sort((a, b) => b.year - a.year || b.date_range.localeCompare(a.date_range));
}

function simpleMatches(matches: TbaMatch[]): TbaSimpleMatch[] {
  const levelOrder: Record<string, number> = { qm: 1, ef: 2, qf: 3, sf: 4, f: 5 };
  const label = (match: TbaMatch) => {
    if (match.comp_level === "qm") return `Quals ${match.match_number}`;
    const names: Record<string, string> = { ef: "Eighths", qf: "Quarters", sf: "Semis", f: "Finals" };
    return `${names[match.comp_level] ?? match.comp_level.toUpperCase()} ${match.set_number}-${match.match_number}`;
  };
  return [...matches].sort((a, b) => (levelOrder[a.comp_level] ?? 99) - (levelOrder[b.comp_level] ?? 99) || a.set_number - b.set_number || a.match_number - b.match_number).map((match) => ({
    match_name: label(match),
    red_teams: match.alliances.red.team_keys.map((team) => team.replace(/^frc/, "")),
    blue_teams: match.alliances.blue.team_keys.map((team) => team.replace(/^frc/, "")),
    match_key: match.key,
  }));
}

async function statboticsFetch<T>(endpoint: string): Promise<T> {
  if (!endpoint.startsWith("/") || endpoint.includes("..") || endpoint.includes("?") || endpoint.includes("#")) throw new Error("Invalid Statbotics endpoint");
  const cacheKey = `statbotics_${endpoint.replace(/^\/match\//, "")}`;
  const cached = await storageGet(cacheKey);
  if (cached && typeof cached === "object" && !Array.isArray(cached)) {
    const entry = cached as { data?: JsonValue; timestamp?: JsonValue };
    if (typeof entry.timestamp === "number" && Date.now() - entry.timestamp <= STATBOTICS_TTL_MS) return entry.data as T;
  }
  const data = await requestJson<T>(`${STATBOTICS_BASE}${endpoint}`);
  await storageSet(cacheKey, { data: data as JsonValue, timestamp: Date.now() });
  return data;
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}
function decodeBase64(value: string): string {
  const binary = atob(value);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}
function qrEncode(payload: string): string[] {
  const encoded = encodeBase64(payload);
  const chunks = encoded.match(/.{1,200}/g) ?? [""];
  if (chunks.length > 9999) throw new Error("QR stream is too large");
  return chunks.map((chunk, index) => `${String(index).padStart(4, "0")}${String(chunks.length).padStart(4, "0")}${chunk}`);
}
function qrReceive(frame: string): QrProgress {
  if (!/^\d{8}/.test(frame)) throw new Error("Invalid QR frame header");
  const index = Number(frame.slice(0, 4));
  const total = Number(frame.slice(4, 8));
  if (!total || index >= total) throw new Error("Invalid QR frame position");
  if (qrTotal !== null && qrTotal !== total) { qrChunks.clear(); qrTotal = null; }
  qrTotal = total;
  const duplicate = qrChunks.has(index);
  qrChunks.set(index, frame.slice(8));
  if (qrChunks.size < total) return { status: "receiving", received: qrChunks.size, total, duplicate };
  const encoded = Array.from({ length: total }, (_, chunkIndex) => qrChunks.get(chunkIndex) ?? "").join("");
  qrChunks.clear(); qrTotal = null;
  return { status: "complete", payload: decodeBase64(encoded) };
}

function pdfPlan(frames: string[], matchName: string, large: boolean): PdfDocumentPlan {
  const text = (value: string, xMm: number, yMm: number, fontSizePt: number, bold: boolean) => ({ value, xMm, yMm, fontSizePt, bold });
  if (large) return { widthMm: 210, heightMm: 297, pages: frames.map((payload, index) => ({
    pageIndex: index,
    texts: [text(matchName, 105, 30, 24, true), text(`QR Code ${index + 1} of ${frames.length}`, 105, 45, 16, false), text("Scan this code, then move to the next page", 105, 267, 14, false)],
    qrCodes: [{ payload, ordinal: index + 1, total: frames.length, xMm: 30, yMm: 73.5, sizeMm: 150, label: null }],
  })) };
  const perPage = 2;
  const pageCount = Math.max(1, Math.ceil(frames.length / perPage));
  return { widthMm: 210, heightMm: 297, pages: Array.from({ length: pageCount }, (_, pageIndex) => {
    const start = pageIndex * perPage;
    return {
      pageIndex,
      texts: [text(matchName, 105, 20, pageIndex === 0 ? 20 : 16, true), ...(pageIndex === 0 ? [text(`Scan each QR code in order (${frames.length} total)`, 105, 30, 12, false)] : [])],
      qrCodes: frames.slice(start, start + perPage).map((payload, position) => {
        const ordinal = start + position + 1;
        return { payload, ordinal, total: frames.length, xMm: 20, yMm: 40 + position * 95, sizeMm: 80, label: text(`${ordinal} of ${frames.length}`, 60, 125 + position * 95, 10, false) };
      }),
    };
  }) };
}

function fuzzyMatch(searchTerm: string, target: string, originalTarget?: string): FuzzyMatchResult | null {
  const query = searchTerm.toLowerCase();
  const text = target.toLowerCase();
  const index = text.indexOf(query);
  if (index >= 0) return { score: 100 - index, matchedIndices: Array.from({ length: query.length }, (_, offset) => index + offset) };
  let cursor = 0;
  const matchedIndices: number[] = [];
  for (let position = 0; position < text.length && cursor < query.length; position += 1) if (text[position] === query[cursor]) { matchedIndices.push(position); cursor += 1; }
  return cursor === query.length ? { score: Math.max(1, 50 - text.length + query.length), matchedIndices } : (originalTarget ? fuzzyMatch(searchTerm, originalTarget) : null);
}

const config: NativeConfig = {
  fieldPngPixelWidth: 3510, fieldPngPixelHeight: 1610, fieldRealWidthInches: 690.875, fieldRealHeightInches: 317,
  redOneStationX: 3575, redOneStationY: 455, redTwoStationX: 3575, redTwoStationY: 805, redThreeStationX: 3575, redThreeStationY: 1155,
  blueOneStationX: -65, blueOneStationY: 455, blueTwoStationX: -65, blueTwoStationY: 805, blueThreeStationX: -65, blueThreeStationY: 1155,
  sharedTbaApiKey: null,
  releaseAnnouncement: { enabled: false, id: "release-2026-2-0", title: "New update available", message: "We shipped a new release with fixes and improvements.", ctaLabel: "View release notes", ctaUrl: "https://github.com/pranavgundu/Strategy-Board/releases", showOnce: true },
};

/** Browser implementation of the command boundary used by the deployed static site. */
export async function browserInvoke<TResult>(command: string, args: Record<string, unknown> = {}): Promise<TResult> {
  let result: unknown;
  switch (command) {
    case "storage_get": result = await storageGet(String(args.key)); break;
    case "storage_get_many": result = await Promise.all((args.keys as string[]).map(storageGet)); break;
    case "storage_set": await storageSet(String(args.key), args.value as JsonValue); break;
    case "storage_delete": await storageDelete(String(args.key)); break;
    case "storage_clear": { const entries = await storageEntries(); await Promise.all(entries.map(([key]) => storageDelete(key))); break; }
    case "storage_entries": result = await storageEntries(); break;
    case "model_load_packets": result = await loadPackets(); break;
    case "model_add_packet": result = (await addPackets([args.packet as MatchPacket]))[0]; break;
    case "model_add_packets": result = await addPackets(args.packets as MatchPacket[]); break;
    case "model_replace_packet": {
      const packet = normalizeBrowserMatchPacket(args.packet);
      const packets = await loadPackets();
      const index = packets.findIndex((candidate) => candidate[7] === packet[7]);
      if (index < 0) throw new Error(`Match ${packet[7]} does not exist`);
      packets[index] = packet; await storageSet(APP_DATA_KEY, packets as JsonValue); result = packet[7]; break;
    }
    case "model_delete_match": await storageSet(APP_DATA_KEY, (await loadPackets()).filter((packet) => packet[7] !== args.id) as JsonValue); break;
    case "model_clear_matches": await storageSet(APP_DATA_KEY, []); break;
    case "match_create_packet": result = createBrowserMatchPacket({ matchName: args.matchName, redTeams: args.redTeams, blueTeams: args.blueTeams, tbaEventKey: args.tbaEventKey, tbaMatchKey: args.tbaMatchKey, tbaYear: args.tbaYear } as CreateMatchInput); break;
    case "match_normalize_packet": result = normalizeBrowserMatchPacket(args.packet); break;
    case "cloud_upload": result = await cloudUpload(args.packet as MatchPacket); break;
    case "cloud_download": result = await cloudDownload(String(args.shareCode)); break;
    case "cloud_share_exists": result = (await cloudDownload(String(args.shareCode))) !== null; break;
    case "tba_set_api_key": await storageSet("tbaApiKey", String(args.apiKey)); break;
    case "tba_has_api_key": result = Boolean((await storageGet("tbaApiKey")) || __TBA_API_KEY__); break;
    case "tba_events": result = await tbaRequest<TbaEvent[]>(`/events/${args.year}`); break;
    case "tba_matches_at_event": result = await tbaRequest<TbaMatch[]>(`/event/${encodeURIComponent(String(args.eventKey))}/matches`); break;
    case "tba_team_matches": result = await tbaRequest<TbaMatch[]>(`/team/frc${String(args.teamKey).replace(/^frc/i, "")}/event/${encodeURIComponent(String(args.eventKey))}/matches`); break;
    case "tba_team_events": result = await tbaRequest<TbaEvent[]>(`/team/frc${String(args.teamKey).replace(/^frc/i, "")}/events/${args.year}`); break;
    case "tba_teams_at_event": result = (await tbaRequest<string[]>(`/event/${encodeURIComponent(String(args.eventKey))}/teams/keys`)).map((team) => team.replace(/^frc/, "")); break;
    case "tba_simple_events": result = simpleEvents(args.events as TbaEvent[]); break;
    case "tba_simple_matches": result = simpleMatches(args.matches as TbaMatch[]); break;
    case "statbotics_fetch": result = await statboticsFetch(String(args.endpoint)); break;
    case "statbotics_match": result = await statboticsFetch<StatboticsMatch>(`/match/${encodeURIComponent(String(args.matchKey))}`); break;
    case "statbotics_year": result = await statboticsFetch<StatboticsYear>(`/year/${args.year}`); break;
    case "statbotics_team_year": result = await statboticsFetch<StatboticsTeamYear>(`/team_year/${args.team}/${args.year}`); break;
    case "statbotics_cache_timestamp": { const cached = await storageGet(`statbotics_${args.matchKey}`); result = cached && typeof cached === "object" && !Array.isArray(cached) ? (cached as Record<string, JsonValue>).timestamp ?? null : null; break; }
    case "statbotics_cached": { const cached = await storageGet(`statbotics_${args.matchKey}`); result = cached && typeof cached === "object" && !Array.isArray(cached) ? (cached as Record<string, JsonValue>).data ?? null : null; break; }
    case "statbotics_clear_cache": { const entries = (await storageEntries()).filter(([key]) => key.startsWith("statbotics_")); await Promise.all(entries.map(([key]) => storageDelete(key))); result = entries.length; break; }
    case "statbotics_match_key": result = `${args.eventKey}_${String(args.matchName).toLowerCase().replace(/\s+/g, "")}`; break;
    case "github_teams": result = (await (await fetch("/contributors.txt")).text()).split(/\r?\n/).map((line) => line.trim()).filter(Boolean); break;
    case "github_contributors": { const people = await requestJson<Contributor[]>("https://api.github.com/repos/pranavgundu/Strategy-Board/contributors?per_page=100"); const filtered = people.filter((person) => !person.login.toLowerCase().startsWith("dependabot")); result = typeof args.count === "number" ? filtered.slice(0, args.count) : filtered; break; }
    case "qr_encode": result = qrEncode(String(args.payload)); break;
    case "qr_reset": qrChunks.clear(); qrTotal = null; break;
    case "qr_receive": result = qrReceive(String(args.frame)); break;
    case "qr_restore_packet": { const packet = JSON.parse(String(args.payload)); if (!Array.isArray(packet)) throw new Error("QR match packet is not an array"); packet.splice(Math.min(7, packet.length), 0, null); result = normalizeBrowserMatchPacket(packet); break; }
    case "pdf_standard_plan": result = pdfPlan(args.frames as string[], String(args.matchName), false); break;
    case "pdf_large_plan": result = pdfPlan(args.frames as string[], String(args.matchName), true); break;
    case "fuzzy_match": result = fuzzyMatch(String(args.searchTerm), String(args.target), typeof args.originalTarget === "string" ? args.originalTarget : undefined); break;
    case "fuzzy_search_batch": result = (args.items as FuzzyBatchItem[]).map((item, index) => ({ index, match: fuzzyMatch(String(args.searchLower), item.nameLower, item.detailsLower) })).filter((entry) => entry.match && entry.match.score >= Number(args.minScore ?? 0)).map((entry) => ({ index: entry.index, score: entry.match!.score, matchedIndices: entry.match!.matchedIndices } satisfies FuzzyBatchMatch)); break;
    case "board_state": result = boardState; break;
    case "board_set_mode": boardState = { ...boardState, mode: args.mode as BoardMode }; result = boardState; break;
    case "board_set_tool": boardState = { ...boardState, tool: args.tool as BoardTool }; result = boardState; break;
    case "board_set_color": boardState = { ...boardState, color: Number(args.color) }; result = boardState; break;
    case "board_record_action": boardUndo.push(String(args.action)); boardRedo = []; boardState = { ...boardState, canUndo: true, canRedo: false }; result = boardState; break;
    case "board_undo": { result = boardUndo.pop() ?? null; if (result) boardRedo.push(result as string); boardState = { ...boardState, canUndo: boardUndo.length > 0, canRedo: boardRedo.length > 0 }; break; }
    case "board_redo": { result = boardRedo.pop() ?? null; if (result) boardUndo.push(result as string); boardState = { ...boardState, canUndo: boardUndo.length > 0, canRedo: boardRedo.length > 0 }; break; }
    case "field_years": result = [2025, 2026]; break;
    case "field_image": result = Number(args.year) < 2026 ? "images/2025.png" : "images/2026.png"; break;
    case "field_robot_positions": result = positionsForYear(typeof args.year === "number" ? args.year : undefined); break;
    case "platform_validate_url": { const url = new URL(String(args.url)); if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) throw new Error("Unsupported URL protocol"); result = url.href; break; }
    case "platform_open_url": window.open(String(args.url), "_blank", "noopener,noreferrer"); break;
    case "config_current": result = config; break;
    default: throw new Error(`Browser command \"${command}\" is not implemented`);
  }
  return result as TResult;
}
