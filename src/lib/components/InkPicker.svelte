<script lang="ts">
  import { inkColor, NEUTRAL_INK, STATIONS, teamInk, type Lineup, type TeamColorOverrides } from "$lib/domain";

  let { lineup, ink, overrides, hidden = false, onPick }: { lineup: Lineup; ink: number; overrides: TeamColorOverrides; hidden?: boolean; onPick: (ink: number) => void } = $props();

  // expanded shows every chip plus the close control; collapsed leaves only the active Ink
  let open = $state(true);
  let closing = $state(false);

  const chips = $derived([
    { ink: NEUTRAL_INK, label: "Neutral", color: "#ffffff", alliance: "", empty: false },
    ...STATIONS.map((station) => {
      const team = lineup[station].trim();
      return { ink: teamInk(station), label: team || "Empty", color: inkColor(teamInk(station), lineup, overrides), alliance: station.startsWith("red") ? "red" : "blue", empty: !team };
    }),
  ]);

  function pick(chipInk: number) {
    if (!open) { open = true; return; }
    onPick(chipInk);
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
  class:picker-hidden={hidden}
  role="toolbar"
  aria-label="Ink"
>
  {#each chips as chip (chip.ink)}
    <button
      class="ink-chip {chip.alliance}"
      class:selected={chip.ink === ink}
      class:collapsed-away={!open && chip.ink !== ink}
      disabled={chip.empty}
      aria-pressed={chip.ink === ink}
      aria-label={chip.empty ? "Empty Station" : chip.ink === NEUTRAL_INK ? "Neutral Ink" : `Ink for team ${chip.label}`}
      onclick={() => pick(chip.ink)}
    >
      <span class="ink-swatch" style:background={chip.color}></span>
      <span>{chip.label}</span>
    </button>
  {/each}
  <button id="whiteboard-ink-close" class="ink-chip justify-center" class:collapsed-away={!open} aria-label="Collapse the Ink picker" onclick={collapse}>
    <i class="fa fa-close text-red-500"></i>
  </button>
</div>

<style>
  .ink-chip {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 7rem;
    height: 2.6rem;
    min-height: 0;
    padding: 0 0.9rem 0 0.65rem;
    border: 2px solid #2e2e2e;
    border-left-width: 6px;
    border-radius: 999px;
    background: #141414;
    color: #e8e8e8;
    font-family: inherit;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
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
  .ink-chip:not(:disabled):hover { transform: scale(1.05); }
  .ink-chip:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .ink-chip.collapsed-away { display: none; }
  .ink-swatch {
    width: 1.2rem;
    height: 1.2rem;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-radius: 999px;
  }
  #whiteboard-ink-picker.picker-hidden { display: none; }
  #whiteboard-ink-picker.color-picker-hidden .ink-chip {
    animation: colorItemSlideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
</style>
