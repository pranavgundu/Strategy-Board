/* tslint:disable */
/* eslint-disable */

/**
 * Fuzzy-match a search term against a target string.
 * Returns `{ score, matchedIndices }` or `null` when there is no match.
 */
export function fuzzyMatchCore(search_term: string, target: string, original_target?: string | null): any;

/**
 * Score a batch of items against a search term.
 * `items`: `[{ name, nameLower, details, detailsLower, key, keyLower }]`.
 * Returns `[{ index, score, matchedIndices }]` sorted by score descending.
 */
export function fuzzySearchBatch(items: any, search_lower: string, min_score: number): any;

/**
 * Serialize a plain match-state object into the positional packet array.
 */
export function matchStateToPacket(state: any): any;

/**
 * Parse a positional packet array into named match fields plus options.
 * Throws on structurally corrupt packets, like the original TS parser did.
 */
export function packetToMatchFields(value: any): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly fuzzyMatchCore: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly fuzzySearchBatch: (a: any, b: number, c: number, d: number) => [number, number, number];
    readonly matchStateToPacket: (a: any) => [number, number, number];
    readonly packetToMatchFields: (a: any) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
