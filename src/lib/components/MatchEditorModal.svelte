<script lang="ts">
  import Modal from "./Modal.svelte";
  import MatchForm from "./MatchForm.svelte";
  import { emptyMatchForm, type MatchFormValues } from "./types";

  let { open, match = null, onSave, onClose }: { open: boolean; match?: ({ id: string } & MatchFormValues) | null; onSave: (values: MatchFormValues) => void; onClose: () => void } = $props();

  let values = $state<MatchFormValues>(emptyMatchForm());
  const editing = $derived(match !== null);
  const idPrefix = $derived(editing ? "edit-match" : "create-match");

  $effect(() => {
    if (open)
      values = match
        ? { matchName: match.matchName, redOne: match.redOne, redTwo: match.redTwo, redThree: match.redThree, blueOne: match.blueOne, blueTwo: match.blueTwo, blueThree: match.blueThree }
        : emptyMatchForm();
  });
</script>

<Modal
  {open}
  id="{idPrefix}-container"
  layer=""
  title={editing ? "Edit match" : "New match"}
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-2xl bg-[#141414] border border-[#1e1e1e] rounded-[6px] max-h-[90vh] overflow-y-auto"
  {onClose}
>
  <MatchForm bind:values {idPrefix} />
  <div class="flex w-full">
    <button
      id="{idPrefix}-{editing ? 'save' : 'create'}-btn"
      class="w-1/2 text-center text-lg btn-secondary p-5 border-t border-[#1e1e1e] rounded-none"
      onclick={() => onSave(values)}
    >
      {editing ? "Save" : "Create"}
    </button>
    <button
      id="{idPrefix}-cancel-btn"
      class="w-1/2 text-center text-lg btn-secondary p-5 border-t border-[#1e1e1e] border-l border-l-[#1e1e1e] rounded-none"
      onclick={onClose}
    >
      Cancel
    </button>
  </div>
</Modal>
