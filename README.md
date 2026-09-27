# Tally — External tickets

A rebuild of the "تذاكر الخارجي" pharmacy report tool. It's one flow that works for casual users (pick, type, Enter) and for fast typists (one-line entries, codes and shortcuts). Everything is stored locally, and reports export to CSV or Excel.

## Entry points
| Path | Purpose |
|---|---|
| `index.html` | The app |
| `tests.html` | Self-test harness (45 checks). Backs up and restores your localStorage |

## Features
- **Setup card**: find a pharmacy by code (`a21`) or Arabic name, or filter by class and region chips. There's a month grid (the likely month is suggested) and a year stepper. It collapses into the top pill once filled in.
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
- **Undo/redo** for every change (Ctrl Z / Ctrl Shift Z, plus toast Undo buttons).
- **Finish**: checks the report, exports XLSX or CSV, archives it locally and starts a fresh report.
- **Archive**: reopen or delete finished reports.
- **Import** CSV or XLSX with review: matched, suggested (accept, or keep as new), new items needing a context, and skipped rows.
- **Print**: A4 Arabic report with numbered rows, totals and a signature block.
- EN/AR with full RTL, System/Light/Dark themes, and a mobile bottom-sheet layout.
- Data from the previous apps (`bayan:v3:*` and `lx_b`) is picked up automatically.

## Architecture (ES modules, no build step)
```
js/data/catalog.js      products (deduped, units normalised), pharmacies, months, contexts
js/lib/                 text (normalise/digits/layout), search (ranked), omni parser, dom helpers
js/core/store.js        dispatch/subscribe store, undo/redo with grouping, action log
js/core/state.js        reducer + line model
js/core/selectors.js    derived data (totals, visible lines, issues)
js/core/storage.js      persist/load + legacy migration
js/services/            exporter (CSV/XLSX), importer, lazy xlsx loader
js/ui/                  setup, composer, ledger, catalog-view, dialogs, overlay, print
js/main.js              wiring, commands, shortcuts, debug API
```
**Debugging:** open the console and use `tally.state()`, `tally.log()` (action history), `tally.rows()`, `tally.csv()`, `tally.undo()`, `tally.reset()`.

## Data model
Stored in localStorage key `tally:v1`: `{ v, doc: { id, meta: { year, month, pharmacyId }, lines: [{ id, name, unit, qty, custom, context, addedAt, updatedAt }] }, prefs, archive, usage }`.
Export columns: `year, month, class, region, pharmacyId, pharmacy, name, unit, unitSold, method, category`.

## Not implemented / next steps
- No server submission (the old Worker endpoint was removed on purpose; everything stays local).
- Possible next steps: a month-over-month comparison from the archive, a PWA offline service worker, and bulk-select actions.
