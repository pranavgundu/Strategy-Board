<script lang="ts">
  let { message = "Loading the playbook..." }: { message?: string } = $props();
</script>

<div
  class="fixed inset-0 z-[99990] flex items-center justify-center bg-[#0d0d0d] text-[#e8e8e8]"
  role="status"
  aria-live="polite"
>
  <div
    class="grid gap-3 justify-items-center text-center bg-[#141414] border border-[#1e1e1e] rounded-[6px] px-7 py-6 min-w-[min(92vw,420px)]"
  >
    <div
      class="w-12 h-12 rounded-full border-4 border-slate-400/25 border-t-[#888] animate-spin"
      aria-hidden="true"
    ></div>
    <div class="text-[clamp(1.25rem,3vw,1.6rem)] font-extrabold tracking-tight">
      Strategy Board
    </div>
    <div class="text-[clamp(0.95rem,2.4vw,1.1rem)] text-[#999]">
      {message}
    </div>
  </div>
</div>
