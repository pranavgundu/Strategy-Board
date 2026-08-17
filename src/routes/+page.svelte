<script lang="ts">
  import { onMount } from "svelte";
  import "../app.css";
  import { app } from "$lib/stores/app.svelte";
  import { native } from "$lib/native/api";
  import { buildCommit, dismissRelease, isNativeRuntime, isReleaseDismissed, loadTeamNumber, parseShareCode, removeShareCodeFromUrl, saveTeamNumber, timeAgo } from "$lib/features";
  import AppLoading from "$lib/components/AppLoading.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import ContributorsModal from "$lib/components/ContributorsModal.svelte";
  import HomeToolbar from "$lib/components/HomeToolbar.svelte";
  import LinkImportModal from "$lib/components/LinkImportModal.svelte";
  import MatchEditorModal from "$lib/components/MatchEditorModal.svelte";
  import MatchList from "$lib/components/MatchList.svelte";
  import OrientationWarning from "$lib/components/OrientationWarning.svelte";
  import QrExportModal from "$lib/components/QrExportModal.svelte";
  import QrImportModal from "$lib/components/QrImportModal.svelte";
  import ReleaseAnnouncementModal from "$lib/components/ReleaseAnnouncementModal.svelte";
  import ShareModal from "$lib/components/ShareModal.svelte";
  import TbaImportModal from "$lib/components/TbaImportModal.svelte";
  import TeamNumberModal from "$lib/components/TeamNumberModal.svelte";
  import WhiteboardScreen from "$lib/components/WhiteboardScreen.svelte";
  import type { Match, MatchFormValues } from "$lib/components/types";
  import type { MatchPacket, ReleaseAnnouncement, StrategyMatch } from "$lib/native/types";

  let createOpen = $state(false);
  let clearOpen = $state(false);
  let tbaOpen = $state(false);
  let linkOpen = $state(false);
  let qrImportOpen = $state(false);
  let contributorsOpen = $state(false);
  let releaseOpen = $state(false);
  let teamOpen = $state(false);
  let editing = $state<Match | null>(null);
  let qrMatch = $state<Match | null>(null);
  let shareLink = $state("");
  let toast = $state("");
  let pngRequest = $state(0);
  let releaseAnnouncement = $state<ReleaseAnnouncement | null>(null);

  function asMatch(match: StrategyMatch): Match {
    return {
      id: match.id, matchName: match.matchName,
      redOne: match.red[0], redTwo: match.red[1], redThree: match.red[2],
      blueOne: match.blue[0], blueTwo: match.blue[1], blueThree: match.blue[2],
      tbaMatchKey: match.tbaMatchKey,
    };
  }
  const matches = $derived(app.matches.map(asMatch));

  onMount(() => {
    let active = true;
    const openExternal = (event: MouseEvent) => {
      if (!isNativeRuntime() || event.defaultPrevented || event.button !== 0) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[target="_blank"]') : null;
      if (!anchor) return;
      event.preventDefault();
      void native.platform.openUrl(anchor.href).catch(() => notice("Could not open that link."));
    };
    window.addEventListener("click", openExternal);
    void (async () => {
      await app.init();
      const [teamNumber, config] = await Promise.all([loadTeamNumber().catch(() => null), native.config.current().catch(() => null)]);
      if (!active) return;
      teamOpen = teamNumber === null;
      const announcement = config?.releaseAnnouncement;
      if (announcement?.enabled && !(await isReleaseDismissed(announcement.id, announcement.showOnce))) {
        if (active) { releaseAnnouncement = announcement; releaseOpen = true; }
      }
      const code = parseShareCode();
      if (code && active && await importLink(code)) removeShareCodeFromUrl();
    })().catch(() => notice("Some startup services could not be loaded."));
    return () => { active = false; window.removeEventListener("click", openExternal); };
  });

  function notice(message: string) {
    toast = message;
    window.setTimeout(() => { if (toast === message) toast = ""; }, 3500);
  }

  async function create(values: MatchFormValues) {
    try {
      await app.createBasicMatch(values.matchName.trim() || "Untitled match", [values.redOne, values.redTwo, values.redThree], [values.blueOne, values.blueTwo, values.blueThree]);
      createOpen = false;
    } catch {
      notice("Could not create this match.");
    }
  }

  async function save(values: MatchFormValues) {
    if (!editing) return;
    const packet = structuredClone(app.matches.find((match) => match.id === editing?.id)?.packet) as MatchPacket | undefined;
    if (!packet) return;
    packet[0] = values.matchName.trim() || "Untitled match";
    packet[1] = values.redOne; packet[2] = values.redTwo; packet[3] = values.redThree;
    packet[4] = values.blueOne; packet[5] = values.blueTwo; packet[6] = values.blueThree;
    try {
      await app.commitPacket(packet);
      editing = null;
    } catch {
      notice("Could not save your changes.");
    }
  }

  async function importLink(code: string): Promise<boolean> {
    const shareCode = parseShareCode(code) ?? code.trim().split(/[/?#]/).filter(Boolean).at(-1) ?? "";
    if (!shareCode) { notice("Enter a valid Strategy Board share link or code."); return false; }
    try {
      const packet = await native.cloud.download(shareCode);
      if (!packet) {
        notice("That share link has expired or could not be found.");
        return false;
      }
      await app.importPackets([packet]);
      linkOpen = false;
      notice("Imported 1 match.");
      return true;
    } catch {
      notice("Could not import that share link.");
      return false;
    }
  }

  async function importTba(eventKey: string, teamNumber: string) {
    try {
      const rawMatches = await native.tba.matchesAtEvent(eventKey);
      const teamKey = teamNumber ? `frc${teamNumber.replace(/^frc/i, "")}` : "";
      const chosen = teamKey ? rawMatches.filter((match) => [...match.alliances.red.team_keys, ...match.alliances.blue.team_keys].includes(teamKey)) : rawMatches;
      const simple = await native.tba.simpleMatches(chosen);
      const packets = await Promise.all(simple.map((match) => native.matches.createPacket({
        matchName: match.match_name,
        redTeams: [match.red_teams[0] ?? "", match.red_teams[1] ?? "", match.red_teams[2] ?? ""],
        blueTeams: [match.blue_teams[0] ?? "", match.blue_teams[1] ?? "", match.blue_teams[2] ?? ""],
        tbaEventKey: eventKey,
        tbaMatchKey: match.match_key,
        tbaYear: Number(eventKey.slice(0, 4)) || undefined,
      })));
      if (!packets.length) {
        notice("No matches were found for that event and team.");
        return;
      }
      await app.importPackets(packets);
      tbaOpen = false;
      notice(`Imported ${packets.length} match${packets.length === 1 ? "" : "es"} from TBA.`);
    } catch {
      notice("TBA could not load those matches. Check the event key and API settings.");
      throw new Error("TBA import failed.");
    }
  }

  async function share(match: Match) {
    const source = app.matches.find((candidate) => candidate.id === match.id);
    if (!source) return;
    try {
      const code = await native.cloud.upload(source.packet);
      shareLink = `https://strategyboard.app/?share=${encodeURIComponent(code)}`;
    } catch {
      notice("Could not create a share link.");
    }
  }

  async function importQr(packet: MatchPacket) {
    await app.importPackets([packet]);
  }

  async function saveTeam(team: string) {
    await saveTeamNumber(team);
    teamOpen = false;
    notice(`Team ${team} saved.`);
  }

  async function dismissAnnouncement() {
    if (releaseAnnouncement) await dismissRelease(releaseAnnouncement.id, releaseAnnouncement.showOnce);
    releaseOpen = false;
  }
</script>

<svelte:head><title>Strategy Board</title><meta name="description" content="The Digital Strategy Whiteboard for FRC" /></svelte:head>

{#if app.loading}<AppLoading />{/if}
<OrientationWarning />

{#if app.screen === "home"}
  <div id="home-container" class="flex flex-col w-full h-full touch-none">
    <HomeToolbar onNew={() => createOpen = true} onTba={() => tbaOpen = true} onImportQr={() => qrImportOpen = true} onImportLink={() => linkOpen = true} onClear={() => clearOpen = true} />
    <MatchList {matches} onOpen={(match) => app.openMatch(match.id)} onEdit={(match) => editing = match} onDuplicate={(match) => app.duplicateMatch(match.id)} onExportPng={(match) => { app.openMatch(match.id); pngRequest += 1; }} onExportQr={(match) => qrMatch = match} onShare={share} onDelete={(match) => app.deleteMatch(match.id)} />
    <div
      id="home-bottom-bar"
      class="w-full bg-[#0d0d0d] flex items-center justify-center border-t border-[#1a1a1a] relative"
      style="min-height: 4rem; padding-bottom: env(safe-area-inset-bottom, 0px);"
    >
      <div class="flex items-center justify-center gap-4">
        <a
          href="https://github.com/pranavgundu/Strategy-Board"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center text-[#999] hover:text-[#ccc] transition-colors"
          aria-label="GitHub"
        >
          <i class="fab fa-github text-2xl leading-none"></i>
        </a>
        <a
          href="mailto:pranav@strategyboard.app"
          class="flex items-center justify-center text-[#999] hover:text-[#ccc] transition-colors"
          aria-label="Contact"
        >
          <i class="fas fa-envelope text-2xl leading-none"></i>
        </a>
        <a
          href="/privacy"
          class="text-xs text-[#999] hover:text-[#ccc] transition-colors"
        >
          Privacy
        </a>
      </div>
      <div id="last-commit-info" class="absolute left-6 text-[#999] text-xs" style="top: 50%; transform: translateY(-50%);">
        <a
          href={buildCommit.url}
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-[#999] transition-colors flex items-center gap-2"
          title="latest commit: {buildCommit.message}"
        >
          <span class="font-mono">{buildCommit.sha}</span>
          <span>•</span>
          <span>{timeAgo(new Date(buildCommit.date))}</span>
        </a>
      </div>
      <button
        id="contributors-link-btn"
        class="absolute right-6 flex items-center text-[#999] hover:text-[#ccc] transition-colors text-base"
        style="top: 50%; transform: translateY(-50%);"
        onclick={() => contributorsOpen = true}
      >
        strategyboard.app
      </button>
    </div>
  </div>
{/if}

<WhiteboardScreen {pngRequest} onNotice={notice} />
<MatchEditorModal open={createOpen} onSave={create} onClose={() => createOpen = false} />
<MatchEditorModal open={editing !== null} match={editing} onSave={save} onClose={() => editing = null} />
<ConfirmModal open={clearOpen} title="Clear All Data?" message="This will permanently delete all matches and data. This action cannot be undone." confirmLabel="Clear All" destructive onConfirm={async () => { await app.clearAll(); clearOpen = false; }} onClose={() => clearOpen = false} />
<TbaImportModal open={tbaOpen} onImport={importTba} onClose={() => tbaOpen = false} />
<LinkImportModal open={linkOpen} onClose={() => linkOpen = false} onImport={importLink} />
<QrImportModal open={qrImportOpen} onImport={importQr} onNotice={notice} onClose={() => qrImportOpen = false} />
<QrExportModal open={qrMatch !== null} packet={qrMatch ? app.matches.find((match) => match.id === qrMatch?.id)?.packet ?? null : null} matchName={qrMatch?.matchName || "this match"} onNotice={notice} onClose={() => qrMatch = null} />
<ShareModal open={Boolean(shareLink)} {shareLink} onNotice={notice} onClose={() => shareLink = ""} />
<ContributorsModal open={contributorsOpen} onClose={() => contributorsOpen = false} />
<ReleaseAnnouncementModal open={releaseOpen} announcement={releaseAnnouncement} onDismiss={dismissAnnouncement} onClose={() => releaseOpen = false} />
<TeamNumberModal open={teamOpen} onSave={saveTeam} />
{#if toast}<button class="toast" onclick={() => toast = ""} aria-live="polite">{toast}</button>{/if}

<style>
  /* Transient status messages have no pre-rewrite counterpart; styled to match
     the surrounding surfaces rather than introduce a new palette. */
  .toast {
    position: fixed;
    bottom: max(1.25rem, env(safe-area-inset-bottom));
    left: 50%;
    z-index: 99998;
    max-width: calc(100vw - 2rem);
    padding: 0.75rem 1.25rem;
    transform: translateX(-50%);
    color: #e8e8e8;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    background: #141414;
    font-family: inherit;
    font-size: 1rem;
  }
</style>
