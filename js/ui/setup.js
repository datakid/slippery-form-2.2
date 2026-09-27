import { h, icon, clear } from '../lib/dom.js';
import { t, label, getLang } from '../i18n.js';
import { CLASSES, REGIONS, MONTHS, PHARMACIES, PHARMACY_BY_ID, pharmaciesFor } from '../data/catalog.js';
import { createIndex, search } from '../lib/search.js';
import { metaInfo } from '../core/selectors.js';

const pharmacyIndex = createIndex(PHARMACIES, p => `${p.id} ${p.name}`);

export function suggestedMonth() {
    const d = new Date();
    return d.getDate() <= 20 ? ((d.getMonth() + 11) % 12) + 1 : d.getMonth() + 1;
}

export function createSetup({ store, onComplete }) {
    const local = { cls: null, region: null, query: '' };
    const root = h('section', { class: 'setup card glass', id: 'setup-panel', 'aria-labelledby': 'setup-title' });

    const finder = h('input', {
        class: 'field-input', id: 'pharmacy-finder', type: 'text', autocomplete: 'off', spellcheck: 'false',
        'aria-label': t('pharmacyFinder')
    });
    const results = h('div', { class: 'pharmacy-grid', id: 'pharmacy-grid', role: 'listbox' });
    const classSeg = h('div', { class: 'segmented', role: 'radiogroup' });
    const regionSeg = h('div', { class: 'segmented', role: 'radiogroup' });
    const monthGrid = h('div', { class: 'month-grid', role: 'radiogroup' });
    const yearValue = h('output', { class: 'year-value' });
    const yearDown = h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Previous year' }, icon('minus', 16));
    const yearUp = h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Next year' }, icon('plus', 16));
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
                h('div', { class: 'field-wrap' }, icon('store', 18), finder),
                h('div', { class: 'seg-row' }, classSeg, regionSeg),
                results
            ),
            h('div', { class: 'setup-col setup-col-month' },
                h('div', { class: 'month-head' },
                    monthLabel,
                    h('div', { class: 'year-stepper' }, yearDown, yearValue, yearUp)
                ),
                monthGrid
            )
        )
    );

    function meta() { return store.getState().doc.meta; }
    function setMeta(patch) {
        store.dispatch({ type: 'META_SET', payload: patch });
        if (metaInfo(meta()).complete && onComplete) onComplete();
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
                onclick: () => { setMeta({ pharmacyId: p.id }); }
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
        yearValue.textContent = m.year;
    }

    function render() {
        title.textContent = t('setupTitle');
        hint.textContent = t('setupHint');
        pharmacyLabel.textContent = t('pharmacy');
        monthLabel.textContent = t('month');
        finder.placeholder = t('pharmacyFinderPh');
        renderSegs();
        renderPharmacies();
        renderMonths();
    }

    finder.addEventListener('input', () => { local.query = finder.value; renderPharmacies(); });
    finder.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const list = candidateList();
            if (list.length) setMeta({ pharmacyId: list[0].id });
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            results.querySelector('button')?.focus();
        }
    });
    results.addEventListener('keydown', e => {
        const items = [...results.querySelectorAll('button')];
        const i = items.indexOf(document.activeElement);
        if (i < 0) return;
        const cols = Math.max(1, Math.round(results.clientWidth / (items[0].offsetWidth + 8)));
        const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
        if (e.key in moves) {
            e.preventDefault();
            const dir = document.documentElement.dir === 'rtl' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') ? -1 : 1;
            const next = i + moves[e.key] * dir;
            if (next < 0 && e.key === 'ArrowUp') finder.focus();
            else items[Math.max(0, Math.min(items.length - 1, next))].focus();
        }
    });
    yearDown.addEventListener('click', () => setMeta({ year: meta().year - 1 }));
    yearUp.addEventListener('click', () => setMeta({ year: meta().year + 1 }));

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
