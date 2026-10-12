<script lang="ts">
  import { SCHEDULE_SOURCE_NAMES } from "$lib/domain";
  import { scheduleSync } from "$lib/stores/sync.svelte";

  let draft = $state(scheduleSync.manualEventKey ?? "");
  let error = $state("");
  const status = $derived(scheduleSync.status);
  const event = $derived(scheduleSync.currentEvent);

  async function save(event: SubmitEvent) {
    event.preventDefault();
    try {
      await scheduleSync.setManualEventKey(draft);
      draft = scheduleSync.manualEventKey ?? "";
      error = "";
      if (scheduleSync.manualEventKey) void scheduleSync.syncNow();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "Could not save the event key.";
    }
  }

  async function clear() {
    await scheduleSync.setManualEventKey(null);
    draft = "";
    error = "";
    void scheduleSync.syncNow();
  }
</script>

<div class="flex flex-col gap-5">
  <p id="current-event-detected" class="text-base text-[#e8e8e8]">
    {#if scheduleSync.manualEventKey}
      Following <span class="font-mono">{scheduleSync.manualEventKey}</span>, entered by hand. Clear it to let the board detect the event.
    {:else if event && event.source !== "manual"}
      Detected {event.name ?? event.eventKey} (<span class="font-mono">{event.eventKey}</span>) from {SCHEDULE_SOURCE_NAMES[event.source]}.
    {:else}
      No event detected yet. The board looks for a Nexus event running today with 1690 on its schedule, then for 1690's events on The Blue Alliance.
    {/if}
  </p>
  <form class="flex flex-wrap items-center gap-3" onsubmit={save}>
    <input
      id="current-event-key-input"
      placeholder="Event key, like 2026isde1"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      class="w-64 p-3 text-base text-center text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0 font-mono"
      bind:value={draft}
    />
    <button id="current-event-save-btn" type="submit" class="px-5 py-3 btn-secondary">Use this event</button>
    {#if scheduleSync.manualEventKey}
      <button id="current-event-clear-btn" type="button" class="px-5 py-3 btn-danger" onclick={clear}>Clear</button>
    {/if}
  </form>
  {#if error}<p class="text-sm text-[#e89090]" role="alert">{error}</p>{/if}

  <div class="flex flex-wrap items-center gap-4">
    <button
      id="current-event-sync-btn"
      class="flex items-center gap-2 px-5 py-3 btn-secondary disabled:opacity-40"
      disabled={status.state === "syncing"}
      onclick={() => void scheduleSync.syncNow()}
    >
      <i class="fas fa-rotate" class:fa-spin={status.state === "syncing"}></i>
      Sync now
    </button>
    {#if status.message}
      <p id="current-event-status" class="text-sm {status.state === 'error' ? 'text-[#e89090]' : 'text-[#999]'}">{status.message}</p>
    {/if}
  </div>

  <p class="text-xs text-[#666]">
    Schedules come from <a href="https://frc.nexus" target="_blank" rel="noopener noreferrer" class="text-[#60a5fa] underline">frc.nexus</a> and <a href="https://www.thebluealliance.com" target="_blank" rel="noopener noreferrer" class="text-[#60a5fa] underline">The Blue Alliance</a>.
  </p>
</div>
