<script lang="ts">
  import type { MatchFormValues } from "./types";
  let { values = $bindable() }: { values: MatchFormValues } = $props();
  const alliances: Array<{ name: "Red" | "Blue"; teams: (keyof MatchFormValues)[] }> = [
    { name: "Red", teams: ["redOne", "redTwo", "redThree"] },
    { name: "Blue", teams: ["blueOne", "blueTwo", "blueThree"] },
  ];
</script>

<div class="match-name-field">
  <label class="form-label" for="match-name">Match name</label>
  <input id="match-name" class="input match-name" bind:value={values.matchName} maxlength="48" placeholder="Qualification 12" autocomplete="off" />
</div>
<div class="alliance-fields" aria-label="Alliance teams">
  {#each alliances as alliance}
    <fieldset class:red-fieldset={alliance.name === "Red"} class:blue-fieldset={alliance.name === "Blue"}>
      <legend><span class="alliance-dot"></span>{alliance.name} alliance</legend>
      <div class="team-inputs">
        {#each alliance.teams as team, index}
          <label>
            <span>Team {index + 1}</span>
            <input class="input" bind:value={values[team]} inputmode="numeric" maxlength="5" pattern="[0-9]*" placeholder="Team #" autocomplete="off" />
          </label>
        {/each}
      </div>
    </fieldset>
  {/each}
</div>
