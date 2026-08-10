<script lang="ts">
  import Modal from "./Modal.svelte";
  let { open, title, message, confirmLabel = "Confirm", destructive = false, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel?: string; destructive?: boolean; onConfirm: () => void; onClose: () => void } = $props();
</script>
<Modal {open} {title} {onClose}>
  <header class="modal-header"><h2>{title}</h2></header>
  <div class="modal-content"><p class="muted">{message}</p></div>
  <footer class="modal-actions"><button class="button ghost" onclick={onClose}>Cancel</button><button class:danger={destructive} class="button primary" onclick={onConfirm}>{confirmLabel}</button></footer>
</Modal>
