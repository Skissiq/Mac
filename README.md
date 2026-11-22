# Mac Desktop — iPhone PWA

A macOS-inspired desktop environment that runs in Safari on iPhone. It is a web app, not macOS and cannot run native `.app` software.

## Features
- macOS-inspired desktop, menu bar and Dock
- Finder-like local file manager: create folders/files, rename, delete, open text files
- Notes with autosave
- Simulated terminal
- Browser window (some sites block iframe embedding)
- Calculator and settings
- IndexedDB local storage
- JSON backup and restore
- PWA manifest and service worker for offline shell caching

## Deploy to GitHub Pages (free)
1. Create a GitHub repository, e.g. `mac-desktop`.
2. Upload **all contents of this folder** to the repository root (not the enclosing folder).
3. Keep `icon-192.png` and `icon-512.png` directly in the repository root alongside `index.html` (do not put them in an `icons/` folder).
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch `main` and folder `/(root)`, then Save.
7. Wait for the Pages URL, usually `https://YOUR-USERNAME.github.io/mac-desktop/`.
8. Open that URL in Safari on iPhone, tap Share → Add to Home Screen → Add.
9. Launch the new home-screen icon.

## iPhone notes
- Use Safari and HTTPS. The service worker requires a secure context.
- Local files are stored in Safari's IndexedDB on this device/browser origin. They are not automatically stored in iCloud Drive or the iOS Files app.
- Use Settings → Export all data regularly. The JSON backup can be saved to Files from Safari's download/share UI.
- Import a JSON backup using Settings → Import backup.
- Clearing Safari website data can delete local app data. A backup is strongly recommended.
- The app cannot replace iOS, run native macOS apps, or provide a real shell/terminal.
- Browser window uses an iframe; many websites prevent embedding. Open those sites in Safari separately.
- iOS may suspend background web apps; autosave is used for Notes.

## Updating
Upload changed files to the same repository. Refresh the PWA. If an old cached version remains, close the home-screen app and reopen it; a service worker update may take another launch.
