<script lang="ts">
  import Modal from "./Modal.svelte";
  import type { ReleaseAnnouncement } from "$lib/native/types";
  let { open, announcement, onDismiss, onClose }: { open: boolean; announcement: ReleaseAnnouncement | null; onDismiss: () => void; onClose: () => void } = $props();
</script>
<Modal {open} title={announcement?.title ?? "Strategy Board update"} {onClose}><header class="modal-header"><h2>{announcement?.title ?? "Strategy Board update"}</h2></header><div class="modal-content"><p class="muted">{announcement?.message}</p></div><footer class="modal-actions"><button class="button ghost" onclick={onDismiss}>Dismiss</button>{#if announcement?.ctaUrl}<a class="button primary" href={announcement.ctaUrl} target="_blank" rel="noreferrer" onclick={onClose}>{announcement.ctaLabel || "Learn more"}</a>{:else}<button class="button primary" onclick={onClose}>Done</button>{/if}</footer></Modal>
