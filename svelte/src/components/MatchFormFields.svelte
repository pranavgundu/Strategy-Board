<script lang="ts">
  import type { MatchFormValues } from "./types";

  let {
    values = $bindable(),
    nameId,
  }: {
    values: MatchFormValues;
    nameId?: string;
  } = $props();
</script>

<input
  id={nameId}
  bind:value={values.matchName}
  placeholder="Match Name"
  maxlength="25"
  class="w-full py-5 px-8 max-[640px]:p-3 text-xl max-[640px]:text-lg text-center text-[#e8e8e8] font-semibold bg-[#111111] border-b border-[#1e1e1e] outline-0 rounded-none"
  autocomplete="off"
  autocapitalize="off"
  spellcheck="false"
/>
<div class="grid grid-cols-3 w-full">
  <input
    type="number"
    bind:value={values.redOne}
    placeholder="Red 1"
    maxlength="5"
    inputmode="numeric"
    class="text-lg sm:text-xl md:text-2xl lg:text-3xl max-[640px]:text-base text-center text-[#c97070] p-2 sm:p-3 md:p-4 max-[640px]:p-2 bg-[#0d0d0d] border-b border-r border-[#2a2a2a] outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
  />
  <input
    type="number"
    bind:value={values.redTwo}
    placeholder="Red 2"
    maxlength="5"
    inputmode="numeric"
    class="text-lg sm:text-xl md:text-2xl lg:text-3xl max-[640px]:text-base text-center text-[#c97070] p-2 sm:p-3 md:p-4 max-[640px]:p-2 bg-[#0d0d0d] border-b border-r border-[#2a2a2a] outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
  />
  <input
    type="number"
    bind:value={values.redThree}
    placeholder="Red 3"
    maxlength="5"
    inputmode="numeric"
    class="text-lg sm:text-xl md:text-2xl lg:text-3xl max-[640px]:text-base text-center text-[#c97070] p-2 sm:p-3 md:p-4 max-[640px]:p-2 bg-[#0d0d0d] border-b border-r border-[#2a2a2a] outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
  />
  <input
    type="number"
    bind:value={values.blueOne}
    placeholder="Blue 1"
    maxlength="5"
    inputmode="numeric"
    class="text-lg sm:text-xl md:text-2xl lg:text-3xl max-[640px]:text-base text-center text-[#6090c9] p-2 sm:p-3 md:p-4 max-[640px]:p-2 bg-[#0d0d0d] border-r border-[#2a2a2a] outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
  />
  <input
    type="number"
    bind:value={values.blueTwo}
    placeholder="Blue 2"
    maxlength="5"
    inputmode="numeric"
    class="text-lg sm:text-xl md:text-2xl lg:text-3xl max-[640px]:text-base text-center text-[#6090c9] p-2 sm:p-3 md:p-4 max-[640px]:p-2 bg-[#0d0d0d] border-r border-[#2a2a2a] outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
  />
  <input
    type="number"
    bind:value={values.blueThree}
    placeholder="Blue 3"
    maxlength="5"
    inputmode="numeric"
    class="text-lg sm:text-xl md:text-2xl lg:text-3xl max-[640px]:text-base text-center text-[#6090c9] p-2 sm:p-3 md:p-4 max-[640px]:p-2 bg-[#0d0d0d] border-r border-[#2a2a2a] outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
  />
</div>
