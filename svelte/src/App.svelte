<script lang="ts">
  import { app } from "$lib/stores/app.svelte";
  import AppLoading from "./components/AppLoading.svelte";
  import OrientationWarning from "./components/OrientationWarning.svelte";
  import TeamNumberPopup from "./components/TeamNumberPopup.svelte";
  import ReleaseAnnouncementModal from "./components/ReleaseAnnouncementModal.svelte";
  import HomeScreen from "./components/HomeScreen.svelte";
  import WhiteboardScreen from "./components/WhiteboardScreen.svelte";
  import Toast from "./components/Toast.svelte";

  // Neither the first-run team-number prompt nor the release announcement
  // banner have a home in the frozen app/board/toast contract (no fields
  // for them on `app`). Kept as component-local state so the shell renders
  // correctly today; wiring them to real persistence/release-feed data is
  // follow-up work once those concerns get a store.
  let showTeamNumberPopup = $state(false);
  let showReleaseAnnouncement = $state(false);

  $effect(() => {
    app.init();
  });
</script>

{#if app.loading}
  <AppLoading />
{/if}

<OrientationWarning />

<TeamNumberPopup
  open={showTeamNumberPopup}
  onSave={() => (showTeamNumberPopup = false)}
/>

<ReleaseAnnouncementModal
  open={showReleaseAnnouncement}
  onDismiss={() => (showReleaseAnnouncement = false)}
  onClose={() => (showReleaseAnnouncement = false)}
/>

<HomeScreen />
<WhiteboardScreen />

<Toast />
