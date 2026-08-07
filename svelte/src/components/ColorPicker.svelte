<script lang="ts">
  import Icon from "./Icon.svelte";

  // IMPORTANT: purely static markup, same rule as DrawConfig.svelte.
  // `$lib/whiteboard.ts` binds click listeners to each swatch by id and
  // toggles `.hidden` / `.color-picker-hidden` itself. No onclick handlers,
  // no board-store binding here. See PORT_NOTES.md.
</script>

<div
  id="whiteboard-color-config"
  class="color-config absolute flex flex-col justify-center items-center bottom-3 sm:bottom-4 md:bottom-6 max-sm:!bottom-3 left-3 sm:left-4 md:left-6 max-sm:!left-3 bg-[#1a1a1a] border border-[#3a3a3a] rounded-full p-2 sm:p-3 max-sm:!p-2"
>
  <div id="whiteboard-color-yellow" class="swatch size-5 sm:size-6 md:size-8 lg:size-10 xl:size-12 max-sm:!size-10 m-1 sm:m-1.5 md:m-2 max-sm:!m-1.5 bg-yellow-500 rounded-full border-2 border-amber-600 cursor-pointer"></div>
  <div id="whiteboard-color-green" class="swatch size-5 sm:size-6 md:size-8 lg:size-10 xl:size-12 max-sm:!size-10 m-1 sm:m-1.5 md:m-2 max-sm:!m-1.5 bg-green-500 rounded-full border-2 border-green-700 cursor-pointer"></div>
  <div id="whiteboard-color-blue" class="swatch size-5 sm:size-6 md:size-8 lg:size-10 xl:size-12 max-sm:!size-10 m-1 sm:m-1.5 md:m-2 max-sm:!m-1.5 bg-blue-500 rounded-full border-2 border-blue-700 cursor-pointer"></div>
  <div id="whiteboard-color-red" class="swatch size-5 sm:size-6 md:size-8 lg:size-10 xl:size-12 max-sm:!size-10 m-1 sm:m-1.5 md:m-2 max-sm:!m-1.5 bg-red-500 rounded-full border-2 border-red-700 cursor-pointer"></div>
  <div id="whiteboard-color-white" class="swatch size-5 sm:size-6 md:size-8 lg:size-10 xl:size-12 max-sm:!size-10 m-1 sm:m-1.5 md:m-2 max-sm:!m-1.5 bg-white rounded-full border-2 border-gray-300 cursor-pointer"></div>
  <div
    id="whiteboard-color-close"
    class="swatch close size-5 sm:size-6 md:size-8 lg:size-10 xl:size-12 max-sm:!size-10 m-1 sm:m-1.5 md:m-2 max-sm:!m-1.5 flex justify-center items-center text-center rounded-full border-2 border-[#3a3a3a] bg-[#2a2a2a] cursor-pointer"
  >
    <Icon name="close" class="w-3 sm:w-3.5 md:w-4 lg:w-5 xl:w-6 text-red-500" />
  </div>
</div>

<style>
  .color-config {
    transform-origin: bottom center;
    animation: color-config-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .color-config.color-picker-hidden {
    animation: color-config-out 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    pointer-events: none;
  }
  @keyframes color-config-in {
    from {
      transform: translateY(20px) scale(0.8);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
  @keyframes color-config-out {
    from {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    to {
      transform: translateY(20px) scale(0.8);
      opacity: 0;
    }
  }
  .swatch {
    position: relative;
    overflow: hidden;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 2px 4px rgba(255, 255, 255, 0.3),
      inset 0 -2px 4px rgba(0, 0, 0, 0.3);
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease,
      border-color 0.15s ease;
  }
  .swatch::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.4) 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    border-radius: inherit;
    pointer-events: none;
  }
  .swatch:hover {
    transform: scale(1.15);
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.4),
      inset 0 2px 4px rgba(255, 255, 255, 0.4),
      inset 0 -2px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
  .swatch.close:hover {
    border-color: #8a3030;
    background: #2a0f0f;
    box-shadow: 0 0 10px rgba(200, 80, 80, 0.2);
  }
</style>
