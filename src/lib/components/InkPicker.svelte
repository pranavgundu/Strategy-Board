<script lang="ts">
  import { inkColor, NEUTRAL_INK, STATIONS, teamInk, type Lineup, type StationKey, type TeamColorOverrides } from "$lib/domain";

  let { lineup, ink, overrides, hiddenTeams, onPick, onToggleHidden, onSavePath }: {
    lineup: Lineup;
    ink: number;
    overrides: TeamColorOverrides;
    hiddenTeams: readonly string[];
    onPick: (ink: number) => void;
    onToggleHidden: (team: string) => void;
    onSavePath: (station: StationKey) => void;
  } = $props();

  let menu = $state<{ station: StationKey; team: string; top: number } | null>(null);

  // expanded shows every chip plus the close control; collapsed leaves only the active Ink
  let open = $state(true);
  let closing = $state(false);

  const chips = $derived([
    { ink: NEUTRAL_INK, station: null, team: "", label: "Neutral", color: "#ffffff", alliance: "", empty: false, hidden: false },
    ...STATIONS.map((station) => {
      const team = lineup[station].trim();
      return {
        ink: teamInk(station), station, team, label: team || "Empty", color: inkColor(teamInk(station), lineup, overrides),
        alliance: station.startsWith("red") ? "red" : "blue", empty: !team, hidden: Boolean(team) && hiddenTeams.includes(team),
      };
    }),
  ]);

  function pick(chipInk: number) {
    if (!open) { open = true; return; }
    onPick(chipInk);
  }

  function openMenu(station: StationKey, team: string, button: HTMLElement) {
    menu = menu?.station === station ? null : { station, team, top: button.offsetTop };
  }

  function collapse() {
    closing = true;
    window.setTimeout(() => { closing = false; open = false; }, 300);
  }
</script>

<div
  id="whiteboard-ink-picker"
  class="absolute flex flex-col gap-1.5 bottom-3 sm:bottom-4 md:bottom-6 left-3 sm:left-4 md:left-6 p-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-[1.6rem]"
  class:color-picker-hidden={closing}
  role="toolbar"
  aria-label="Ink"
>
  {#each chips as chip (chip.ink)}
    <div class="ink-chip {chip.alliance}" class:selected={chip.ink === ink} class:empty={chip.empty} class:hidden-team={chip.hidden} class:collapsed-away={!open && chip.ink !== ink}>
      <button
        class="ink-pick"
        disabled={chip.empty}
        aria-pressed={chip.ink === ink}
        aria-label={chip.empty ? "Empty Station" : chip.ink === NEUTRAL_INK ? "Neutral Ink" : `Ink for team ${chip.label}`}
        onclick={() => pick(chip.ink)}
      >
        <span class="ink-swatch" style:background={chip.color}></span>
        <span>{chip.label}</span>
      </button>
      {#if chip.team && chip.station}
        {@const station = chip.station}
        <button
          class="ink-eye"
          aria-pressed={chip.hidden}
          aria-label={chip.hidden ? `Show team ${chip.team}` : `Hide team ${chip.team}`}
          onclick={() => onToggleHidden(chip.team)}
        >
          <i class="fas {chip.hidden ? 'fa-eye-slash' : 'fa-eye'}"></i>
        </button>
        <button class="ink-eye" aria-label={`More for team ${chip.team}`} aria-expanded={menu?.station === station} onclick={(event) => openMenu(station, chip.team, event.currentTarget)}>
          <i class="fas fa-ellipsis-vertical"></i>
        </button>
      {/if}
    </div>
  {/each}
  {#if menu}
    {@const current = menu}
    <button class="ink-menu-backdrop" aria-label="Close the team menu" onclick={() => (menu = null)}></button>
    <div class="ink-menu" style:top="{current.top}px" role="menu" aria-label={`Team ${current.team}`}>
      <button role="menuitem" onclick={() => { const { station } = current; menu = null; onSavePath(station); }}>
        <i class="fas fa-route w-5"></i> Save as Common Path…
      </button>
    </div>
  {/if}
  <div class="ink-chip justify-center" class:collapsed-away={!open}>
    <button id="whiteboard-ink-close" class="ink-pick justify-center" aria-label="Collapse the Ink picker" onclick={collapse}>
      <i class="fa fa-close text-red-500"></i>
    </button>
  </div>
</div>

<style>
  .ink-chip {
    display: flex;
    align-items: center;
    min-width: 11rem;
    height: 2.6rem;
    border: 2px solid #2e2e2e;
    border-left-width: 6px;
    border-radius: 999px;
    background: #141414;
    overflow: hidden;
    animation: colorItemSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .ink-chip.red { border-left-color: #dc2626; }
  .ink-chip.blue { border-left-color: #2563eb; }
  .ink-chip.selected {
    border-color: #ffffff;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.25);
  }
  .ink-chip.red.selected { border-left-color: #dc2626; }
  .ink-chip.blue.selected { border-left-color: #2563eb; }
  .ink-chip.empty { opacity: 0.35; }
  .ink-chip.collapsed-away { display: none; }
  .ink-pick,
  .ink-eye {
    display: flex;
    align-items: center;
    height: 100%;
    min-height: 0;
    min-width: 0;
    border: none;
    background: transparent;
    color: #e8e8e8;
    font-family: inherit;
    cursor: pointer;
  }
  .ink-pick {
    flex: 1;
    gap: 0.6rem;
    padding: 0 0.5rem 0 0.65rem;
    font-size: 1rem;
    font-weight: 700;
  }
  .ink-pick:disabled { cursor: default; }
  .ink-eye {
    justify-content: center;
    width: 2.2rem;
    padding: 0;
    color: #777;
    border-left: 1px solid #2a2a2a;
  }
  .ink-eye:hover { color: #e8e8e8; }
  .hidden-team .ink-eye { color: #e89090; }
  .hidden-team .ink-pick { color: #777; }
  .hidden-team .ink-swatch { opacity: 0.35; }
  .ink-swatch {
    width: 1.2rem;
    height: 1.2rem;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-radius: 999px;
  }
  .ink-menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    min-height: 0;
    border: none;
    background: transparent;
    cursor: default;
  }
  .ink-menu {
    position: absolute;
    left: calc(100% + 0.5rem);
    z-index: 11;
    min-width: 15rem;
    padding: 0.35rem;
    border: 1px solid #3a3a3a;
    border-radius: 0.75rem;
    background: #1a1a1a;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
  .ink-menu button {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.75rem 0.9rem;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: #e8e8e8;
    font-family: inherit;
    font-size: 1rem;
    text-align: left;
    cursor: pointer;
  }
  .ink-menu button:hover { background: #252525; }
  #whiteboard-ink-picker.color-picker-hidden .ink-chip {
    animation: colorItemSlideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
</style>
