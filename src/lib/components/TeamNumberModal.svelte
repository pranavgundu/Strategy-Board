<script lang="ts">
  import Modal from "./Modal.svelte";
  let { open, onSave }: { open: boolean; onSave: (teamNumber: string) => Promise<void> | void } = $props(); let teamNumber = $state(""); let error = $state(""); let saving = $state(false);
  async function save() { saving = true; error = ""; try { await onSave(teamNumber); } catch (reason) { error = reason instanceof Error ? reason.message : "Could not save your team number."; } finally { saving = false; } }
</script>
<Modal {open} title="Welcome to Strategy Board" dismissible={false} onClose={() => {}}>
  <form onsubmit={(event) => { event.preventDefault(); void save(); }}>
    <header class="modal-header welcome-header">
      <img src="/icon-512.png" alt="" />
      <div><p class="eyebrow">Welcome to</p><h2>Strategy Board</h2></div>
    </header>
    <div class="modal-content stack">
      <p class="muted">Add your FRC team number to personalize imports and your workspace.</p>
      <label class="form-label" for="welcome-team-number">Team number</label>
      <input id="welcome-team-number" class="input input-large" bind:value={teamNumber} inputmode="numeric" maxlength="5" placeholder="e.g. 834" />
      {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    </div>
    <footer class="modal-actions"><button class="button primary" type="submit" disabled={!teamNumber.trim() || saving}>{saving ? "Saving…" : "Enter Strategy Board"}</button></footer>
  </form>
</Modal>
