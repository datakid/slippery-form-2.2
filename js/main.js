import { h, icon, clear } from './lib/dom.js';
import { t, setLang, getLang, label } from './i18n.js';
import { createStore } from './core/store.js';
import { reducer, initialState, emptyDoc, lineKey } from './core/state.js';
import { metaInfo, totals, issues } from './core/selectors.js';
import * as storage from './core/storage.js';
import { exportCSV, exportXLSX, toRows, toCSV } from './services/exporter.js';
import { loadXLSX } from './services/xlsx-loader.js';
import { toast, confirmSheet, openMenu, closeMenu } from './ui/overlay.js';
import { createSetup, suggestedMonth } from './ui/setup.js';
import { createComposer } from './ui/composer.js';
import { createLedger } from './ui/ledger.js';
import { createCatalogView } from './ui/catalog-view.js';
import { createPrintSheet } from './ui/print.js';
import { openHelp, openImport, openArchive, openFinish } from './ui/dialogs.js';
import { debounce } from './lib/text.js';
import { PRODUCTS, PHARMACIES } from './data/catalog.js';

function boot() {
    const base = initialState();
    const loaded = storage.load();
    const legacyPrefs = storage.readLegacyPrefs();
    if (loaded.data?.doc) base.doc = loaded.data.doc;
    if (loaded.data?.prefs) base.prefs = { ...base.prefs, ...loaded.data.prefs };
    else base.prefs = { ...base.prefs, ...Object.fromEntries(Object.entries(legacyPrefs).filter(([, v]) => v)) };
    if (Array.isArray(loaded.data?.archive)) base.archive = loaded.data.archive;
    if (loaded.data?.usage && typeof loaded.data.usage === 'object') base.usage = loaded.data.usage;
    if (!base.doc.meta.month) base.doc.meta.month = suggestedMonth();
    return { state: base, migrated: loaded.migrated };
}

const { state: bootState, migrated } = boot();
const store = createStore({ reducer, initialState: bootState });
setLang(bootState.prefs.lang);

let saveState = { ok: true, at: null };
const persistNow = () => {
    const r = storage.persist(store.getState());
    saveState = { ok: r.ok, at: r.savedAt || saveState.at };
    renderSaveStatus();
    if (!r.ok) toast(t('saveFailed'), { tone: 'danger', duration: 8000 });
};
const persistSoon = debounce(persistNow, 250);

const darkQuery = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
    const pref = store.getState().prefs.theme;
    const resolved = pref === 'system' ? (darkQuery.matches ? 'dark' : 'light') : pref;
    document.documentElement.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = resolved === 'dark' ? '#1f1e1c' : '#f4f0e8';
}
darkQuery.addEventListener('change', applyTheme);

function notify(msg, tone = 'neutral', opts = {}) { return toast(msg, { tone, ...opts }); }

const undoAction = () => ({ label: t('undo'), run: () => doUndo() });

function doUndo() {
    const l = store.undo();
    if (!l) notify(t('nothingToUndo'));
}
function doRedo() { store.redo(); }

