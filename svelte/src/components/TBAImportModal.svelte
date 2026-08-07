<script lang="ts">
  import Modal from "./Modal.svelte";
  import type { TBAEventOption, TBATeamOption } from "./types";

  // Presentational only: The Blue Alliance search/fetch logic lives in the
  // (not-yet-frozen) logic layer. This component just renders state handed
  // to it via props and reports user intent via callbacks.
  let {
    open,
    apiKey = $bindable(""),
    eventQuery = $bindable(""),
    teamQuery = $bindable(""),
    events = [],
    teams = [],
    selectedEventKey = null,
    selectedTeamNumber = null,
    statusMessage = "",
    onSelectEvent,
    onSelectTeam,
    onAllMatches,
    onImport,
    onCancel,
  }: {
    open: boolean;
    apiKey?: string;
    eventQuery?: string;
    teamQuery?: string;
    events?: TBAEventOption[];
    teams?: TBATeamOption[];
    selectedEventKey?: string | null;
    selectedTeamNumber?: string | null;
    statusMessage?: string;
    onSelectEvent: (key: string) => void;
    onSelectTeam: (number: string) => void;
    onAllMatches: () => void;
    onImport: () => void;
    onCancel: () => void;
  } = $props();

  let eventDropdownOpen = $state(false);
  let teamDropdownOpen = $state(false);
</script>

<Modal {open} onClose={onCancel} maxWidth="max-w-2xl">
  <div class="w-full px-6 py-4 text-base text-center text-[#e8e8e8] font-semibold shrink-0 bg-[#111111] border-b border-[#1e1e1e]">
    Import from The Blue Alliance
  </div>
  <div class="w-full flex-1 overflow-y-auto scroll-momentum">
    <div class="w-full px-6 pt-4 pb-4">
      <input
        bind:value={apiKey}
        placeholder="TBA API Key (optional)"
        type="password"
        class="w-full p-3 text-sm text-center text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <div class="text-xs text-[#999] text-center mt-2">
        Using shared API key. Add your own at
        <a href="https://www.thebluealliance.com/account" target="_blank" rel="noopener noreferrer" class="text-[#60a5fa] underline">
          thebluealliance.com/account
        </a>
        for higher rate limits
      </div>
    </div>
    <div class="w-full px-6 pb-4 relative">
      <input
        bind:value={eventQuery}
        placeholder="Search events..."
        class="w-full p-3 text-sm text-center text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        onfocus={() => (eventDropdownOpen = true)}
      />
      {#if eventDropdownOpen && events.length > 0}
        <div class="absolute top-full left-6 right-6 mt-1 bg-[#141414] border border-[#1e1e1e] rounded-[6px] max-h-64 overflow-y-auto z-50">
          <div class="flex flex-col">
            {#each events as ev (ev.key)}
              <div
                class="tba-dropdown-item"
                class:selected={ev.key === selectedEventKey}
                role="button"
                tabindex="0"
                onclick={() => {
                  onSelectEvent(ev.key);
                  eventDropdownOpen = false;
                }}
                onkeydown={(e) => e.key === "Enter" && onSelectEvent(ev.key)}
              >
                <div class="tba-event-name">{ev.name}</div>
                <div class="tba-event-details">{ev.details}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    <div class="w-full px-6 pb-6 relative">
      <input
        bind:value={teamQuery}
        placeholder={selectedEventKey ? "Search teams..." : "Select event first..."}
        disabled={!selectedEventKey}
        class="w-full p-3 text-sm text-center text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0 disabled:opacity-40"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        onfocus={() => (teamDropdownOpen = true)}
      />
      {#if teamDropdownOpen && selectedEventKey}
        <div class="absolute top-full left-6 right-6 mt-1 bg-[#141414] border border-[#1e1e1e] rounded-[6px] max-h-64 overflow-y-auto z-50">
          <div class="flex flex-col">
            {#each teams as team (team.number)}
              <div
                class="tba-team-item"
                class:selected={team.number === selectedTeamNumber}
                role="button"
                tabindex="0"
                onclick={() => {
                  onSelectTeam(team.number);
                  teamDropdownOpen = false;
                }}
                onkeydown={(e) => e.key === "Enter" && onSelectTeam(team.number)}
              >
                {team.label}
              </div>
            {/each}
          </div>
          <button
            class="w-full p-3 text-sm text-center btn-secondary border-t border-[#2a2a2a] rounded-none"
            onclick={() => {
              onAllMatches();
              teamDropdownOpen = false;
            }}
          >
            All Matches
          </button>
        </div>
      {/if}
    </div>
    {#if statusMessage}
      <div class="w-full px-6 pb-4 text-center text-sm text-[#999]">{statusMessage}</div>
    {/if}
  </div>
  <div class="flex w-full shrink-0">
    <button
      class="w-1/2 text-center text-sm btn-secondary p-4 border-t border-[#1e1e1e] rounded-none rounded-bl-[6px]"
      onclick={onImport}
    >
      Import
    </button>
    <button
      class="w-1/2 text-center text-sm btn-secondary p-4 border-t border-[#1e1e1e] border-l border-l-[#1e1e1e] rounded-none"
      onclick={onCancel}
    >
      Cancel
    </button>
  </div>
</Modal>

<style>
  .tba-dropdown-item,
  .tba-team-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid #1e1e1e;
    transition: background-color 0.2s;
  }
  .tba-dropdown-item:last-child,
  .tba-team-item:last-child {
    border-bottom: none;
  }
  .tba-dropdown-item:hover,
  .tba-team-item:hover {
    background-color: #1e1e1e;
  }
  .tba-dropdown-item.selected,
  .tba-team-item.selected {
    background-color: #242424;
  }
  .tba-event-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #e8e8e8;
    margin-bottom: 4px;
  }
  .tba-event-details {
    font-size: 0.75rem;
    color: #888;
  }
  .tba-team-item {
    text-align: center;
    font-size: 1rem;
    color: #e8e8e8;
  }
  @media (min-width: 640px) {
    .tba-dropdown-item {
      padding: 12px 16px;
    }
    .tba-event-name {
      font-size: 1rem;
    }
    .tba-event-details {
      font-size: 0.875rem;
    }
    .tba-team-item {
      padding: 12px 16px;
      font-size: 1.125rem;
    }
  }
</style>
