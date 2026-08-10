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
  <section class="statbotics-panel" aria-label="Statbotics match analytics" aria-busy={loading}>
    {#if !hasTbaIdentity(match)}
      <div class="empty-state" role="status"><h2>Stats data is not available</h2><p>Statbotics analytics are available only for matches imported from The Blue Alliance.</p></div>
    {:else if loading}
      <div class="empty-state" role="status"><span class="spinner" aria-hidden="true"></span><h2>Loading Statbotics data</h2><p>Using Strategy Board’s native cache when fresh data is available.</p></div>
    {:else if error}
      <div class="empty-state" role="alert"><h2>Couldn’t load match analytics</h2><p>{error}</p><button class="retry" type="button" onclick={retry}>Try again</button></div>
    {:else if data}
      <div class="panel-heading"><div><p class="eyebrow">Statbotics</p><h2>{data.matchKey}</h2></div>{#if formattedTime(data.cacheTimestamp)}<p class="cache-time">Cached {formattedTime(data.cacheTimestamp)}</p>{/if}</div>
      <article class="prediction-card">
        <h3>Win probability</h3>
        <div class="probability-labels"><strong class="red">Red {round(data.redWinProbability * 100, 0)}%</strong><strong class="blue">Blue {round(data.blueWinProbability * 100, 0)}%</strong></div>
        <div class="probability-bar" aria-label={`Red ${round(data.redWinProbability * 100, 0)} percent; Blue ${round(data.blueWinProbability * 100, 0)} percent`}><span class="red-fill" style={`width: ${Math.max(0, Math.min(100, data.redWinProbability * 100))}%`}></span><span class="blue-fill"></span></div>
        {#if data.redScore !== null && data.blueScore !== null}<p class="score-line">{data.scoresAreFinal ? "Final score" : "Predicted score"}: <span class="red">{round(data.redScore, 0)}</span> – <span class="blue">{round(data.blueScore, 0)}</span></p>{/if}
        {#if data.usedEstimate}<p class="estimate-note">Win probability is estimated from available team EPA because a match prediction was unavailable.</p>{/if}
      </article>
      <div class="alliances">
        <section class="alliance red-alliance"><h3>Red alliance</h3><div class="team-grid">{#each data.red as team (`red-${team.number}`)}{@render TeamCard(team, "red")}{/each}</div></section>
        <section class="alliance blue-alliance"><h3>Blue alliance</h3><div class="team-grid">{#each data.blue as team (`blue-${team.number}`)}{@render TeamCard(team, "blue")}{/each}</div></section>
      </div>
    {/if}
  </section>
{/if}

{#snippet TeamCard(team: StatboticsTeamView, alliance: "red" | "blue")}
  <article class:missing={team.unavailable} class={`team-card ${alliance}`}>
    <header><strong>Team {team.number}</strong><span>{team.unavailable ? "Unavailable" : round(team.totalEpa)}</span></header>
    <p class="team-name">{team.name}</p>
    {#if !team.unavailable}
      <dl><div><dt>Auto</dt><dd>{round(team.autoEpa)}</dd></div><div><dt>Teleop</dt><dd>{round(team.teleopEpa)}</dd></div><div><dt>Endgame</dt><dd>{round(team.endgameEpa)}</dd></div><div><dt>Rank</dt><dd>{team.rank === null ? "—" : `#${round(team.rank, 0)}`}</dd></div><div><dt>Percentile</dt><dd>{team.percentile === null ? "—" : `${round(team.percentile * 100, 1)}%`}</dd></div></dl>
    {/if}
  </article>
{/snippet}

<style>
  .statbotics-panel { color: #edf2f7; background: #0d1117; min-height: 100%; box-sizing: border-box; overflow: auto; padding: 1rem; }
  .empty-state { min-height: 20rem; max-width: 34rem; margin: auto; display: grid; place-content: center; text-align: center; gap: .5rem; color: #a9b6c4; }
  .empty-state h2 { color: #f3f6fa; margin: 0; font-size: 1.25rem; }.empty-state p { margin: 0; line-height: 1.5; }
  .spinner { width: 2rem; height: 2rem; margin: 0 auto .5rem; border: 3px solid #354252; border-top-color: #90caf9; border-radius: 50%; animation: spin .8s linear infinite; }
  .retry { justify-self: center; border: 1px solid #536578; border-radius: .4rem; background: #1c2733; color: #fff; padding: .5rem .8rem; cursor: pointer; }.retry:hover { background: #2a3948; }
  .panel-heading { display: flex; gap: 1rem; align-items: end; justify-content: space-between; margin: .1rem 0 1rem; }.eyebrow { color: #90caf9; font-size: .72rem; font-weight: 700; letter-spacing: .08em; margin: 0 0 .15rem; text-transform: uppercase; }.panel-heading h2 { font-size: 1.2rem; margin: 0; }.cache-time { color: #8b9bab; font-size: .75rem; margin: 0; text-align: right; }
  .prediction-card, .alliance { border: 1px solid #283544; border-radius: .6rem; background: #141b23; padding: 1rem; }.prediction-card { margin-bottom: 1rem; }.prediction-card h3, .alliance h3 { margin: 0 0 .75rem; font-size: 1rem; }.probability-labels { display: flex; justify-content: space-between; }.red { color: #ff8c8c; }.blue { color: #8cbcff; }.probability-bar { height: .65rem; display: flex; overflow: hidden; border-radius: 999px; background: #4178b5; margin: .45rem 0 .65rem; }.red-fill { background: #bd4444; transition: width .25s ease; }.blue-fill { flex: 1; }.score-line, .estimate-note { color: #bac7d4; margin: .4rem 0 0; }.estimate-note { font-size: .8rem; }
  .alliances { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }.red-alliance h3 { color: #ff9c9c; }.blue-alliance h3 { color: #9bc4ff; }.team-grid { display: grid; gap: .65rem; }.team-card { border: 1px solid #344454; border-left-width: .3rem; border-radius: .45rem; background: #10161d; padding: .7rem; }.team-card.red { border-left-color: #d34f4f; }.team-card.blue { border-left-color: #4d89cf; }.team-card.missing { opacity: .7; }.team-card header { display: flex; justify-content: space-between; align-items: baseline; }.team-card header span { font-size: 1.25rem; font-weight: 700; }.team-card.red header span { color: #ff8c8c; }.team-card.blue header span { color: #8cbcff; }.team-name { color: #aab7c4; font-size: .8rem; margin: .2rem 0 .55rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.team-card dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .35rem .7rem; margin: 0; }.team-card dl div { display: flex; justify-content: space-between; gap: .35rem; }.team-card dt { color: #8393a2; font-size: .75rem; }.team-card dd { color: #e4ebf2; font-size: .75rem; font-weight: 600; margin: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 760px) { .alliances { grid-template-columns: 1fr; }.statbotics-panel { padding: .75rem; } }
</style>
