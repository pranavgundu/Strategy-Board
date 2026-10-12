<script lang="ts">
  import { onMount } from "svelte";
  import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
  import "@fortawesome/fontawesome-free/css/solid.min.css";
  import "@fortawesome/fontawesome-free/css/regular.min.css";
  import "../app.css";
  import { app } from "$lib/stores/app.svelte";
  import { boardConfig } from "$lib/stores/config.svelte";
  import { scheduleSync } from "$lib/stores/sync.svelte";
  import { toast } from "$lib/stores/toast.svelte";
  import { native } from "$lib/native/api";
  import { buildCommit, isNativeRuntime, newId, safeFilename, shareBoardFile, timeAgo } from "$lib/features";
  import { BoardFileError, encodeMatchFile, groupMatchesByEvent, identityKey, planTbaImport, readBoardFile, readExtras, scheduleSort, toWhatIfMatch } from "$lib/domain";
  import { queueBadge } from "$lib/features/queue";
  import { registerServiceWorker, requestPersistentStorage } from "$lib/features/offline";
  import AppLoading from "$lib/components/AppLoading.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import HomeToolbar from "$lib/components/HomeToolbar.svelte";
  import MatchEditorModal from "$lib/components/MatchEditorModal.svelte";
  import MatchList from "$lib/components/MatchList.svelte";
  import OrientationWarning from "$lib/components/OrientationWarning.svelte";
  import QrExportModal from "$lib/components/QrExportModal.svelte";
  import QrImportModal from "$lib/components/QrImportModal.svelte";
  import SettingsScreen from "$lib/components/SettingsScreen.svelte";
  import SyncStatusLine from "$lib/components/SyncStatusLine.svelte";
  import TbaImportModal from "$lib/components/TbaImportModal.svelte";
  import WhiteboardScreen from "$lib/components/WhiteboardScreen.svelte";
  import type { Match, MatchFormValues, MatchGroup } from "$lib/components/types";
  import type { MatchPacket, StrategyMatch } from "$lib/native/types";

  let createOpen = $state(false);
  let clearOpen = $state(false);
  let tbaOpen = $state(false);
  let qrImportOpen = $state(false);
  let settingsOpen = $state(false);
  let editing = $state<Match | null>(null);
  let qrMatch = $state<Match | null>(null);
  let fileInput = $state<HTMLInputElement>();
  const latestToast = $derived(toast.messages.at(-1));
  let pngRequest = $state(0);

  function asMatch(match: StrategyMatch): Match {
    return {
      id: match.id, matchName: match.matchName,
      redOne: match.red[0], redTwo: match.red[1], redThree: match.red[2],
      blueOne: match.blue[0], blueTwo: match.blue[1], blueThree: match.blue[2],
      tbaMatchKey: match.tbaMatchKey,
    };
  }
  let collapsedGroups = $state<Record<string, boolean>>({});
  let deletingGroup = $state<MatchGroup | null>(null);

  function identityOf(packet: MatchPacket): string | null {
    const marker = readExtras(packet).sync;
    return marker ? identityKey(marker) : null;
  }

  // the Current Event comes first, in schedule order and led by the Next Match; past events start collapsed
  const groups = $derived.by((): MatchGroup[] => {
    const queue = scheduleSync.queue;
    const current = scheduleSync.currentEvent;
    const currentKey = current?.eventKey ?? null;
    const dismissed = scheduleSync.dismissed;
    const byId = new Map(app.matches.map((match) => [match.id, match]));
    const grouped = groupMatchesByEvent(app.matches.map((match) => match.packet), currentKey);
    if (currentKey && dismissed[currentKey]?.length && !grouped.some((group) => group.eventKey === currentKey)) grouped.unshift({ eventKey: currentKey, current: true, packets: [] });
    return grouped.map((group) => {
      const info = queue && queue.eventKey === group.eventKey ? queue : null;
      const sorted = group.eventKey ? scheduleSort(group.packets, info?.schedule ?? {}) : group.packets;
      const next = info ? sorted.find((packet) => identityOf(packet) === info.nextMatch) : undefined;
      const key = group.eventKey ?? "what-if";
      return {
        key,
        eventKey: group.eventKey,
        title: group.eventKey === null ? "What-if Matches" : group.current && current?.name ? `${current.name} · ${group.eventKey}` : group.eventKey,
        current: group.current,
        collapsed: collapsedGroups[key] ?? Boolean(currentKey && group.eventKey && !group.current),
        dismissedCount: group.eventKey ? dismissed[group.eventKey]?.length ?? 0 : 0,
        matches: [...(next ? [next] : []), ...sorted.filter((packet) => packet !== next)].map((packet) => {
          const identity = info ? identityOf(packet) : null;
          return { ...asMatch(byId.get(packet[7])!), next: packet === next, queue: identity && info ? queueBadge(info.schedule[identity]) : null };
        }),
      };
    });
  });

  async function deleteMatch(match: Match) {
    const packet = app.matches.find((candidate) => candidate.id === match.id)?.packet;
    try {
      if (packet) await scheduleSync.dismiss([packet]);
      await app.deleteMatch(match.id);
    } catch {
      notice("Could not delete this match.");
    }
  }

  async function deleteEvent(group: MatchGroup) {
    const ids = new Set(group.matches.map((match) => match.id));
    const packets = app.matches.filter((match) => ids.has(match.id)).map((match) => match.packet);
    try {
      await scheduleSync.dismiss(packets);
      await app.deleteMatches([...ids]);
      notice(`Deleted ${group.eventKey}.`);
    } catch {
      notice("Could not delete this event.");
    } finally {
      deletingGroup = null;
    }
  }

  async function restoreEvent(group: MatchGroup) {
    if (!group.eventKey) return;
    await scheduleSync.restore(group.eventKey);
    notice(group.current ? "Restoring deleted matches from the schedule." : `Deleted matches of ${group.eventKey} will come back when it is the Current Event.`);
  }

  onMount(() => {
    registerServiceWorker();
    requestPersistentStorage();
    const openExternal = (event: MouseEvent) => {
      if (!isNativeRuntime() || event.defaultPrevented || event.button !== 0) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[target="_blank"]') : null;
      if (!anchor) return;
      event.preventDefault();
      void native.platform.openUrl(anchor.href).catch(() => notice("Could not open that link."));
    };
    window.addEventListener("click", openExternal);
    void boardConfig.init();
    void app.init();
    const stopSync = scheduleSync.start();
    return () => { stopSync(); window.removeEventListener("click", openExternal); };
  });

  function notice(message: string) {
    toast.show(message, "info", 3500);
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
    try {
      await app.updateMatch(editing.id, { ...values, matchName: values.matchName.trim() || "Untitled match" });
      editing = null;
    } catch {
      notice("Could not save your changes.");
    }
  }

  async function importTba(eventKey: string, teamNumber: string) {
    try {
      const matches = await native.tba.matchesAtEvent(eventKey);
      const team = teamNumber.replace(/^frc/i, "") || null;
      const packets = planTbaImport({ packets: app.packets, matches, eventKey, team, currentEventKey: scheduleSync.currentEvent?.eventKey ?? null, newId });
      if (!packets.length) {
        notice(matches.length ? "Those matches are already on the board." : "No matches were found for that event and team.");
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

  async function saveAsFile(match: Match) {
    const source = app.matches.find((candidate) => candidate.id === match.id);
    if (!source) return;
    try {
      const result = await shareBoardFile(encodeMatchFile(source.packet), { filename: `${safeFilename(source.matchName || "match")} match`, title: source.matchName || "Match" });
      if (result.saved) notice("Match file saved.");
    } catch {
      notice("Could not save this match as a file.");
    }
  }

  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const chosen = input.files?.[0];
    input.value = "";
    if (!chosen) return;
    try {
      const file = readBoardFile(await chosen.text());
      await app.importPackets([file.packet]);
      notice(`Imported "${file.packet[0] || "Untitled match"}" as a what-if match.`);
    } catch (error) {
      notice(error instanceof BoardFileError ? error.message : "Could not import that file.");
    }
  }

  async function importQr(packet: MatchPacket) {
    await app.importPackets([toWhatIfMatch(packet)]);
  }

</script>

<svelte:head><title>Orbit Strategy Board</title><meta name="description" content="Orbit 1690's match strategy whiteboard for FRC" /></svelte:head>

{#if app.loading}<AppLoading />{/if}
<OrientationWarning />

{#if app.screen === "home"}
  <div id="home-container" class="flex flex-col w-full h-full touch-none">
    <HomeToolbar onNew={() => createOpen = true} onTba={() => tbaOpen = true} onImportQr={() => qrImportOpen = true} onImportFile={() => fileInput?.click()} onClear={() => clearOpen = true} onSettings={() => settingsOpen = true} />
    <MatchList
      {groups}
      onToggleGroup={(group) => (collapsedGroups = { ...collapsedGroups, [group.key]: !group.collapsed })}
      onDeleteEvent={(group) => (deletingGroup = group)}
      onRestoreEvent={restoreEvent}
      onOpen={(match) => app.openMatch(match.id)} onEdit={(match) => editing = match} onDuplicate={(match) => app.duplicateMatch(match.id)} onExportPng={(match) => { app.openMatch(match.id); pngRequest += 1; }} onExportQr={(match) => qrMatch = match} onSaveFile={saveAsFile} onDelete={deleteMatch} />
    <div
      id="home-bottom-bar"
      class="w-full bg-[#0d0d0d] flex items-center justify-center border-t border-[#1a1a1a] relative"
      style="min-height: 4rem; padding-bottom: env(safe-area-inset-bottom, 0px);"
    >
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
      <div class="absolute right-6 max-w-[60%]" style="top: 50%; transform: translateY(-50%);">
        <SyncStatusLine />
      </div>
    </div>
  </div>
{/if}

<SettingsScreen open={settingsOpen && app.screen === "home"} onClose={() => settingsOpen = false} />
<WhiteboardScreen {pngRequest} onNotice={notice} />
<MatchEditorModal open={createOpen} onSave={create} onClose={() => createOpen = false} />
<MatchEditorModal open={editing !== null} match={editing} onSave={save} onClose={() => editing = null} />
<ConfirmModal
  open={deletingGroup !== null}
  title="Delete {deletingGroup?.eventKey}?"
  message="This deletes all {deletingGroup?.matches.length} matches of {deletingGroup?.eventKey}. Schedule Sync won't add them again unless you restore them."
  confirmLabel="Delete event"
  destructive
  onConfirm={() => { if (deletingGroup) void deleteEvent(deletingGroup); }}
  onClose={() => (deletingGroup = null)}
/>
<ConfirmModal open={clearOpen} title="Clear All Data?" message="This will permanently delete all matches and data. This action cannot be undone." confirmLabel="Clear All" destructive onConfirm={async () => { await app.clearAll(); clearOpen = false; }} onClose={() => clearOpen = false} />
<TbaImportModal open={tbaOpen} onImport={importTba} onClose={() => tbaOpen = false} />
<QrImportModal open={qrImportOpen} onImport={importQr} onNotice={notice} onClose={() => qrImportOpen = false} />
<QrExportModal open={qrMatch !== null} packet={qrMatch ? app.matches.find((match) => match.id === qrMatch?.id)?.packet ?? null : null} matchName={qrMatch?.matchName || "this match"} onNotice={notice} onClose={() => qrMatch = null} />
<input bind:this={fileInput} id="home-import-file-input" type="file" accept=".txt,.json,text/plain,application/json" class="hidden" onchange={importFile} />
{#if latestToast}<button class="toast" class:toast-error={latestToast.kind === "error"} onclick={() => toast.dismiss(latestToast.id)} aria-live="polite">{latestToast.text}</button>{/if}

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
  .toast-error {
    color: #e89090;
    border-color: #4a2020;
  }
</style>
