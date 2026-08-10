<script module lang="ts">
  import { native } from "$lib/native/api";
  import type { JsonObject, JsonValue, StatboticsTeamYear } from "$lib/native/types";

  export interface StatboticsTeamView {
    number: string;
    name: string;
    totalEpa: number | null;
    autoEpa: number | null;
    teleopEpa: number | null;
    endgameEpa: number | null;
    rank: number | null;
    percentile: number | null;
    unavailable: boolean;
  }

  interface StatboticsView {
    matchKey: string;
    cacheTimestamp: number | null;
    redWinProbability: number;
    blueWinProbability: number;
    redScore: number | null;
    blueScore: number | null;
    scoresAreFinal: boolean;
    usedEstimate: boolean;
    red: StatboticsTeamView[];
    blue: StatboticsTeamView[];
  }

  // Shared in-flight/result promises prevent duplicate IPC and HTTP work when
  // the panel is temporarily hidden or remounted for the same match.
  const requests = new Map<string, Promise<StatboticsView>>();

  function isObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function valueAt(value: JsonObject | null | undefined, path: string[]): JsonValue | undefined {
    let current: JsonValue | undefined = value ?? undefined;
    for (const key of path) {
      if (!isObject(current)) return undefined;
      current = current[key];
    }
    return current;
  }

  function numberAt(value: JsonObject | null | undefined, path: string[]): number | null {
    const candidate = valueAt(value, path);
    return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
  }

  function parseTeamNumber(value: string): number | null {
    const cleaned = value.trim().replace(/^frc/i, "");
    return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
  }

  function round(value: number | null, digits = 1): string {
    return value === null ? "—" : value.toFixed(digits);
  }

  function buildTeam(number: string, data: StatboticsTeamYear | null): StatboticsTeamView {
    if (!data) {
      return { number, name: `Team ${number}`, totalEpa: null, autoEpa: null, teleopEpa: null, endgameEpa: null, rank: null, percentile: null, unavailable: true };
    }
    const total = numberAt(data.epa, ["total_points", "mean"])
      ?? numberAt(data.epa, ["stats", "max"])
      ?? numberAt(data.epa, ["stats", "start"]);
    return {
      number,
      name: data.name ?? `Team ${number}`,
      totalEpa: total,
      autoEpa: numberAt(data.epa, ["breakdown", "auto_points"]),
      teleopEpa: numberAt(data.epa, ["breakdown", "teleop_points"]),
      endgameEpa: numberAt(data.epa, ["breakdown", "endgame_points"]),
      rank: numberAt(data.epa, ["ranks", "total", "rank"]),
      percentile: numberAt(data.epa, ["ranks", "total", "percentile"]),
      unavailable: false,
    };
  }

  async function loadView(matchKey: string, teams: readonly string[], year: number): Promise<StatboticsView> {
    const uniqueNumbers = [...new Set(teams.map(parseTeamNumber).filter((team): team is number => team !== null))];
    const teamResults = new Map<number, StatboticsTeamYear | null>();
    const [matchResult] = await Promise.all([
      native.statbotics.match(matchKey).catch(() => null),
      Promise.all(uniqueNumbers.map(async (team) => {
        try { teamResults.set(team, await native.statbotics.teamYear(team, year)); }
        catch { teamResults.set(team, null); }
      })),
    ]);

    const red = teams.slice(0, 3).map((team) => buildTeam(team, teamResults.get(parseTeamNumber(team) ?? -1) ?? null));
    const blue = teams.slice(3).map((team) => buildTeam(team, teamResults.get(parseTeamNumber(team) ?? -1) ?? null));
    const redTotal = red.reduce((sum, team) => sum + (team.totalEpa ?? 0), 0);
    const blueTotal = blue.reduce((sum, team) => sum + (team.totalEpa ?? 0), 0);
    const estimatedRedProbability = redTotal + blueTotal > 0 ? redTotal / (redTotal + blueTotal) : 0.5;
    const predictedRedProbability = numberAt(matchResult?.pred, ["red_win_prob"]);
    const redWinProbability = predictedRedProbability ?? estimatedRedProbability;
    const resultRedScore = numberAt(matchResult?.result, ["red_score"]);
    const resultBlueScore = numberAt(matchResult?.result, ["blue_score"]);
    const predictedRedScore = numberAt(matchResult?.pred, ["red_score"]);
    const predictedBlueScore = numberAt(matchResult?.pred, ["blue_score"]);

    if (!matchResult && [...teamResults.values()].every((team) => team === null)) {
      throw new Error("Statbotics did not return match or team data.");
    }
    return {
      matchKey,
      cacheTimestamp: await native.statbotics.cacheTimestamp(matchKey).catch(() => null),
      redWinProbability,
      blueWinProbability: 1 - redWinProbability,
      redScore: resultRedScore ?? predictedRedScore,
      blueScore: resultBlueScore ?? predictedBlueScore,
      scoresAreFinal: resultRedScore !== null && resultBlueScore !== null,
      usedEstimate: predictedRedProbability === null,
      red,
      blue,
    };
  }

  function cachedView(matchKey: string, teams: readonly string[], year: number): Promise<StatboticsView> {
    const existing = requests.get(matchKey);
    if (existing) return existing;
    const request = loadView(matchKey, teams, year);
    requests.set(matchKey, request);
    void request.catch(() => requests.delete(matchKey));
    return request;
  }
