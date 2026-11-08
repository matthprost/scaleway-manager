# Privacy

Scaleway Manager is an independent, open-source app. It is not made by or affiliated with Scaleway. It collects nothing about you.

## What the app sends, and where

The app talks only to Scaleway:

- `api.scaleway.com`, to read and manage your account and resources;
- `account.scaleway.com`, the login page, opened in your phone's browser;
- `status.scaleway.com`, the public status page.

While you log in, the app briefly listens on the phone itself (`localhost`) to receive Scaleway's answer. Nothing outside the phone can reach it, and it stops when the login ends.

Links you tap on purpose, like the project's GitHub page, open in a browser.

Demo mode makes no network calls at all.

## What stays on the phone

- Your login session, in the phone's secure storage. It stays on this phone only.
- Your settings, such as appearance and Face ID.
- The last data you loaded, so the app can show it offline.
- Invoices you open (PDF files).

Face ID and fingerprint checks are done by your phone. The app never sees your face or fingerprint.

None of this goes into your phone's backups (iCloud or Google).

An API key's secret is shown once when you create it. The app does not keep it.

When you log out, your session and your loaded data are wiped. Only your appearance and Face ID settings stay on the phone (and, for each organization, which project you picked: just an id).

## What we do not do

- No analytics.
- No crash reports.
- No ads or tracking.
- No third-party tools that receive your data.

## Questions

Open an issue: https://github.com/matthprost/scaleway-manager/issues
