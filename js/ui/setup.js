import { h, icon, clear, flagInvalid, clearInvalid } from '../lib/dom.js';
import { t, label, getLang } from '../i18n.js';
import { CLASSES, REGIONS, MONTHS, PHARMACIES, PHARMACY_BY_ID, pharmaciesFor } from '../data/catalog.js';
import { createIndex, search } from '../lib/search.js';
import { parseYear, toLatinDigits } from '../lib/text.js';
import { metaInfo } from '../core/selectors.js';

const pharmacyIndex = createIndex(PHARMACIES, p => `${p.id} ${p.name}`);

export function suggestedMonth() {
    const d = new Date();
    return d.getDate() <= 20 ? ((d.getMonth() + 11) % 12) + 1 : d.getMonth() + 1;
}

function gridColumns(items) {
    if (!items.length) return 1;
    const top = items[0].offsetTop;
    let n = 0;
    while (n < items.length && items[n].offsetTop === top) n++;
    return Math.max(1, n);
}

function gridNav(e, container, onTopEdge) {
    const items = [...container.querySelectorAll('button')];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const cols = gridColumns(items);
    const rtl = document.documentElement.dir === 'rtl';
    const moves = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: cols, ArrowUp: -cols, Home: -Infinity, End: Infinity };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = i + moves[e.key];
    if (next < 0 && e.key === 'ArrowUp' && onTopEdge) { onTopEdge(); return; }
    items[Math.max(0, Math.min(items.length - 1, next))].focus();
}

