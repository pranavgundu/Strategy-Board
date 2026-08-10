<script lang="ts">
  import Modal from "./Modal.svelte";
  import { native } from "$lib/native/api";
  import type { TbaSimpleEvent } from "$lib/native/types";

  let { open, onImport, onClose }: { open: boolean; onImport: (eventKey: string, teamNumber: string) => Promise<void>; onClose: () => void } = $props();

  const FIRST_YEAR = 2025;

  let apiKey = $state("");
  let hasApiKey = $state(false);
  let events = $state<TbaSimpleEvent[]>([]);
  let eventSearch = $state("");
  let eventKey = $state("");
  let eventOpen = $state(false);
  let teams = $state<string[]>([]);
  let teamSearch = $state("");
  let teamNumber = $state("");
  let teamOpen = $state(false);
  let status = $state<{ message: string; isError: boolean } | null>(null);

  const filteredEvents = $derived(
    events.filter((event) => `${event.name} ${event.location} ${event.key}`.toLowerCase().includes(eventSearch.trim().toLowerCase())),
  );
  const filteredTeams = $derived(teams.filter((team) => team.includes(teamSearch.trim())));

  $effect(() => {
    if (!open) return;
    status = null;
    void native.tba.hasApiKey().then((value) => (hasApiKey = value), () => (hasApiKey = false));
    void loadEvents();
  });

  async function loadEvents() {
    status = { message: "Loading events...", isError: false };
    try {
      const years: number[] = [];
      for (let year = Math.max(FIRST_YEAR, new Date().getFullYear()); year >= FIRST_YEAR; year--) years.push(year);
      const fetched = await Promise.all(years.map((year) => native.tba.events(year).then((list) => native.tba.simpleEvents(list))));
      events = fetched.flat().sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
      status = null;
    } catch {
      status = { message: "Failed to load events.", isError: true };
    }
  }

  async function selectEvent(event: TbaSimpleEvent) {
    eventKey = event.key;
    eventSearch = event.name;
    eventOpen = false;
    teams = [];
    teamSearch = "";
    teamNumber = "";
    try {
      teams = (await native.tba.teamsAtEvent(event.key)).sort((a, b) => parseInt(a) - parseInt(b));
      status = null;
      teamOpen = teams.length > 0;
    } catch {
      status = { message: "Failed to load teams for this event.", isError: true };
    }
  }

  function selectTeam(team: string) {
    teamNumber = team;
    teamSearch = `Team ${team}`;
    teamOpen = false;
  }

  function selectAllMatches() {
    teamNumber = "";
    teamSearch = "All Matches";
    teamOpen = false;
  }

  async function submit() {
    if (!eventKey) {
      status = { message: "Select an event first.", isError: true };
      return;
    }
    status = { message: "Importing matches...", isError: false };
    try {
      if (apiKey.trim()) {
        await native.tba.setApiKey(apiKey.trim());
        hasApiKey = true;
      }
      await onImport(eventKey, teamNumber);
      status = null;
    } catch {
      status = { message: "Could not import matches from The Blue Alliance.", isError: true };
    }
  }
</script>

<Modal
  {open}
  id="tba-import-container"
  layer=""
  title="Import from The Blue Alliance"
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-2xl bg-[#141414] border border-[#1e1e1e] rounded-[6px] max-h-[90vh] overflow-hidden"
  {onClose}
>
  <div class="w-full px-6 py-4 text-base text-center text-[#e8e8e8] font-semibold flex-shrink-0 bg-[#111111] border-b border-[#1e1e1e]">
    Import from The Blue Alliance
  </div>
  <div class="w-full flex-1 overflow-y-auto">
    <div class="w-full px-6 pt-4 pb-4">
      <input
        id="tba-api-key"
        placeholder="TBA API Key (optional)"
        type="password"
        class="w-full p-3 text-sm text-center text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={apiKey}
      />
      <div class="text-xs text-[#999] text-center mt-2">
        {hasApiKey ? "Using your saved API key." : "Using shared API key."} Add your own at
        <a href="https://www.thebluealliance.com/account" target="_blank" rel="noreferrer" class="text-[#60a5fa] underline">thebluealliance.com/account</a>
        for higher rate limits
      </div>
    </div>
    <div class="w-full px-6 pb-4 relative">
      <input
        id="tba-event-search"
        placeholder="Search events..."
        class="w-full p-3 text-sm text-center text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={eventSearch}
        onfocus={() => (eventOpen = true)}
        oninput={() => (eventOpen = true)}
      />
      {#if eventOpen && filteredEvents.length}
        <div id="tba-event-dropdown" class="absolute top-full left-6 right-6 mt-1 bg-[#141414] border border-[#1e1e1e] rounded-[6px] max-h-64 overflow-y-auto z-50">
          <div id="tba-event-list" class="flex flex-col">
            {#each filteredEvents as event (event.key)}
              <div
                class="tba-dropdown-item"
                class:selected={eventKey === event.key}
                role="button"
                tabindex="0"
                onclick={() => selectEvent(event)}
                onkeydown={(keyEvent) => { if (keyEvent.key === "Enter") selectEvent(event); }}
              >
                <div class="tba-event-name">{event.name}</div>
                <div class="tba-event-details">{event.location} • {event.date_range} • {event.year}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    <div class="w-full px-6 pb-6 relative">
      <input
        id="tba-team-search"
        placeholder={eventKey ? "Search teams..." : "Select event first..."}
        disabled={!eventKey}
        class="w-full p-3 text-sm text-center text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0 disabled:opacity-40"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={teamSearch}
        onfocus={() => (teamOpen = true)}
        oninput={() => (teamOpen = true)}
      />
      {#if teamOpen && eventKey}
        <div id="tba-team-dropdown" class="absolute top-full left-6 right-6 mt-1 bg-[#141414] border border-[#1e1e1e] rounded-[6px] max-h-64 overflow-y-auto z-50">
          <div id="tba-team-list" class="flex flex-col">
            {#each filteredTeams as team (team)}
              <div
                class="tba-team-item"
                class:selected={teamNumber === team}
                role="button"
                tabindex="0"
                onclick={() => selectTeam(team)}
                onkeydown={(keyEvent) => { if (keyEvent.key === "Enter") selectTeam(team); }}
              >
                Team {team}
              </div>
            {/each}
          </div>
          <button id="tba-all-matches-btn" class="w-full p-3 text-sm text-center btn-secondary border-t border-[#2a2a2a] rounded-none" onclick={selectAllMatches}>
            All Matches
          </button>
        </div>
      {/if}
    </div>
    {#if status}
      <div id="tba-status-message" class="w-full px-8 pb-4 text-center {status.isError ? 'text-[#b87070]' : 'text-[#999]'}">
        {status.message}
      </div>
    {/if}
  </div>
  <div class="flex w-full flex-shrink-0">
    <button
      id="tba-import-btn"
      class="w-1/2 text-center text-sm btn-secondary p-4 border-t border-[#1e1e1e] rounded-none rounded-bl-[6px]"
      onclick={() => void submit()}
    >
      Import
    </button>
    <button
      id="tba-cancel-btn"
      class="w-1/2 text-center text-sm btn-secondary p-4 border-t border-[#1e1e1e] border-l border-l-[#1e1e1e] rounded-none"
      onclick={onClose}
    >
      Cancel
    </button>
  </div>
</Modal>
