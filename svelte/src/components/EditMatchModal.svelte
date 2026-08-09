<script lang="ts">
  import Modal from "./Modal.svelte";
  import MatchFormFields from "./MatchFormFields.svelte";
  import type { Match, MatchFormValues } from "./types";

  // NOTE: the frozen app store contract has no explicit "update match"
  // method (only createMatch/duplicateMatch/deleteMatch/clearAll). This
  // modal reports the edited values back via onSave and leaves persistence
  // to the caller (e.g. mutating the matched app.matches entry in place,
  // which is reactive under $state). Flagged in the port report.
  let {
    open,
    match,
    onSave,
    onCancel,
  }: {
    open: boolean;
    match: Match | null;
    onSave: (id: string, values: MatchFormValues) => void;
    onCancel: () => void;
  } = $props();

  let values = $state<MatchFormValues>({
    matchName: "",
    redOne: "",
    redTwo: "",
    redThree: "",
    blueOne: "",
    blueTwo: "",
    blueThree: "",
  });

  $effect(() => {
    if (open && match) {
      values = {
        matchName: match.matchName,
        redOne: match.redOne,
        redTwo: match.redTwo,
        redThree: match.redThree,
        blueOne: match.blueOne,
        blueTwo: match.blueTwo,
        blueThree: match.blueThree,
      };
    }
  });

  function save() {
    if (!match) return;
    onSave(match.id, values);
  }
</script>

<Modal {open} onClose={onCancel} maxWidth="max-w-2xl">
  <MatchFormFields bind:values />
  <div class="flex w-full">
    <button
      class="w-1/2 text-center text-lg btn-secondary p-5 border-t border-[#1e1e1e] rounded-none"
      onclick={save}
    >
      Save
    </button>
    <button
      class="w-1/2 text-center text-lg btn-secondary p-5 border-t border-[#1e1e1e] border-l border-l-[#1e1e1e] rounded-none"
      onclick={onCancel}
    >
      Cancel
    </button>
  </div>
</Modal>
