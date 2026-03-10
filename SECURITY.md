# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅        |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report security issues by emailing the maintainers directly or by using
[GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability).

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

You can expect an initial response within 7 days.

---

## Security Model & Known Limitations

Strategy Board is a **client-side application** with no user authentication
system. Understanding its security model helps you use it safely.

### Cloud Sharing (Share Codes)

- Share codes are **6-character alphanumeric identifiers** with limited entropy.
- Anyone who obtains a share code can download the associated match data.
- Expiration (7 days) is enforced **client-side only** — it is not guaranteed
  by server-side Firestore rules.
- Shared match data is **not encrypted** before being sent to Firestore. It is
  transmitted over HTTPS but stored in plaintext.
- There is currently **no way to revoke** a share code once distributed.

**Recommendation:** Do not share codes publicly if your match strategies are
sensitive. Treat a share code like a shared password.

### API Keys

- The **TBA (The Blue Alliance) API key** is loaded from the `VITE_TBA_API_KEY`
  environment variable and is exposed in the browser bundle at build time (this
  is expected for Vite `VITE_*` prefixed variables).
- Users who provide their own TBA key via the UI have it stored in **IndexedDB**
  in plaintext. Keep your TBA key private and rotate it if you believe it has
  been compromised.
- Firebase credentials embedded in the app are **intentionally public** (Firebase
  relies on Firestore security rules for access control, not secret credentials).
  Ensure your Firebase project's Firestore rules are configured correctly to
  limit read/write access as intended.

### QR Code Export/Import

- Match data exported as QR codes is **base64-encoded, not encrypted**.
- Anyone who scans the displayed QR code(s) can read the full match strategy.
- Treat QR code displays the same as a printed document — be aware of your
  surroundings when displaying or scanning them at events.

### Local Data Storage

- All match data is stored locally in **IndexedDB** with no encryption.
- Any script running on the same origin as the app has access to this data.
- Data persists across browser sessions for offline use.

### No Authentication

- There is **no login system**. All users of an instance have equivalent access
  to local data.
- There is no audit log of who accessed or modified shared match data.

---

## Electron Desktop App

The Electron build follows secure defaults:

- `nodeIntegration: false`
- `contextIsolation: true`
- External URLs are opened in the system browser, not within the app

Do not enable `nodeIntegration` without understanding the implications.

---

## Dependency Security

Security patches are pinned via `pnpm` overrides in `package.json` for known
vulnerable transitive dependencies. When contributing, keep dependencies up to
date and check for advisories with:

```bash
pnpm audit
