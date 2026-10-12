<script lang="ts">
  import type { Component } from "svelte";
  import CurrentEventSection from "./settings/CurrentEventSection.svelte";
  import TeamColorsSection from "./settings/TeamColorsSection.svelte";

  interface SettingsSection {
    id: string;
    title: string;
    description: string;
    component: Component;
  }

  let { open, onClose }: { open: boolean; onClose: () => void } = $props();

  const sections: SettingsSection[] = [
    { id: "team-colors", title: "Team Colors", description: "Recolor a team on this device when its scouting app color is hard to see or clashes.", component: TeamColorsSection },
    { id: "current-event", title: "Current Event", description: "Schedule Sync adds every match with 1690 at this event, with each team in its schedule Station.", component: CurrentEventSection },
  ];

  let body = $state<HTMLDivElement>();

  function jumpTo(id: string) {
    body?.querySelector(`#settings-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
</script>

{#if open}
  <!-- Home stays mounted underneath, so closing Settings returns to it exactly as it was -->
  <div id="settings-container" class="fixed inset-0 z-40 flex flex-col bg-[#0d0d0d] touch-none" role="dialog" aria-modal="true" aria-label="Settings">
    <div
      id="settings-toolbar"
      class="flex shrink-0 items-center gap-4 sm:gap-6 w-full h-24 bg-[#111111] border-b border-[#1e1e1e] px-4 sm:px-6 md:px-10 lg:px-16 pt-[env(safe-area-inset-top)]"
    >
      <button
        id="settings-back-btn"
        class="flex items-center justify-center gap-2 px-4 sm:px-6 md:px-8 h-11 md:h-12 lg:h-14 btn-secondary text-sm sm:text-base md:text-lg lg:text-xl font-semibold"
        onclick={onClose}
      >
        <i class="fas fa-arrow-left"></i>
        <span>Back</span>
      </button>
      <h1 class="text-lg sm:text-xl md:text-2xl font-bold text-[#e8e8e8] tracking-tight select-none">Settings</h1>
    </div>

    <div class="flex flex-1 min-h-0">
      {#if sections.length > 1}
        <nav id="settings-nav" class="hidden md:flex flex-col gap-1 w-56 lg:w-64 shrink-0 p-4 lg:p-6 border-r border-[#1e1e1e] bg-[#0f0f0f] overflow-y-auto touch-pan-y">
          {#each sections as section (section.id)}
            <button class="text-left px-4 py-3 rounded-[6px] text-[#999] hover:text-[#e8e8e8] hover:bg-[#1a1a1a] transition-colors" onclick={() => jumpTo(section.id)}>
              {section.title}
            </button>
          {/each}
        </nav>
      {/if}

      <div bind:this={body} id="settings-body" class="flex-1 min-w-0 overflow-y-auto touch-pan-y p-4 sm:p-6 md:p-10">
        <div class="flex flex-col gap-6 md:gap-8 w-full max-w-4xl mx-auto">
          {#each sections as section (section.id)}
            {@const Section = section.component}
            <section id="settings-section-{section.id}" class="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden scroll-mt-4">
              <header class="px-6 py-4 bg-[#111111] border-b border-[#1e1e1e]">
                <h2 class="text-lg md:text-xl font-semibold text-[#e8e8e8]">{section.title}</h2>
                <p class="mt-1 text-sm text-[#999]">{section.description}</p>
              </header>
              <div class="p-4 sm:p-6">
                <Section />
              </div>
            </section>
          {:else}
            <p id="settings-empty" class="py-16 text-center text-lg text-[#999]">Nothing to set up yet.</p>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
