<script lang="ts">
  import type { MatchFormValues } from "./types";

  // `idPrefix` keeps the original per-field ids ( #create-match-red-1 … ), which the
  // small-screen rules in app.css target directly.
  let { values = $bindable(), idPrefix }: { values: MatchFormValues; idPrefix: "create-match" | "edit-match" } = $props();

  const redFields = [
    { key: "redOne", label: "Red 1", slot: 1 },
    { key: "redTwo", label: "Red 2", slot: 2 },
    { key: "redThree", label: "Red 3", slot: 3 },
  ] as const;
  const blueFields = [
    { key: "blueOne", label: "Blue 1", slot: 1 },
    { key: "blueTwo", label: "Blue 2", slot: 2 },
    { key: "blueThree", label: "Blue 3", slot: 3 },
  ] as const;

  const numberField =
    "text-lg sm:text-xl md:text-2xl lg:text-3xl text-center p-2 sm:p-3 md:p-4 bg-[#0d0d0d] border-r border-[#2a2a2a] outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
</script>

<input
  id="{idPrefix}-name"
  placeholder="Match Name"
  maxlength="25"
  class="w-full py-5 px-8 text-xl text-center text-[#e8e8e8] font-semibold bg-[#111111] border-b border-[#1e1e1e] outline-0 rounded-none"
  autocomplete="off"
  autocapitalize="off"
  spellcheck="false"
  bind:value={values.matchName}
/>
<div class="grid grid-cols-3 w-full">
  {#each redFields as field}
    <input
      type="number"
      id="{idPrefix}-red-{field.slot}"
      placeholder={field.label}
      maxlength="5"
      inputmode="numeric"
      class="{numberField} text-[#c97070] border-b"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      bind:value={values[field.key]}
    />
  {/each}
  {#each blueFields as field}
    <input
      type="number"
      id="{idPrefix}-blue-{field.slot}"
      placeholder={field.label}
      maxlength="5"
      inputmode="numeric"
      class="{numberField} text-[#6090c9]"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      bind:value={values[field.key]}
    />
  {/each}
</div>
