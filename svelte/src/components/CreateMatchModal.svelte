<script lang="ts">
  import Modal from "./Modal.svelte";
  import MatchFormFields from "./MatchFormFields.svelte";
  import { emptyMatchForm, type MatchFormValues } from "./types";

  let {
    open,
    onCreate,
    onCancel,
  }: {
    open: boolean;
    onCreate: (values: MatchFormValues) => void;
    onCancel: () => void;
  } = $props();

  let values = $state<MatchFormValues>(emptyMatchForm());

  $effect(() => {
    if (open) values = emptyMatchForm();
  });

  function create() {
    onCreate(values);
  }
</script>

<Modal {open} onClose={onCancel} maxWidth="max-w-2xl">
  <MatchFormFields bind:values />
  <div class="flex w-full">
    <button
      class="w-1/2 text-center text-lg btn-secondary p-5 border-t border-[#1e1e1e] rounded-none"
      onclick={create}
    >
      Create
    </button>
    <button
      class="w-1/2 text-center text-lg btn-secondary p-5 border-t border-[#1e1e1e] border-l border-l-[#1e1e1e] rounded-none"
      onclick={onCancel}
    >
      Cancel
    </button>
  </div>
</Modal>
