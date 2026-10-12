<script lang="ts">
  import Modal from "./Modal.svelte";

  let { open, team, phaseLabel, strokeCount, onSave, onClose }: {
    open: boolean;
    team: string;
    phaseLabel: string;
    strokeCount: number;
    onSave: (details: { name: string; tag: string | null }) => void;
    onClose: () => void;
  } = $props();

  let name = $state("");
  let anyRobot = $state(false);
  let error = $state("");

  $effect(() => {
    if (!open) return;
    name = "";
    anyRobot = false;
    error = "";
  });

  function save() {
    if (!name.trim()) {
      error = "Give the path a name.";
      return;
    }
    onSave({ name: name.trim(), tag: anyRobot ? null : team });
  }
</script>

<Modal
  {open}
  id="save-path-container"
  title="Save as Common Path"
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-xl bg-[#141414] border border-[#1e1e1e] rounded-[6px] overflow-hidden"
  {onClose}
>
  <div class="w-full px-6 py-4 text-center text-[#e8e8e8] text-lg font-semibold bg-[#111111] border-b border-[#1e1e1e]">Save as Common Path</div>
  <div class="flex flex-col gap-4 px-6 py-5">
    <p class="text-sm text-[#999]">
      Saves {team}'s {strokeCount} {strokeCount === 1 ? "Stroke" : "Strokes"} in {phaseLabel} and its Bumper Sprite pose, so it can be pasted into any Match.
    </p>
    <input
      id="save-path-name"
      placeholder="Name, like {team} three piece"
      autocomplete="off"
      class="w-full p-3 text-base text-[#e8e8e8] rounded-[6px] bg-[#0d0d0d] border border-[#2a2a2a] outline-0"
      bind:value={name}
      oninput={() => (error = "")}
      onkeydown={(event) => { if (event.key === "Enter") save(); }}
    />
    <div class="flex gap-2" role="radiogroup" aria-label="Who the path is for">
      <button class="flex-1 px-4 py-3 btn-secondary" class:tag-selected={!anyRobot} role="radio" aria-checked={!anyRobot} onclick={() => (anyRobot = false)}>For {team}</button>
      <button class="flex-1 px-4 py-3 btn-secondary" class:tag-selected={anyRobot} role="radio" aria-checked={anyRobot} onclick={() => (anyRobot = true)}>Any robot</button>
    </div>
    {#if error}<p class="text-sm text-[#e89090]" role="alert">{error}</p>{/if}
  </div>
  <div class="flex w-full">
    <button id="save-path-save-btn" class="w-1/2 p-4 text-lg btn-secondary border-t border-[#1e1e1e] rounded-none" onclick={save}>Save</button>
    <button class="w-1/2 p-4 text-lg btn-secondary border-t border-l border-[#1e1e1e] rounded-none" onclick={onClose}>Cancel</button>
  </div>
</Modal>

<style>
  .tag-selected {
    background: #ebebeb;
    border-color: #ebebeb;
    color: #0d0d0d;
    font-weight: 600;
  }
</style>
