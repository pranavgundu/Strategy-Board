import { native } from "$lib/native/api";
import type { Contributor } from "$lib/native/types";

let contributorsPromise: Promise<Contributor[]> | null = null;
let teamsPromise: Promise<string[]> | null = null;

/** Native commands cache remote responses; this also de-duplicates concurrent modal opens. */
export function loadContributors(limit?: number): Promise<Contributor[]> {
  if (limit !== undefined) return native.github.contributors(Math.max(1, Math.floor(limit)));
  contributorsPromise ??= native.github.contributors();
  return contributorsPromise;
}

export function loadContributorTeams(): Promise<string[]> {
  teamsPromise ??= native.github.teams();
  return teamsPromise;
}

export function invalidateContributorsCache(): void {
  contributorsPromise = null;
  teamsPromise = null;
}
