import type { BoardConfig } from "./board-config";
import { isObject } from "./json";

export type ChecklistRowKind = "item" | "heading";
/** A Checklist Item, which can be ticked per Match, or a Heading that groups the Items below it. */
export interface ChecklistRow {
  id: string;
  kind: ChecklistRowKind;
  text: string;
}

export function addChecklistRow(config: BoardConfig, row: ChecklistRow): BoardConfig {
  if (config.checklist.some((existing) => existing.id === row.id)) throw new Error(`Checklist row ${row.id} already exists`);
  return { ...config, checklist: [...config.checklist, { ...row }] };
}

export function renameChecklistRow(config: BoardConfig, id: string, text: string): BoardConfig {
  return { ...config, checklist: config.checklist.map((row) => (row.id === id ? { ...row, text } : row)) };
}

/** Moves a row so it ends up at the given index, clamped to the Checklist. */
export function moveChecklistRow(config: BoardConfig, id: string, toIndex: number): BoardConfig {
  const from = config.checklist.findIndex((row) => row.id === id);
  if (from < 0) return config;
  const checklist = [...config.checklist];
  const [row] = checklist.splice(from, 1);
  checklist.splice(Math.max(0, Math.min(checklist.length, toIndex)), 0, row);
  return { ...config, checklist };
}

export function deleteChecklistRow(config: BoardConfig, id: string): BoardConfig {
  return { ...config, checklist: config.checklist.filter((row) => row.id !== id) };
}

/** Keeps valid rows in order; a repeated id keeps only its first row. */
export function readChecklist(value: unknown): ChecklistRow[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const rows: ChecklistRow[] = [];
  for (const row of value) {
    if (!isObject(row) || typeof row.id !== "string" || !row.id || seen.has(row.id)) continue;
    if ((row.kind !== "item" && row.kind !== "heading") || typeof row.text !== "string") continue;
    seen.add(row.id);
    rows.push({ id: row.id, kind: row.kind, text: row.text });
  }
  return rows;
}
