<script lang="ts">
  // Visibility is driven entirely by `#orientation-warning` media queries in app.css;
  // dismissing only adds the `dismissed` class, exactly as the original markup did.
  let dismissed = $state(false);
</script>

<div id="orientation-warning" class:dismissed>
  <div class="rotate-icon"><i class="fas fa-mobile-alt"></i></div>
  <div class="message">Please rotate your device</div>
  <div class="submessage">This app works best in landscape mode</div>
  <button class="dismiss-button" onclick={() => (dismissed = true)}>Continue in Portrait</button>
</div>
