<script lang="ts">
  import Modal from "./Modal.svelte";

  let { open, onSave }: { open: boolean; onSave: (teamNumber: string) => Promise<void> | void } = $props();
  let teamNumber = $state("");
  let saving = $state(false);
  let error = $state("");

  function updateTeamNumber(event: Event) {
    teamNumber = (event.currentTarget as HTMLInputElement).value.replace(/\D/g, "").slice(0, 5);
    error = "";
  }

  async function save() {
    if (saving) return;
    if (!/^[1-9]\d{0,4}$/.test(teamNumber)) {
      error = "Enter a team number between 1 and 99999.";
      return;
    }
    saving = true;
    error = "";
    try {
      await onSave(teamNumber);
    } catch {
      error = "Could not save your team number. Please try again.";
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  {open}
  id="team-number-popup"
  layer="z-[99999]"
  title="Welcome to Strategy Board"
  dismissible={false}
  panelClass="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between w-[94%] sm:w-5/6 md:w-3/4 lg:w-2/3 max-w-2xl bg-[#141414] border border-[#1e1e1e] rounded-[10px] overflow-hidden"
  onClose={() => {}}
>
  <div class="w-full pt-8 pb-6 px-8 sm:px-10 bg-[#111111] border-b border-[#1e1e1e]">
    <h2 class="text-2xl sm:text-3xl text-center text-[#e8e8e8] font-semibold">Welcome to Strategy Board!</h2>
    <p class="text-center text-[#999] text-lg sm:text-xl mt-2">What's your team number?</p>
  </div>
  <div class="w-full p-8 sm:p-10">
    <input
      type="text"
      id="team-number-input"
      placeholder="Enter team number"
      maxlength="5"
      inputmode="numeric"
      pattern="[0-9]*"
      class="w-full text-3xl sm:text-4xl text-center text-[#e8e8e8] p-6 sm:p-7 bg-[#0d0d0d] border border-[#2a2a2a] rounded-[8px] outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      value={teamNumber}
      oninput={updateTeamNumber}
      onkeydown={(event) => { if (event.key === "Enter") void save(); }}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? "team-number-error" : undefined}
    />
    {#if error}<p id="team-number-error" class="mt-3 text-center text-[#c97070]" role="alert">{error}</p>{/if}
  </div>
  <div class="flex w-full">
    <button
      id="team-number-save-btn"
      class="w-full text-center text-lg sm:text-xl btn-secondary p-5 sm:p-6 border-t border-[#1e1e1e] rounded-none"
      onclick={() => void save()}
      disabled={saving}
    >
      {saving ? "Saving…" : "Continue"}
    </button>
  </div>
</Modal>
