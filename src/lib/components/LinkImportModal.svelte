<script lang="ts">
  import Modal from "./Modal.svelte";
  let { open, onImport, onClose }: { open: boolean; onImport: (code: string) => void; onClose: () => void } = $props();
  let code = $state("");
  function submit() { onImport(code.trim().toUpperCase()); }
</script>
<Modal {open} title="Import from link" {onClose}>
  <form onsubmit={(event) => { event.preventDefault(); submit(); }}>
    <header class="modal-header"><h2>Import from link</h2></header><div class="modal-content"><label class="form-label" for="share-code">Share code or link</label><input id="share-code" class="input" bind:value={code} placeholder="Paste a link or six-character code" autocomplete="off" /></div>
    <footer class="modal-actions"><button class="button ghost" type="button" onclick={onClose}>Cancel</button><button class="button primary" type="submit" disabled={!code.trim()}>Import</button></footer>
  </form>
</Modal>
