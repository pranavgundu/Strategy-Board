<script lang="ts">
  import { app } from "$lib/stores/app.svelte";
  import { toast } from "$lib/stores/toast.svelte";
  import HomeToolbar from "./HomeToolbar.svelte";
  import MatchList from "./MatchList.svelte";
  import CreateMatchModal from "./CreateMatchModal.svelte";
  import EditMatchModal from "./EditMatchModal.svelte";
  import ClearConfirmModal from "./ClearConfirmModal.svelte";
  import TBAImportModal from "./TBAImportModal.svelte";
  import LinkImportModal from "./LinkImportModal.svelte";
  import ShareSuccessModal from "./ShareSuccessModal.svelte";
  import QRExportModal from "./QRExportModal.svelte";
  import QRImportModal from "./QRImportModal.svelte";
  import ContributorsModal from "./ContributorsModal.svelte";
  import Icon from "./Icon.svelte";
  import type { Match, MatchFormValues } from "./types";

  // Modal visibility is local UI state - none of it lives in the frozen
  // app/board/toast contract. Actions that need real service integration
  // (TBA search, QR encode/decode, cloud share) are stubbed with TODOs and
  // documented in the port report; wiring them up is follow-up work once
  // the logic layer exposes stores/services for them.
  let showCreate = $state(false);
  let showClear = $state(false);
  let showTBA = $state(false);
  let showLinkImport = $state(false);
  let showShareSuccess = $state(false);
  let showQRExport = $state(false);
  let showQRImport = $state(false);
  let showContributors = $state(false);

  let editingMatch = $state<Match | null>(null);

  function openMatch(match: Match) {
    app.openMatch(match.id);
  }

  function handleCreate(values: MatchFormValues) {
    app.createMatch(
      values.matchName,
      [values.redOne, values.redTwo, values.redThree],
      [values.blueOne, values.blueTwo, values.blueThree],
    );
    showCreate = false;
  }

  function handleEditSave(id: string, values: MatchFormValues) {
    // No explicit "update match" method exists in the frozen app store
    // contract yet. Mutate the matched entry in place - safe if
    // app.matches holds reactive ($state-backed) objects, which is the
    // expected shape for a runes port. Flagged in the port report.
    const match = app.matches.find((m) => m.id === id);
    if (match) {
      match.matchName = values.matchName;
      match.redOne = values.redOne;
      match.redTwo = values.redTwo;
      match.redThree = values.redThree;
      match.blueOne = values.blueOne;
      match.blueTwo = values.blueTwo;
      match.blueThree = values.blueThree;
    }
    editingMatch = null;
  }

  function handleDelete(match: Match) {
    app.deleteMatch(match.id);
  }

  function handleDuplicate(match: Match) {
    app.duplicateMatch(match.id);
  }

  function handleExportPNG(_match: Match) {
    // TODO: wire to the (not-yet-frozen) PNG export service.
    toast.show("PNG export is not wired up yet", "error");
  }

  function handleExportQR(_match: Match) {
    showQRExport = true;
  }

  function handleShare(_match: Match) {
    // TODO: wire to cloud.ts's uploadMatch() once exposed via a store.
    showShareSuccess = true;
  }

  function handleClearConfirm() {
    app.clearAll();
    showClear = false;
  }
</script>

<div
  id="home-container"
  class="flex flex-col w-full h-full touch-none"
  class:hidden={app.screen !== "home"}
>
  <HomeToolbar
    onNew={() => (showCreate = true)}
    onTBA={() => (showTBA = true)}
    onImportQR={() => (showQRImport = true)}
    onImportLink={() => (showLinkImport = true)}
    onClear={() => (showClear = true)}
  />

  <MatchList
    matches={app.matches}
    onOpen={openMatch}
    onEdit={(m) => (editingMatch = m)}
    onDuplicate={handleDuplicate}
    onExportPNG={handleExportPNG}
    onExportQR={handleExportQR}
    onShare={handleShare}
    onDelete={handleDelete}
  />

  <div
    id="home-bottom-bar"
    class="w-full bg-[#0d0d0d] flex items-center justify-center border-t border-[#1a1a1a] relative min-h-16"
    style="padding-top: env(safe-area-inset-bottom, 0px); padding-bottom: env(safe-area-inset-bottom, 0px);"
  >
    <div class="flex items-center justify-center gap-4">
      <a
        href="https://github.com/pranavgundu/Strategy-Board"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link flex items-center justify-center text-[#999] hover:text-[#ccc] transition-colors"
      >
        <Icon name="github" class="w-6 h-6" />
      </a>
      <a
        href="mailto:pranav@strategyboard.app"
        class="footer-link flex items-center justify-center text-[#999] hover:text-[#ccc] transition-colors"
      >
        <Icon name="envelope" class="w-6 h-6" />
      </a>
    </div>
    <button
      class="footer-link absolute right-6 flex items-center text-[#999] hover:text-[#ccc] transition-colors text-base top-1/2 -translate-y-1/2"
      onclick={() => (showContributors = true)}
    >
      strategyboard.app
    </button>
  </div>
</div>

<CreateMatchModal open={showCreate} onCreate={handleCreate} onCancel={() => (showCreate = false)} />

<EditMatchModal
  open={editingMatch !== null}
  match={editingMatch}
  onSave={handleEditSave}
  onCancel={() => (editingMatch = null)}
/>

<ClearConfirmModal open={showClear} onConfirm={handleClearConfirm} onCancel={() => (showClear = false)} />

<TBAImportModal
  open={showTBA}
  onSelectEvent={() => {}}
  onSelectTeam={() => {}}
  onAllMatches={() => {}}
  onImport={() => (showTBA = false)}
  onCancel={() => (showTBA = false)}
/>

<LinkImportModal
  open={showLinkImport}
  onImport={() => (showLinkImport = false)}
  onCancel={() => (showLinkImport = false)}
/>

<ShareSuccessModal
  open={showShareSuccess}
  shareCode="ABC123"
  shareLink="https://strategyboard.app/?share=ABC123"
  onCopyCode={() => {}}
  onCopyLink={() => {}}
  onClose={() => (showShareSuccess = false)}
/>

<QRExportModal
  open={showQRExport}
  onStart={() => {}}
  onExportPdf={() => {}}
  onClose={() => (showQRExport = false)}
/>

<QRImportModal open={showQRImport} onClose={() => (showQRImport = false)} />

<ContributorsModal
  open={showContributors}
  onRetry={() => {}}
  onClose={() => (showContributors = false)}
/>

<style>
  #home-bottom-bar {
    overflow: visible;
  }
  .footer-link:hover {
    color: #ffffff;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  }
</style>
