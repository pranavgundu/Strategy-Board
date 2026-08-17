<svelte:head>
  <title>Privacy Policy | Strategy Board</title>
  <meta name="description" content="Privacy policy for Strategy Board." />
</svelte:head>

<main class="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 sm:px-8">
  <article class="mx-auto max-w-3xl space-y-7 leading-7">
    <a href="/" class="text-sm text-sky-400 hover:text-sky-300">← Strategy Board</a>
    <header class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
      <p class="text-sm text-slate-400">Effective August 17, 2026</p>
    </header>

    <p>
      Strategy Board is a match-planning whiteboard for FIRST Robotics Competition teams. This policy explains
      the information the app handles and the choices available to you.
    </p>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">Data stored on your device</h2>
      <p>
        Your matches, drawings, notes, team number, preferences, and any optional The Blue Alliance API key are
        stored locally on your device so the app can work without an account. We do not operate an account system
        and do not collect advertising identifiers, analytics, or location data.
      </p>
      <p>
        You can remove local app data using the app’s Clear All control or by deleting the app.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">Optional sharing</h2>
      <p>
        If you choose Share for a match, the selected match board is uploaded to Firebase Firestore with a random
        six-character share code and expiration timestamp. Anyone who has that share link or code can retrieve the
        shared match. Shared match data is intended to expire after seven days. Do not include personal, sensitive,
        or confidential information in a shared match.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">Third-party services</h2>
      <p>
        At your request, the app retrieves competition data from The Blue Alliance and match statistics from
        Statbotics. The app can also retrieve public contributor profile information from GitHub. Those services
        receive the network request needed to provide their information and handle it under their own policies.
        An optional personal The Blue Alliance API key is sent only when you use it to make a request.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">Camera</h2>
      <p>
        Camera access is optional and is used only to scan QR codes for importing match data. Camera images are
        processed on your device and are not recorded or uploaded by Strategy Board.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">Security and retention</h2>
      <p>
        The app uses HTTPS for network requests. Local data remains on your device unless you choose to share a
        match. Shared data is retained only for the temporary sharing period described above.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">Contact and changes</h2>
      <p>
        Questions about this policy or a shared match can be sent to
        <a class="text-sky-400 hover:text-sky-300" href="mailto:pranav@strategyboard.app">pranav@strategyboard.app</a>.
        We may update this policy when the app changes and will post the revised version on this page.
      </p>
    </section>
  </article>
</main>