const actions = {
    notify,
    focusComposer: () => composer.focus(),
    addLine(line, usageKey, opts = {}) {
        const action = { type: 'LINE_ADD', payload: { line, mode: opts.mode } };
        store.dispatch(action);
        const scope = store.getState().doc.meta.pharmacyId || '_';
        if (usageKey) store.dispatch({ type: 'USAGE_BUMP', payload: { scope, key: usageKey } });
        if (opts.silent) return;
        const res = action.result;
        if (res?.merged) notify(t('mergedAdd', line.name.split(' (')[0], res.merged.from, res.merged.to), 'neutral', { action: undoAction() });
        else notify(t('added', line.qty, line.name.split(' (')[0]), 'success', { action: undoAction(), duration: 2600 });
    },
    removeLine(id) {
        const line = store.getState().doc.lines.find(l => l.id === id);
        if (!line) return;
        store.dispatch({ type: 'LINE_REMOVE', payload: { id } });
        notify(t('removed', line.name.split(' (')[0]), 'neutral', { action: undoAction() });
    },
    adjustLast(delta) {
        const s = store.getState();
        const line = s.doc.lines.find(l => l.id === s.ui.lastLineId);
        if (!line) { notify(t('noLastLine'), 'danger'); return; }
        const to = Math.max(0, line.qty + delta);
        store.dispatch({ type: 'LINE_UPDATE', payload: { id: line.id, patch: { qty: to } } });
        notify(t('adjusted', line.name.split(' (')[0], line.qty, to), 'neutral', { action: undoAction() });
    },
    setPharmacy(p) {
        const had = store.getState().doc.lines.length > 0;
        store.dispatch({ type: 'META_SET', payload: { pharmacyId: p.id } });
        notify(had ? t('movedReport', p.name) : t('pharmacySet', p.name), 'success', { action: undoAction() });
        setupOpen = false;
        renderShell();
    },
    openArchived(entry) {
        store.dispatch({ type: 'DOC_REPLACE', payload: { doc: structuredClone(entry.doc) } });
        store.dispatch({ type: 'ARCHIVE_REMOVE', payload: { id: entry.id } });
        notify(t('opened'), 'success', { action: undoAction() });
        setupOpen = false;
        renderShell();
    }
};

async function runExport(format) {
    const doc = store.getState().doc;
    if (!doc.lines.length) { notify(t('missingLines'), 'danger'); return null; }
    try {
        let name;
        if (format === 'xlsx') {
            const dismiss = globalThis.XLSX ? null : notify(t('loadingXlsx'));
            name = await exportXLSX(doc);
            dismiss && dismiss();
        } else name = exportCSV(doc);
        store.dispatch({ type: 'PREFS_SET', payload: { lastFormat: format } });
        notify(t('exported', name), 'success');
        return name;
    } catch (err) {
        console.error('[export]', err);
        notify(t('exportFailed'), 'danger');
        return null;
    }
}

function explainIssues(list) {
    if (list.includes('pharmacy') || list.includes('month')) { setupOpen = true; renderShell(); setup.focus(); return t('missingMeta'); }
    if (list.includes('empty')) return t('missingLines');
    if (list.includes('context')) { store.dispatch({ type: 'UI_SET', payload: { onlyNeedsContext: true, view: 'ledger' } }); return t('fixContext'); }
    if (list.includes('zero')) return t('fixZero');
    return null;
}

async function finishReport() {
    const problems = issues(store.getState());
    if (problems.length) { notify(explainIssues(problems), 'danger'); return; }
    const format = await openFinish({ store, actions });
    if (!format) return;
    const name = await runExport(format);
    if (!name) return;
    const s = store.getState();
    store.dispatch({ type: 'ARCHIVE_ADD', payload: { entry: { id: s.doc.id, finishedAt: Date.now(), file: name, doc: s.doc } } });
    store.dispatch({ type: 'DOC_REPLACE', payload: { doc: emptyDoc({ ...s.doc.meta, pharmacyId: null }) } });
    store.dispatch({ type: 'UI_SET', payload: { onlyNeedsContext: false, view: 'ledger' } });
    notify(t('finished'), 'success', { duration: 5000 });
    setupOpen = true;
    renderShell();
    setup.syncFromMeta();
    setup.focus();
}

function printReport() {
    const s = store.getState();
    if (!s.doc.lines.length) { notify(t('missingLines'), 'danger'); return; }
    if (!metaInfo(s.doc.meta).complete) { notify(explainIssues(['pharmacy']), 'danger'); return; }
    printer.print(s.doc);
}

async function clearReport() {
    const n = store.getState().doc.lines.length;
    if (!n) { notify(t('nothingToClear')); return; }
    const ok = await confirmSheet({ title: t('clearTitle'), body: t('clearBody', t('lines', n)), confirmLabel: t('clearReport'), tone: 'danger' });
    if (!ok) return;
    store.dispatch({ type: 'DOC_CLEAR' });
    notify(t('cleared', t('lines', n)), 'neutral', { action: undoAction() });
}

