import { native } from "$lib/native/api";

export const TEAM_NUMBER_KEY = "teamNumber";
export const RELEASE_DISMISSAL_KEY = "releaseAnnouncementDismissal";

export function normalizeTeamNumber(value: string): string | null {
  const normalized = value.trim();
  if (!/^[1-9]\d{0,4}$/.test(normalized)) return null;
  return normalized;
}

export async function loadTeamNumber(): Promise<string | null> {
  const value = await native.storage.get(TEAM_NUMBER_KEY);
  return typeof value === "string" ? normalizeTeamNumber(value) : null;
}

export async function saveTeamNumber(value: string): Promise<string> {
  const teamNumber = normalizeTeamNumber(value);
  if (!teamNumber) throw new Error("Team number must be between 1 and 99999");
  await native.storage.set(TEAM_NUMBER_KEY, teamNumber);
  return teamNumber;
}

export async function isReleaseDismissed(releaseId: string, showOnce: boolean): Promise<boolean> {
  if (!showOnce) return false;
  return (await native.storage.get(RELEASE_DISMISSAL_KEY)) === releaseId;
}

export async function dismissRelease(releaseId: string, showOnce: boolean): Promise<void> {
  if (showOnce) await native.storage.set(RELEASE_DISMISSAL_KEY, releaseId);
}
