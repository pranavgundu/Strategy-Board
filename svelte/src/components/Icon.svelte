<script lang="ts">
  // Inline SVG icon set replacing the old Font Awesome CDN dependency
  // (those webfonts were never cached, so icons vanished offline).
  export type IconName =
    | "times"
    | "link"
    | "copy"
    | "envelope"
    | "github"
    | "rotate-device"
    | "chart-line"
    | "pencil"
    | "eraser"
    | "square-check"
    | "close"
    | "info-circle"
    | "spinner"
    | "move";

  let {
    name,
    class: className = "",
    style = "",
  }: { name: IconName; class?: string; style?: string } = $props();
</script>

{#if name === "times" || name === "close"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
{:else if name === "link"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <path
      d="M9 15l6-6M10.5 6.5l1-1a3.54 3.54 0 015 5l-1 1M13.5 17.5l-1 1a3.54 3.54 0 01-5-5l1-1"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{:else if name === "copy"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <rect
      x="9"
      y="9"
      width="12"
      height="12"
      rx="2"
      stroke="currentColor"
      stroke-width="2"
    />
    <path
      d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"
      stroke="currentColor"
      stroke-width="2"
    />
  </svg>
{:else if name === "envelope"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <rect
      x="2.5"
      y="4.5"
      width="19"
      height="15"
      rx="2"
      stroke="currentColor"
      stroke-width="2"
    />
    <path
      d="M3 6l9 7 9-7"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{:else if name === "github"}
  <svg viewBox="0 0 24 24" fill="currentColor" class={className} style={style} aria-hidden="true">
    <path
      d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.06 11.06 0 015.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.55A11.51 11.51 0 0023.5 12c0-6.35-5.15-11.5-11.5-11.5z"
    />
  </svg>
{:else if name === "rotate-device"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <rect
      x="7"
      y="2"
      width="10"
      height="16"
      rx="2"
      stroke="currentColor"
      stroke-width="2"
      transform="rotate(90 12 10)"
    />
    <path
      d="M20 12a8 8 0 10-2.34 5.66"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M20 8v4h-4"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{:else if name === "chart-line"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <path
      d="M3 3v18h18"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M7 15l4-5 3 3 5-7"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{:else if name === "pencil"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <path
      d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20z"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M13.5 6.5L17.5 10.5"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
{:else if name === "eraser"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <path
      d="M18.5 13.5L10 22H5.5L2.5 19a1.5 1.5 0 010-2.12l10.5-10.5a1.5 1.5 0 012.12 0l3.38 3.38a1.5 1.5 0 010 2.12z"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <path
      d="M8 22h13"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
{:else if name === "square-check"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <rect
      x="3.5"
      y="3.5"
      width="17"
      height="17"
      rx="3"
      stroke="currentColor"
      stroke-width="2"
    />
    <path
      d="M8 12.5l2.5 2.5L16 9"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{:else if name === "info-circle"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
    <path
      d="M12 11v5.5M12 7.5v.01"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
{:else if name === "move"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <path
      d="M12 2v20M2 12h20M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{:else if name === "spinner"}
  <svg viewBox="0 0 24 24" fill="none" class={className} style={style} aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      stroke-width="3"
      opacity="0.25"
    />
    <path
      d="M21 12a9 9 0 00-9-9"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
    />
  </svg>
{/if}