function cycleTheme() {
    const order = ['system', 'light', 'dark'];
    const cur = store.getState().prefs.theme;
    store.dispatch({ type: 'PREFS_SET', payload: { theme: order[(order.indexOf(cur) + 1) % 3] } });
}

function toggleLang() {
    store.dispatch({ type: 'PREFS_SET', payload: { lang: getLang() === 'ar' ? 'en' : 'ar' } });
}

function setView(view) {
    store.dispatch({ type: 'UI_SET', payload: { view } });
}

const commands = () => [
    { id: 'print', icon: 'print', label: () => t('cmd.print'), kbd: 'Ctrl P', run: printReport },
    { id: 'xlsx', icon: 'sheet', label: () => t('cmd.xlsx'), run: () => runExport('xlsx') },
    { id: 'csv', icon: 'file', label: () => t('cmd.csv'), run: () => runExport('csv') },
    { id: 'finish', icon: 'check', label: () => t('cmd.finish'), run: finishReport },
    { id: 'full', icon: 'list', label: () => t('cmd.full'), run: () => setView(store.getState().ui.view === 'catalog' ? 'ledger' : 'catalog') },
    { id: 'setup', icon: 'store', label: () => t('cmd.setup'), run: () => { setupOpen = true; renderShell(); setup.syncFromMeta(); setup.focus(); } },
    { id: 'import', icon: 'upload', label: () => t('cmd.import'), run: () => openImport({ store, actions }) },
    { id: 'archive', icon: 'archive', label: () => t('cmd.archive'), run: () => openArchive({ store, actions }) },
    { id: 'clear', icon: 'trash', label: () => t('cmd.clear'), run: clearReport },
    { id: 'theme', icon: 'moon', label: () => t('cmd.theme'), run: cycleTheme },
    { id: 'lang', icon: 'globe', label: () => t('cmd.lang'), run: toggleLang },
    { id: 'help', icon: 'help', label: () => t('cmd.help'), kbd: '?', run: openHelp }
];

let setupOpen = !metaInfo(store.getState().doc.meta).complete;

const setup = createSetup({ store, onComplete: () => { if (setupOpen) { setupOpen = false; renderShell(); composer.focus(); } } });
const composer = createComposer({ store, commands, actions });
const ledger = createLedger({ store, actions });
const catalog = createCatalogView({ store, actions });
const printer = createPrintSheet();

const brand = h('a', { class: 'brand', href: './', 'aria-label': 'Tally' },
    h('img', { class: 'brand-mark', src: 'favicon.svg', alt: '', width: 30, height: 30 }),
    h('span', { class: 'brand-text' }, h('strong', { class: 'brand-name' }), h('small', { class: 'brand-tag' }))
);
const reportPill = h('button', { class: 'report-pill', id: 'report-pill', type: 'button', 'aria-controls': 'setup-panel' });
const undoBtn = h('button', { class: 'icon-btn', type: 'button', id: 'undo-btn', onclick: doUndo }, icon('undo', 18));
const redoBtn = h('button', { class: 'icon-btn', type: 'button', id: 'redo-btn', onclick: doRedo }, icon('redo', 18));
const themeBtn = h('button', { class: 'icon-btn hide-sm', type: 'button', id: 'theme-btn', onclick: cycleTheme });
const langBtn = h('button', { class: 'pill-btn lang-btn hide-sm', type: 'button', id: 'lang-btn', onclick: toggleLang });
const moreBtn = h('button', { class: 'icon-btn', type: 'button', id: 'more-btn', 'aria-haspopup': 'menu' }, icon('more', 20));

