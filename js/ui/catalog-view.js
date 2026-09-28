import { h, icon, clear } from '../lib/dom.js';
import { t } from '../i18n.js';
import { PRODUCTS, productKey } from '../data/catalog.js';
import { createIndex, search } from '../lib/search.js';
import { parseQty } from '../lib/text.js';
import { makeLine, lineKey } from '../core/state.js';
import { sanitizeDigits } from './ledger.js';

const index = createIndex(PRODUCTS, p => `${p.name} ${p.unit}`);

export function createCatalogView({ store, actions }) {
    const filter = h('input', { class: 'filter-input', id: 'catalog-filter', type: 'search', autocomplete: 'off' });
    const onlyFilled = h('button', { class: 'pill-btn', type: 'button', 'aria-pressed': 'false' }, icon('check', 15), h('span'));
    const hint = h('p', { class: 'catalog-hint' });
    const list = h('ol', { class: 'catalog-list', id: 'catalog-list' });
    const noMatch = h('p', { class: 'no-match', hidden: true });
    const root = h('section', { class: 'catalog card', id: 'catalog', hidden: true },
        h('header', { class: 'catalog-head' },
            h('label', { class: 'filter-wrap grow' }, icon('search', 16), filter),
            onlyFilled
        ),
        hint,
        list,
        noMatch
    );

    const rowByKey = new Map();
    let showFilled = false;
    let built = false;

    function qtyMap() {
        const m = new Map();
        for (const l of store.getState().doc.lines) if (!l.custom) m.set(lineKey(l), l);
        return m;
    }

    function build() {
        const frag = document.createDocumentFragment();
        const letters = new Set();
        for (const p of PRODUCTS) {
            const key = 'p:' + productKey(p.name, p.unit);
            const input = h('input', {
                class: 'qty-cell', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off',
                enterkeyhint: 'next', 'aria-label': `${p.name} ${p.unit}`
            });
            const first = p.base[0].toUpperCase();
            const li = h('li', { class: 'catalog-row', dataset: { key } },
                !letters.has(first) ? h('span', { class: 'catalog-letter', 'aria-hidden': 'true' }, first) : null,
                h('div', { class: 'row-main' },
                    h('div', { class: 'row-title' },
                        h('span', { class: 'row-name' }, p.base),
                        p.note ? h('span', { class: 'row-note', dir: 'rtl' }, p.note) : null
                    ),
                    h('div', { class: 'row-meta' }, h('span', { class: 'unit-tag' }, p.unit))
                ),
                h('div', { class: 'row-qty' }, input)
            );
            letters.add(first);
            li._input = input;
            li._product = p;
            input.addEventListener('input', () => sanitizeDigits(input));
            input.addEventListener('focus', () => { input.select(); li.classList.add('is-focus'); });
            input.addEventListener('blur', () => { li.classList.remove('is-focus'); commit(li); });
            input.addEventListener('keydown', e => {
                if (e.isComposing) return;
                if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const vis = visibleRows();
                    const at = vis.indexOf(li);
                    commit(li);
                    move(vis, at, e.key === 'ArrowUp' ? -1 : 1);
                } else if (e.key === 'PageDown' || e.key === 'PageUp') {
                    e.preventDefault();
                    const vis = visibleRows();
                    const at = vis.indexOf(li);
                    commit(li);
                    move(vis, at, e.key === 'PageUp' ? -10 : 10, true);
                } else if (e.key === 'Escape') {
                    e.preventDefault(); e.stopPropagation();
                    const existing = qtyMap().get(key);
                    input.value = existing ? String(existing.qty) : '';
                    filter.focus(); filter.select();
                }
            });
            rowByKey.set(key, li);
            frag.appendChild(li);
        }
        list.appendChild(frag);
        built = true;
    }

    function commit(li) {
        const p = li._product;
        const key = li.dataset.key;
        const existing = qtyMap().get(key);
        const raw = li._input.value.trim();
        const v = raw === '' ? 0 : parseQty(raw);
        if (v === null) { li._input.value = existing ? String(existing.qty) : ''; return; }
        if (existing && v === existing.qty) return;
        if (!existing && v === 0) return;
        if (v === 0) { store.dispatch({ type: 'LINE_REMOVE', payload: { id: existing.id } }); return; }
        if (existing) store.dispatch({ type: 'LINE_UPDATE', payload: { id: existing.id, patch: { qty: v } }, meta: { group: 'cat:' + existing.id } });
        else actions.addLine(makeLine({ name: p.name, unit: p.unit, qty: v, custom: false }), p.key, { mode: 'replace', silent: true });
    }

    function visibleRows() { return [...list.children].filter(li => !li.hidden); }

    function move(vis, i, dir, clamp) {
        let target = i + dir;
        if (clamp) target = Math.max(0, Math.min(vis.length - 1, target));
        const next = vis[target];
        if (next && next.isConnected && !next.hidden) { next._input.focus(); next.scrollIntoView({ block: 'nearest' }); }
        else if (dir < 0) filter.focus();
    }

    function applyFilter() {
        const q = filter.value.trim();
        const m = qtyMap();
        let allowed = null;
        if (q) allowed = new Set(search(index, q, { limit: 400 }).map(r => 'p:' + productKey(r.item.name, r.item.unit)));
        let shown = 0;
        for (const [key, li] of rowByKey) {
            li.hidden = (allowed && !allowed.has(key)) || (showFilled && !m.has(key));
            if (!li.hidden) shown++;
        }
        list.classList.toggle('is-filtered', Boolean(q) || showFilled);
        list.hidden = shown === 0;
        noMatch.hidden = shown !== 0;
        if (!shown) noMatch.textContent = showFilled && !q ? t('catalogNoneFilled') : t('noLineMatch', q);
    }

    function sync() {
        if (!built) return;
        const m = qtyMap();
        for (const [key, li] of rowByKey) {
            const l = m.get(key);
            li.classList.toggle('has-qty', Boolean(l));
            if (document.activeElement !== li._input) li._input.value = l ? String(l.qty) : '';
        }
        if (showFilled) applyFilter();
    }

    filter.addEventListener('input', applyFilter);
    filter.addEventListener('keydown', e => {
        if (e.isComposing) return;
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            const first = visibleRows()[0];
            if (first) first._input.focus();
        } else if (e.key === 'Escape' && filter.value) {
            e.preventDefault(); e.stopPropagation();
            filter.value = ''; applyFilter();
        }
    });
    onlyFilled.addEventListener('click', () => {
        showFilled = !showFilled;
        onlyFilled.setAttribute('aria-pressed', String(showFilled));
        onlyFilled.classList.toggle('is-active', showFilled);
        applyFilter();
    });

    store.subscribe((s, prev) => { if (s.doc.lines !== prev.doc.lines && !root.hidden) sync(); });

    return {
        el: root,
        render() {
            filter.placeholder = t('catalogFilterPh');
            filter.setAttribute('aria-label', t('catalogFilterPh'));
            root.setAttribute('aria-label', t('viewCatalog'));
            hint.textContent = t('catalogHint');
            onlyFilled.querySelector('span').textContent = t('inReport');
        },
        show() {
            if (!built) build();
            root.hidden = false;
            sync();
            applyFilter();
            requestAnimationFrame(() => filter.focus());
        },
        hide() {
            const a = document.activeElement;
            if (a && root.contains(a)) a.blur();
            root.hidden = true;
        },
        focusFilter() { if (!root.hidden) filter.focus(); }
    };
}