</script>

<script lang="ts">
  import type { StrategyMatch } from "$lib/native/types";

  let { match, visible = true }: { match: StrategyMatch | null; visible?: boolean } = $props();
  let data = $state<StatboticsView | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let selectedTeam = $state<StatboticsTeamView | null>(null);
  let requestToken = 0;
  let retryVersion = $state(0);

  function hasTbaIdentity(current: StrategyMatch | null): current is StrategyMatch & { tbaEventKey: string; tbaMatchKey: string; tbaYear: number } {
    return Boolean(current?.tbaEventKey && current.tbaMatchKey && current.tbaYear && Number.isFinite(current.tbaYear));
  }

  function formattedTime(timestamp: number | null): string | null {
    return timestamp === null ? null : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
  }

  function retry(): void {
    if (data) requests.delete(data.matchKey);
    retryVersion += 1;
  }

  $effect(() => {
    const current = match;
    const forceReload = retryVersion;
    const token = ++requestToken;
    if (!visible || !hasTbaIdentity(current)) {
      loading = false;
      error = null;
      data = null;
      return;
    }
    const teams = [...current.red, ...current.blue];
    const matchKey = current.tbaMatchKey;
    if (forceReload) requests.delete(matchKey);
    loading = true;
    error = null;
    data = null;
    selectedTeam = null;
    void cachedView(matchKey, teams, current.tbaYear).then(
      (next) => { if (token === requestToken) { data = next; loading = false; } },
      (reason: unknown) => {
        if (token === requestToken) {
          error = reason instanceof Error ? reason.message : "Could not load Statbotics data.";
          loading = false;
        }
      },
    );
  });
</script>