const topbar = h('header', { class: 'topbar glass', id: 'topbar' },
    brand,
    reportPill,
    h('div', { class: 'topbar-actions' }, undoBtn, redoBtn, themeBtn, langBtn, moreBtn)
);

const viewSeg = h('div', { class: 'segmented view-seg', role: 'tablist', id: 'view-switch' });
const subbar = h('div', { class: 'subbar' }, viewSeg, composer.quickEl);

const dockTotals = h('div', { class: 'dock-totals' });
const saveStatus = h('span', { class: 'save-status' });
const printBtn = h('button', { class: 'btn btn-quiet dock-btn', type: 'button', id: 'print-btn', onclick: printReport }, icon('print', 18), h('span', { class: 'btn-label' }));
const exportBtn = h('button', { class: 'btn btn-tonal dock-btn', type: 'button', id: 'export-btn', 'aria-haspopup': 'menu' }, icon('download', 18), h('span', { class: 'btn-label' }));
const finishBtn = h('button', { class: 'btn btn-primary dock-btn', type: 'button', id: 'finish-btn', onclick: finishReport }, icon('check', 18), h('span', { class: 'btn-label' }));
const dock = h('footer', { class: 'dock glass', id: 'dock' },
    h('div', { class: 'dock-info' }, dockTotals, saveStatus),
    h('div', { class: 'dock-actions' }, printBtn, exportBtn, finishBtn)
);

const main = h('main', { class: 'stage', id: 'stage' }, setup.el, composer.el, subbar, ledger.el, catalog.el);
document.getElementById('app').replaceChildren(topbar, main, dock, printer.el);

function openExportMenu(anchor) {
    openMenu(anchor, [
        { label: t('exportXlsx'), hint: t('exportXlsxHint'), icon: 'sheet', run: () => runExport('xlsx') },
        { label: t('exportCsv'), hint: t('exportCsvHint'), icon: 'file', run: () => runExport('csv') }
    ]);
}
exportBtn.addEventListener('click', () => openExportMenu(exportBtn));

moreBtn.addEventListener('click', () => {
    const theme = store.getState().prefs.theme;
    openMenu(moreBtn, [
        { label: t('importFile'), icon: 'upload', run: () => openImport({ store, actions }) },
        { label: t('archive'), icon: 'archive', hint: store.getState().archive.length ? String(store.getState().archive.length) : null, run: () => openArchive({ store, actions }) },
        { label: t('viewCatalog'), icon: 'list', run: () => setView(store.getState().ui.view === 'catalog' ? 'ledger' : 'catalog') },
        '-',
        { heading: t('theme') },
        { label: t('themeSystem'), icon: 'monitor', checked: theme === 'system', run: () => store.dispatch({ type: 'PREFS_SET', payload: { theme: 'system' } }) },
        { label: t('themeLight'), icon: 'sun', checked: theme === 'light', run: () => store.dispatch({ type: 'PREFS_SET', payload: { theme: 'light' } }) },
        { label: t('themeDark'), icon: 'moon', checked: theme === 'dark', run: () => store.dispatch({ type: 'PREFS_SET', payload: { theme: 'dark' } }) },
        '-',
        { label: t('language'), icon: 'globe', run: toggleLang },
        { label: t('help'), icon: 'help', kbd: '?', run: openHelp },
        '-',
        { label: t('clearReport'), icon: 'trash', tone: 'danger', run: clearReport }
    ]);
});

reportPill.addEventListener('click', () => {
    setupOpen = !setupOpen;
    renderShell();
    if (setupOpen) { setup.syncFromMeta(); setup.focus(); }
    else composer.focus();
});

