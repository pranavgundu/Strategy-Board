<script lang="ts">
  import Modal from "./Modal.svelte";
  import MatchForm from "./MatchForm.svelte";
  import { emptyMatchForm, type MatchFormValues } from "./types";
  let { open, match = null, onSave, onClose }: { open: boolean; match?: { id: string } & MatchFormValues | null; onSave: (values: MatchFormValues) => void; onClose: () => void } = $props();
  let values = $state<MatchFormValues>(emptyMatchForm());
  $effect(() => { if (open) values = match ? { matchName: match.matchName, redOne: match.redOne, redTwo: match.redTwo, redThree: match.redThree, blueOne: match.blueOne, blueTwo: match.blueTwo, blueThree: match.blueThree } : emptyMatchForm(); });
  function submit() { onSave(values); }
</script>

<Modal {open} title={match ? "Edit match" : "New match"} {onClose}>
  <form onsubmit={(event) => { event.preventDefault(); submit(); }}>
    <header class="modal-header"><h2>{match ? "Edit match" : "New match"}</h2></header>
    <div class="modal-content"><MatchForm bind:values /></div>
    <footer class="modal-actions"><button type="button" class="button ghost" onclick={onClose}>Cancel</button><button type="submit" class="button primary">{match ? "Save changes" : "Create match"}</button></footer>
  </form>
</Modal>
