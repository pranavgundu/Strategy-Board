<script lang="ts">
  import { onMount } from "svelte";
  import { SCHEDULE_SOURCE_NAMES } from "$lib/domain";
  import { scheduleSync } from "$lib/stores/sync.svelte";

  const CREDITS = [
    { href: "https://frc.nexus", site: "frc.nexus" },
    { href: "https://www.thebluealliance.com", site: "The Blue Alliance" },
  ];

  let now = $state(Date.now());
  const status = $derived(scheduleSync.status);
  const updated = $derived(status.at === null ? "" : `updated ${ago(status.at)}`);
  const text = $derived.by(() => {
    if (status.state === "synced" || (status.state === "syncing" && status.at !== null)) return [status.source && SCHEDULE_SOURCE_NAMES[status.source], status.eventKey, updated].filter(Boolean).join(" · ");
    if (status.state === "syncing") return `Syncing ${status.eventKey ?? ""}…`;
    if ((status.state === "offline" || status.state === "error") && status.at !== null) return `${status.message} Last ${updated}.`;
    return status.message;
  });

  onMount(() => {
    const clock = window.setInterval(() => (now = Date.now()), 5_000);
    return () => window.clearInterval(clock);
  });

  function ago(at: number): string {
    const seconds = Math.max(0, Math.round((now - at) / 1000));
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    return hours < 24 ? `${hours} h ago` : `on ${new Date(at).toLocaleDateString()}`;
  }
</script>

{#if text}
  <div id="sync-status-line" class="flex items-center gap-2 min-w-0 text-xs text-[#999]" role="status" aria-live="polite">
    <span class="size-2 shrink-0 rounded-full state-{status.state}"></span>
    <span class="truncate">{text}</span>
    <span class="shrink-0">· Data from</span>
    {#each CREDITS as credit, index (credit.href)}
      {#if index > 0}<span class="shrink-0">and</span>{/if}
      <a class="flex items-center shrink-0 underline hover:text-[#e8e8e8]" href={credit.href} target="_blank" rel="noopener noreferrer">{credit.site}</a>
    {/each}
  </div>
{/if}

<style>
  .state-idle, .state-waiting, .state-offline { background: #666; }
  .state-syncing { background: #eab308; }
  .state-synced { background: #22c55e; }
  .state-error { background: #ef4444; }
</style>