function renderReportPill() {
    const s = store.getState();
    const info = metaInfo(s.doc.meta);
    reportPill.classList.toggle('is-incomplete', !info.complete);
    reportPill.classList.toggle('is-open', setupOpen);
    reportPill.setAttribute('aria-expanded', String(setupOpen));
    clear(reportPill).append(
        h('span', { class: 'pill-avatar' }, info.pharmacy ? info.pharmacy.id : icon('store', 16)),
        h('span', { class: 'pill-text' },
            h('strong', { dir: info.pharmacy ? 'rtl' : null }, info.pharmacy ? info.pharmacy.name : t('pharmacy')),
            h('small', null, [info.month ? label(info.month) : t('month'), s.doc.meta.year, info.cls ? label(info.cls) : null].filter(Boolean).join(' · '))
        ),
        icon(setupOpen ? 'chevronDown' : 'chevron', 16)
    );
}

function renderViewSeg() {
    const s = store.getState();
    const n = s.doc.lines.length;
    clear(viewSeg).append(
        h('button', { class: 'seg' + (s.ui.view === 'ledger' ? ' is-active' : ''), type: 'button', role: 'tab', 'aria-selected': String(s.ui.view === 'ledger'), onclick: () => setView('ledger') },
            icon('list', 15), t('viewLines'), n ? h('span', { class: 'seg-count' }, String(n)) : null),
        h('button', { class: 'seg' + (s.ui.view === 'catalog' ? ' is-active' : ''), type: 'button', role: 'tab', 'aria-selected': String(s.ui.view === 'catalog'), onclick: () => setView('catalog') },
            icon('sheet', 15), t('viewCatalog'))
    );
}

function renderDock() {
    const s = store.getState();
    const tt = totals(s.doc.lines);
    clear(dockTotals).append(
        h('strong', { class: 'dock-units' }, tt.units.toLocaleString('en')),
        h('span', { class: 'dock-sub' }, t('units', tt.units).replace(/^[\d,]+\s*/, ''), ' · ', t('lines', tt.count))
    );
    const ready = issues(s).length === 0;
    finishBtn.classList.toggle('is-ready', ready);
    finishBtn.disabled = !tt.count;
    exportBtn.disabled = !tt.count;
    printBtn.disabled = !tt.count;
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
}

function renderSaveStatus() {
    clear(saveStatus).append(
        h('span', { class: 'save-dot' + (saveState.ok ? '' : ' is-bad') }),
        saveState.ok ? t('savedLocally') : t('saveFailed')
    );
}

function renderChrome() {
    const s = store.getState();
    brand.querySelector('.brand-name').textContent = t('appName');
    brand.querySelector('.brand-tag').textContent = t('appTag');
    undoBtn.title = t('undo') + ' (Ctrl Z)';
    undoBtn.setAttribute('aria-label', t('undo'));
    redoBtn.title = t('redo') + ' (Ctrl Shift Z)';
    redoBtn.setAttribute('aria-label', t('redo'));
    const themeIcons = { system: 'monitor', light: 'sun', dark: 'moon' };
    clear(themeBtn).append(icon(themeIcons[s.prefs.theme], 18));
    themeBtn.title = `${t('theme')}: ${t('theme' + s.prefs.theme[0].toUpperCase() + s.prefs.theme.slice(1))}`;
    themeBtn.setAttribute('aria-label', themeBtn.title);
    langBtn.textContent = getLang() === 'ar' ? 'EN' : 'ع';
    langBtn.title = t('language');
    moreBtn.title = t('more');
    moreBtn.setAttribute('aria-label', t('more'));
    printBtn.querySelector('.btn-label').textContent = t('print');
    exportBtn.querySelector('.btn-label').textContent = t('export');
    finishBtn.querySelector('.btn-label').textContent = t('finish');
    document.title = `${t('appName')} — ${t('appTag')}`;
}

function renderShell() {
    const s = store.getState();
    setup.el.hidden = !setupOpen;
    const catalogMode = s.ui.view === 'catalog';
    ledger.el.hidden = catalogMode;
    composer.el.hidden = catalogMode;
    if (catalogMode && catalog.el.hidden) catalog.show();
    if (!catalogMode && !catalog.el.hidden) catalog.hide();
    document.body.classList.toggle('mode-catalog', catalogMode);
    renderReportPill();
    renderViewSeg();
    renderDock();
}

