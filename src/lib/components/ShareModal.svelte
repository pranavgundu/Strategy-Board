<script lang="ts">
  import Modal from "./Modal.svelte";
  import { copyText, shareText } from "$lib/features";
  let { open, shareLink, onClose, onNotice = () => {} }: { open: boolean; shareLink: string; onClose: () => void; onNotice?: (message: string) => void } = $props();
  let error = $state("");
  async function copy() { try { await copyText(shareLink); onNotice("Share link copied."); } catch { error = "Could not copy the share link."; } }
  async function share() { try { const result = await shareText({ title: "Strategy Board match", text: "Open this Strategy Board match", url: shareLink }); onNotice(result === "shared" ? "Share sheet opened." : "Share link copied."); } catch (reason) { if (!(reason instanceof DOMException && reason.name === "AbortError")) error = "Could not share this link."; } }
</script>
<Modal {open} title="Share Strategy Board" {onClose}><header class="modal-header"><h2>Share link generated</h2></header><div class="modal-content stack"><p class="muted">Anyone with this link can import a copy of this match.</p><input class="input" value={shareLink} readonly aria-label="Share link" />{#if error}<p class="form-error" role="alert">{error}</p>{/if}</div><footer class="modal-actions"><button class="button" onclick={copy}>Copy link</button><button class="button" onclick={share}>Share</button><button class="button primary" onclick={onClose}>Done</button></footer></Modal>
<style>.form-error{margin:0;color:#ffaaaa}</style>