export function createSetup({ store, onComplete, onDismiss, onPick }) {
    const local = { cls: null, region: null, query: '' };
    const root = h('section', { class: 'setup card glass', id: 'setup-panel', 'aria-labelledby': 'setup-title' });

    const finder = h('input', {
        class: 'field-input', id: 'pharmacy-finder', type: 'text', autocomplete: 'off', spellcheck: 'false',
        'aria-label': t('pharmacyFinder')
    });
    const finderWrap = h('div', { class: 'field-wrap' }, icon('store', 18), finder);
    const results = h('div', { class: 'pharmacy-grid', id: 'pharmacy-grid', role: 'listbox' });
    const classSeg = h('div', { class: 'segmented', role: 'radiogroup' });
    const regionSeg = h('div', { class: 'segmented', role: 'radiogroup' });
    const monthGrid = h('div', { class: 'month-grid', role: 'radiogroup' });
    const yearValue = h('input', {
        class: 'year-value', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', spellcheck: 'false',
        dir: 'ltr', enterkeyhint: 'done', 'aria-label': t('year')
    });
    const yearDown = h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Previous year' }, icon('minus', 16));
    const yearUp = h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Next year' }, icon('plus', 16));
    const yearStepper = h('div', { class: 'year-stepper' }, yearDown, yearValue, yearUp);
    const yearError = h('p', { class: 'field-error', id: 'year-error', role: 'alert', hidden: true });
    const title = h('h2', { class: 'setup-title', id: 'setup-title' });
    const hint = h('p', { class: 'setup-hint' });
    const pharmacyLabel = h('span', { class: 'field-label' });
    const monthLabel = h('span', { class: 'field-label' });

    root.append(
        h('div', { class: 'setup-head' },
            h('span', { class: 'step-badge' }, '1'),
            h('div', null, title, hint)
        ),
        h('div', { class: 'setup-cols' },
            h('div', { class: 'setup-col' },
                pharmacyLabel,
                finderWrap,
                h('div', { class: 'seg-row' }, classSeg, regionSeg),
                results
            ),
            h('div', { class: 'setup-col setup-col-month' },
                h('div', { class: 'month-head' }, monthLabel, yearStepper, yearError),
                monthGrid
            )
        )
    );

    function meta() { return store.getState().doc.meta; }
    function setMeta(patch, { close = true } = {}) {
        store.dispatch({ type: 'META_SET', payload: patch });
        if (close && metaInfo(meta()).complete && onComplete) onComplete();
    }

    function setYearError(on) {
        yearError.hidden = !on;
        if (on) {
            yearError.textContent = t('yearInvalid');
            yearValue.setAttribute('aria-invalid', 'true');
            yearValue.setAttribute('aria-describedby', 'year-error');
        } else {
            yearValue.removeAttribute('aria-invalid');
            yearValue.removeAttribute('aria-describedby');
        }
    }

    function commitYear() {
        const n = parseYear(yearValue.value);
        if (n !== null && n !== meta().year) setMeta({ year: n }, { close: false });
        yearValue.value = meta().year;
        setYearError(false);
    }

    function stepYear(delta) {
        commitYear();
        setMeta({ year: meta().year + delta }, { close: false });
    }

    function pickPharmacy(p) {
        const before = meta().pharmacyId;
        setMeta({ pharmacyId: p.id });
        if (before !== p.id && onPick) onPick(p, before);
        if (!meta().month) monthGrid.querySelector('.is-suggested, button')?.focus();
    }

    function segButton(active, text, onClick) {
        return h('button', { class: 'seg' + (active ? ' is-active' : ''), type: 'button', role: 'radio', 'aria-checked': String(active), onclick: onClick }, text);
    }

    function renderSegs() {
        clear(classSeg).append(
            segButton(!local.cls, t('allClasses'), () => { local.cls = null; local.region = null; render(); }),
            ...CLASSES.map(c => segButton(local.cls === c.id, label(c), () => { local.cls = c.id; render(); }))
        );
        regionSeg.hidden = !local.cls;
        clear(regionSeg).append(
            ...REGIONS.map(r => segButton(local.region === r.id, label(r), () => { local.region = local.region === r.id ? null : r.id; render(); }))
        );
    }

    function candidateList() {
        const q = local.query.trim();
        if (q) {
            const exact = PHARMACY_BY_ID.get(q.toLowerCase());
            if (exact) return [exact];
            return search(pharmacyIndex, q, { limit: 24 }).map(r => r.item)
                .filter(p => (!local.cls || p.cls === local.cls) && (!local.region || p.region === local.region));
        }
        if (local.cls && local.region) return pharmaciesFor(local.cls, local.region);
        if (local.cls) return PHARMACIES.filter(p => p.cls === local.cls);
        return PHARMACIES;
    }

    function renderPharmacies() {
        const current = meta().pharmacyId;
        const list = candidateList();
        clear(results);
        if (!list.length) {
            results.appendChild(h('p', { class: 'muted small' }, t('noPharmacyMatch')));
            return;
        }
        for (const p of list) {
            results.appendChild(h('button', {
                class: 'pharmacy-chip' + (p.id === current ? ' is-active' : ''),
                type: 'button', role: 'option', 'aria-selected': String(p.id === current),
                dataset: { id: p.id },
                onclick: () => pickPharmacy(p)
            },
                h('span', { class: 'chip-code' }, p.id),
                h('span', { class: 'chip-name', dir: 'rtl' }, p.name)
            ));
        }
    }

    function renderMonths() {
        const m = meta();
        const suggested = suggestedMonth();
        clear(monthGrid);
        for (const mo of MONTHS) {
            const active = m.month === mo.n;
            monthGrid.appendChild(h('button', {
                class: 'month-chip' + (active ? ' is-active' : '') + (!m.month && mo.n === suggested ? ' is-suggested' : ''),
                type: 'button', role: 'radio', 'aria-checked': String(active),
                onclick: () => setMeta({ month: mo.n })
            },
                h('span', { class: 'month-num' }, String(mo.n).padStart(2, '0')),
                h('span', { class: 'month-name' }, getLang() === 'ar' ? mo.ar : mo.en.slice(0, 3))
            ));
        }
        yearValue.value = m.year;
    }

    function render() {
        title.textContent = t('setupTitle');
        hint.textContent = t('setupHint');
        pharmacyLabel.textContent = t('pharmacy');
        monthLabel.textContent = t('month');
        finder.placeholder = t('pharmacyFinderPh');
        finder.setAttribute('aria-label', t('pharmacyFinder'));
        yearValue.setAttribute('aria-label', t('year'));
        yearDown.setAttribute('aria-label', t('prevYear'));
        yearUp.setAttribute('aria-label', t('nextYear'));
        yearDown.title = t('prevYear');
        yearUp.title = t('nextYear');
        monthGrid.setAttribute('aria-label', t('month'));
        results.setAttribute('aria-label', t('pharmacy'));
        renderSegs();
        renderPharmacies();
        renderMonths();
    }

    finder.addEventListener('input', () => { clearInvalid(finderWrap); local.query = finder.value; renderPharmacies(); });
    finder.addEventListener('keydown', e => {
        if (e.isComposing) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            const list = candidateList();
            if (list.length) pickPharmacy(list[0]);
            else flagInvalid(finderWrap);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            results.querySelector('button')?.focus();
        } else if (e.key === 'Escape') {
            e.preventDefault(); e.stopPropagation();
            if (finder.value) { finder.value = ''; local.query = ''; renderPharmacies(); }
            else if (onDismiss) onDismiss();
        }
    });
    results.addEventListener('keydown', e => gridNav(e, results, () => finder.focus()));
    monthGrid.addEventListener('keydown', e => gridNav(e, monthGrid, () => yearUp.focus()));
    root.addEventListener('keydown', e => {
        if (e.key === 'Escape' && e.target !== finder && !e.defaultPrevented) {
            if (onDismiss && onDismiss()) { e.preventDefault(); e.stopPropagation(); }
        }
    });
    yearValue.addEventListener('input', () => {
        const clean = toLatinDigits(yearValue.value).replace(/\D/g, '').slice(0, 4);
        if (clean !== yearValue.value) yearValue.value = clean;
        setYearError(clean.length === 4 && parseYear(clean) === null);
    });
    yearValue.addEventListener('focus', () => yearValue.select());
    yearValue.addEventListener('blur', commitYear);
    yearValue.addEventListener('keydown', e => {
        if (e.isComposing) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            if (parseYear(yearValue.value) === null) { setYearError(true); yearValue.select(); return; }
            commitYear();
            if (metaInfo(meta()).complete && onComplete) onComplete();
            if (!root.hidden) (meta().pharmacyId ? monthGrid.querySelector('.is-active, .is-suggested, button') : finder).focus();
        } else if (e.key === 'Escape' && yearValue.value !== String(meta().year)) {
            e.preventDefault(); e.stopPropagation();
            yearValue.value = meta().year;
            setYearError(false);
            yearValue.select();
        }
    });
    yearDown.addEventListener('click', () => stepYear(-1));
    yearUp.addEventListener('click', () => stepYear(1));

    store.subscribe((s, prev) => {
        if (s.doc.meta !== prev.doc.meta) { renderPharmacies(); renderMonths(); }
    });

    return {
        el: root,
        render,
        syncFromMeta() {
            const p = meta().pharmacyId ? PHARMACY_BY_ID.get(meta().pharmacyId) : null;
            if (p) { local.cls = p.cls; local.region = p.region; }
            local.query = '';
            finder.value = '';
            render();
        },
        focus() { finder.focus(); }
    };
}