function renderAll() {
    renderChrome();
    setup.render();
    composer.render();
    ledger.render();
    catalog.render();
    renderShell();
    renderSaveStatus();
}

store.subscribe((s, prev, action) => {
    if (s.prefs.lang !== prev.prefs.lang) { setLang(s.prefs.lang); renderAll(); }
    if (s.prefs.theme !== prev.prefs.theme) { applyTheme(); renderChrome(); }
    if (s.doc !== prev.doc || s.ui.view !== prev.ui.view || action.type.startsWith('@@')) renderShell();
    if (s.doc !== prev.doc || s.prefs !== prev.prefs || s.archive !== prev.archive || s.usage !== prev.usage) persistSoon();
});

function isTyping(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.isComposing) return;
    const mod = e.ctrlKey || e.metaKey;
    const typing = isTyping(document.activeElement);
    const inDialog = document.activeElement?.closest('dialog');
    const key = e.key.toLowerCase();

    if (mod && key === 'z' && (!typing || !document.activeElement.value)) {
        e.preventDefault();
        e.shiftKey ? doRedo() : doUndo();
        return;
    }
    if (mod && key === 'y' && !typing) { e.preventDefault(); doRedo(); return; }
    if (mod && key === 'p') { e.preventDefault(); printReport(); return; }
    if (mod && key === 'e') { e.preventDefault(); openExportMenu(exportBtn); return; }
    if (mod && key === 'k') { e.preventDefault(); setView('ledger'); composer.prefill('/'); return; }
    if (mod && e.key === 'Enter') { e.preventDefault(); finishReport(); return; }
    if (inDialog || mod || e.altKey) return;

    if (!typing) {
        if (e.key === '/') { e.preventDefault(); setView('ledger'); composer.focus(); return; }
        if (e.key === '?') { e.preventDefault(); openHelp(); return; }
        if (e.key === 'Escape') {
            if (store.getState().ui.view === 'catalog') { setView('ledger'); composer.focus(); }
            else if (setupOpen && metaInfo(store.getState().doc.meta).complete) { setupOpen = false; renderShell(); composer.focus(); }
            return;
        }
        if (e.key.length === 1 && /[\p{L}\p{N}!+\-]/u.test(e.key) && store.getState().ui.view === 'ledger' && !setupOpen) {
            composer.focus();
        }
    } else if (e.key === 'Escape') {
        if (store.getState().ui.view === 'catalog') { setView('ledger'); composer.focus(); }
        else if (setupOpen && metaInfo(store.getState().doc.meta).complete) { setupOpen = false; renderShell(); composer.focus(); }
    }
});

addEventListener('beforeprint', () => printer.build(store.getState().doc));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistSoon.flush(); });
addEventListener('pagehide', () => persistSoon.flush());
addEventListener('storage', e => {
    if (e.key === 'tally:v1' && e.newValue) {
        const saved = JSON.parse(e.newValue);
        if (saved?.doc) store.dispatch({ type: 'DOC_REPLACE', payload: { doc: saved.doc }, meta: { skipHistory: true } });
    }
});

applyTheme();
renderAll();
if (setupOpen) { setup.syncFromMeta(); setup.focus(); }
else composer.focus();
if (migrated) {
    notify(t('migrated'), 'success', { duration: 6000 });
    persistNow();
}
saveState.at = Date.now();

globalThis.tally = {
    store,
    state: () => store.getState(),
    log: () => console.table(store.getLog()),
    dispatch: a => store.dispatch(a),
    undo: doUndo,
    redo: doRedo,
    rows: () => toRows(store.getState().doc),
    csv: () => toCSV(store.getState().doc),
    storageBytes: storage.storageUsage,
    composer: () => composer.debug(),
    catalog: { products: PRODUCTS.length, pharmacies: PHARMACIES.length },
    loadXLSX,
    reset() { storage.wipe(); location.reload(); }
};