{#if visible}
  {#if !hasTbaIdentity(match) || error}
    <div id="statbotics-empty-state" class="flex flex-col items-center justify-center h-full p-4 md:p-8" role="status">
      <i class="fa fa-chart-line text-6xl text-[#999] mb-4"></i>
      <h2 class="text-2xl font-bold text-[#e8e8e8] mb-2">Stats Data Not Available</h2>
      <p class="text-[#666] text-center max-w-md">
        {#if error}
          {error}
        {:else}
          This match was not imported from The Blue Alliance. Stats analytics are only available for TBA-imported matches.
        {/if}
      </p>
      {#if error}
        <button class="px-6 py-3 btn-secondary mt-4" onclick={retry}>Retry</button>
      {/if}
    </div>
  {:else if loading}
    <div id="statbotics-loading-state" class="flex flex-col items-center justify-center h-full p-4 md:p-8" role="status">
      <div class="flex flex-col items-center">
        <div class="relative w-16 h-16 mb-4">
          <div class="absolute inset-0 border-4 border-[#222] rounded-full"></div>
          <div class="absolute inset-0 border-4 border-[#888] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h2 class="text-xl font-bold text-[#e8e8e8] mb-2">Loading Stats...</h2>
        <p class="text-[#666] text-center">Fetching data from Statbotics</p>
      </div>
    </div>
  {:else if data}
    <div id="statbotics-data-container" class="flex flex-col p-4 md:p-8">
      {#if formattedTime(data.cacheTimestamp)}
        <p id="statbotics-last-updated" class="text-xs text-[#666] text-right mb-2">Last updated {formattedTime(data.cacheTimestamp)}</p>
      {/if}

      <div class="bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-4 md:p-6 mb-4">
        <h3 class="text-xl md:text-2xl font-bold text-[#e8e8e8] mb-3 text-center">Win Probability</h3>
        <div class="flex items-center gap-3 mb-3">
          <span class="text-red-400 font-bold text-lg w-14">Red</span>
          <div class="flex-1 flex h-6 rounded-full overflow-hidden">
            <div id="statbotics-prob-bar-red" class="bg-red-500 transition-all duration-500" style="width: {Math.max(0, Math.min(100, data.redWinProbability * 100))}%"></div>
            <div id="statbotics-prob-bar-blue" class="bg-blue-500 transition-all duration-500" style="width: {Math.max(0, Math.min(100, data.blueWinProbability * 100))}%"></div>
          </div>
          <span class="text-blue-400 font-bold text-lg w-14 text-right">Blue</span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span id="statbotics-red-win-prob" class="text-red-400 text-xl font-bold">{round(data.redWinProbability * 100, 0)}%</span>
          <span id="statbotics-blue-win-prob" class="text-blue-400 text-xl font-bold">{round(data.blueWinProbability * 100, 0)}%</span>
        </div>
        {#if data.redScore !== null && data.blueScore !== null}
          <div class="text-center mt-3 pt-3 border-t border-[#1e1e1e]">
            <span id="statbotics-match-result" class="text-sm md:text-base font-semibold text-[#999]">
              {data.scoresAreFinal ? "Final" : "Predicted"} {round(data.redScore, 0)} – {round(data.blueScore, 0)}
            </span>
          </div>
        {/if}
      </div>

      {@render allianceCard("Red Alliance", "red", data.red)}
      {@render allianceCard("Blue Alliance", "blue", data.blue)}

      {#if selectedTeam}
        <div id="epa-details-modal" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) selectedTeam = null; }}>
          <div class="bg-[#141414] rounded-[6px] p-6 max-w-md w-full border border-[#1e1e1e]" role="dialog" aria-modal="true">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-[#e8e8e8]">Team <span id="epa-modal-team">{selectedTeam.number}</span> Stats</h3>
              <button
                id="epa-modal-close"
                class="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#999] hover:text-[#e8e8e8] transition-colors"
                onclick={() => (selectedTeam = null)}
                aria-label="Close team stats"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="space-y-3">
              <div class="flex justify-between"><span class="text-[#999]">Total EPA:</span><span id="epa-modal-total" class="text-white font-bold">{round(selectedTeam.totalEpa)}</span></div>
              <div class="flex justify-between"><span class="text-[#999]">Auto Points:</span><span id="epa-modal-auto" class="text-white font-bold">{round(selectedTeam.autoEpa)}</span></div>
              <div class="flex justify-between"><span class="text-[#999]">Teleop Points:</span><span id="epa-modal-teleop" class="text-white font-bold">{round(selectedTeam.teleopEpa)}</span></div>
              <div class="flex justify-between"><span class="text-[#999]">Endgame Points:</span><span id="epa-modal-endgame" class="text-white font-bold">{round(selectedTeam.endgameEpa)}</span></div>
              <div class="flex justify-between pt-2 border-t border-[#1e1e1e]"><span class="text-[#999]">Rank:</span><span id="epa-modal-rank" class="text-white font-bold">{selectedTeam.rank === null ? "--" : `#${round(selectedTeam.rank, 0)}`}</span></div>
              <div class="flex justify-between"><span class="text-[#999]">Percentile:</span><span id="epa-modal-percentile" class="text-white font-bold">{selectedTeam.percentile === null ? "--" : `${round(selectedTeam.percentile * 100, 1)}%`}</span></div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
{/if}

{#snippet allianceCard(title: string, alliance: "red" | "blue", teams: StatboticsTeamView[])}
  <div class="bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-4 md:p-6 mb-4">
    <h3 class="text-xl md:text-2xl font-bold mb-3 {alliance === 'red' ? 'text-[#c97070]' : 'text-[#6090c9]'}">{title}</h3>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {#each teams as team, index (`${alliance}-${team.number}-${index}`)}
        <div
          class="bg-[#111111] border border-[#1e1e1e] rounded-[6px] p-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
          data-team-index="{alliance}-{index + 1}"
          role="button"
          tabindex="0"
          onclick={() => { if (!team.unavailable) selectedTeam = team; }}
          onkeydown={(event) => { if ((event.key === "Enter" || event.key === " ") && !team.unavailable) selectedTeam = team; }}
        >
          <div class="text-[#e8e8e8] text-base font-semibold mb-1">Team <span>{team.number}</span></div>
          <div class="text-2xl font-bold {alliance === 'red' ? 'text-[#c97070]' : 'text-[#6090c9]'}">
            <span>{team.unavailable ? "--" : round(team.totalEpa)}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/snippet}

