# Tally — External tickets

A rebuild of the "تذاكر الخارجي" pharmacy report tool. It's one flow that works for casual users (pick, type, Enter) and for fast typists (one-line entries, codes and shortcuts). Everything is stored locally, and reports export to CSV or Excel.

## Entry points
| Path | Purpose |
|---|---|
| `index.html` | The app |
| `tests.html` | Self-test harness (107 checks). Backs up and restores your localStorage |
| `manifest.webmanifest` | Install metadata (192/512 icons, maskable icon) |
| `sw.js` | Offline service worker (app-shell cache) |
| `scripts/run-tests.mjs` | Runs the harness headless; exits 1 on any failure |
| `.github/workflows/tests.yml` | Runs that script on every push and pull request |

## Features
- **Setup card**: find a pharmacy by code (`a21`) or Arabic name, or filter by class and region chips. There's a month grid (the likely month is suggested) and a year field you can type straight into (Arabic digits work, Enter confirms, Esc reverts), with a stepper beside it. It collapses into the top pill the first time it is filled in. Once you reopen it from the pill it stays open while you change the pharmacy, month or year, and closes with Done, Esc, Enter in the year field or the pill.
- **Composer (single flow)**: search, then Enter to select, type the quantity, Enter to add. Search forgives typos, normalises Arabic text, and fixes words typed on the Arabic keyboard layout by mistake.
  - `metformin 500*20` adds in one step (`x20` and `=20` also work)
  - `+5` / `-5` adjusts the last line you touched
  - `a21` switches pharmacy
  - `!name @unit #c *3` adds a full custom item. Context shortcuts: `#c #j #m #l` or `#1-4`
  - `/` opens the command list
  - Items not in the catalogue get a guided unit and context step
- **Frequent chips**: the products used most for the current pharmacy.
- **My lines**: edit quantities inline (Enter or arrows move between rows, 0 removes the line), pick context from a popover, filter, and sort (recent, A–Z, qty). New items without a context are flagged.
- **Full list**: the old "legacy mode" as a spreadsheet view of the whole catalogue.
- **Undo/redo** for every change (Ctrl Z / Ctrl Shift Z, plus toast Undo buttons). Undo and redo show a short toast saying what changed. A toast's Undo button only acts if nothing else has changed since.
- **Keyboard extras**: ↓ from an empty add bar jumps into your lines. Shift+↑/↓ steps qty by 10. Delete on an empty line qty removes the line. → moves from qty to the context pill. Digits pick menu items. Arrow keys work in the month grid. Esc steps back from anywhere. Shortcuts also work on the Arabic keyboard layout.
- **Guidance**: code and `+/-` entries show a preview before Enter. Filters show a no-match state with a clear button. Finish checks jump straight to the first line that needs fixing.
- **Finish**: checks the report, exports XLSX or CSV, archives it locally and starts a fresh report.
- **Archive**: reopen or delete finished reports.
- **Import** CSV or XLSX with review: matched, suggested (accept, or keep as new), new items needing a context, and skipped rows.
- **Print**: A4 Arabic report with numbered rows, totals and a signature block.
- EN/AR with full RTL, System/Light/Dark themes, and a mobile bottom-sheet layout.
- Data from the previous apps (`bayan:v3:*` and `lx_b`) is picked up automatically.
- **Offline and installable**: after the first visit the app opens and works with no connection, including XLSX export, and can be installed from the browser. When online every file is fetched fresh, so updates show on the next reload. The cached copy is used only when the network is down or takes longer than 4 seconds. A one-time notice says when offline use is ready, and another offers a reload when a new version has been installed.
- **Backup and restore**: More menu → Backup and restore. Downloads one JSON file with the current report, archive, preferences and usage, and restores from one after a confirmation. Files from newer versions or with the wrong shape are refused, and restore replaces the current data in one step. The same dialog shows whether the browser has promised not to clear the data and can ask for that promise (it is also requested automatically once the app is installed).
- **No outside requests**: fonts (Inter, Newsreader, IBM Plex Sans Arabic, JetBrains Mono) are bundled in `fonts/` and the whole app works without any other host.
- Several tabs open at once stay in sync without overwriting each other. Saved data is checked and cleaned on load.

## Architecture (ES modules, no build step)
```
js/data/catalog.js      products (deduped, units normalised), pharmacies, months, contexts
js/lib/                 text (normalise/digits/layout/year), period (suggested month), search (ranked), omni parser, dom helpers
js/core/store.js        dispatch/subscribe store, undo/redo with grouping, action log
js/core/state.js        reducer + line model
js/core/selectors.js    derived data (totals, visible lines, issues)
js/core/storage.js      persist/load + legacy migration
js/services/            exporter (CSV/XLSX), importer, backup (save/restore file), lazy xlsx loader, offline registration
js/ui/                  setup, composer, ledger, catalog-view, dialogs, overlay, print
js/main.js              wiring, commands, shortcuts, debug API
sw.js                   offline service worker (shell cache)
css/fonts.css, fonts/   bundled web fonts and their licences
```
**Debugging:** open the console and use `tally.state()`, `tally.log()` (action history), `tally.rows()`, `tally.csv()`, `tally.undo()`, `tally.reset()`.

## Offline maintenance
- Every file the app loads must be listed in `SHELL` inside `sw.js`. The self-test harness fails if a loaded file is missing from the list or a listed file does not exist.
- Bump `VERSION` in `sw.js` on each release. Open tabs then show the "new version" notice and old caches are removed. Skipping the bump never serves stale files, it only means open tabs don't get the notice.
- Fonts are part of the shell, so a first-ever session that starts offline after one online visit looks identical to an online one.

## Icons
Sources are `favicon.svg` (rounded) and `images/icon-maskable.svg` (full bleed). The PNGs in `images/` are rendered from them at 192, 512 (standard and maskable) and 180 (Apple touch).

## Not implemented
- Cloud sync and multi-device sharing (everything stays in this browser).

## Running the checks
Open `tests.html` through any static server, or run `npm install --no-save playwright` once and then `node scripts/run-tests.mjs`. Set `CHROMIUM_PATH` to use an existing Chromium. GitHub Actions does the same on every push.

## Next steps
- Add a visible "last backed up" nudge in the status bar when the data has changed and no backup was made for a while.
- Cover the new-version notice and the restore flow with a second browser context in the harness.
- Optional sync (file or cloud) for people who use more than one device.

## Data model
Stored in localStorage key `tally:v1`: `{ v, doc: { id, meta: { year, month, pharmacyId }, lines: [{ id, name, unit, qty, custom, context, addedAt, updatedAt }] }, prefs, archive, usage }`.
Export columns: `year, month, class, region, pharmacyId, pharmacy, name, unit, unitSold, method, category`.
