import { h, icon, clear } from '../lib/dom.js';
import { t } from '../i18n.js';
import { CONTEXTS } from '../data/catalog.js';
import { visibleLines, totals } from '../core/selectors.js';
import { parseQty } from '../lib/text.js';
import { openMenu } from './overlay.js';

function qtyInput(value, focusKey) {
    return h('input', {
        class: 'qty-cell', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off',
        value: value ? String(value) : '', dataset: { focusKey }, enterkeyhint: 'next', 'aria-label': t('qty')
    });
}

export function sanitizeDigits(el) {
    const clean = el.value.replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/\D/g, '').slice(0, 7);
    if (clean !== el.value) el.value = clean;
}

function captureFocus(root) {
    const a = document.activeElement;
    if (!a || !root.contains(a) || !a.dataset.focusKey) return null;
    return { key: a.dataset.focusKey, start: a.selectionStart, end: a.selectionEnd, value: a.value };
}

function restoreFocus(root, snap) {
    if (!snap) return;
    const el = root.querySelector(`[data-focus-key="${CSS.escape(snap.key)}"]`);
    if (!el || document.activeElement === el) return;
    el.focus({ preventScroll: true });
    try { el.setSelectionRange(snap.start, snap.end); } catch {}
}

export function createLedger({ store, actions }) {
    const filterInput = h('input', { class: 'filter-input', id: 'ledger-filter', type: 'search', autocomplete: 'off' });
    const sortBtn = h('button', { class: 'pill-btn', type: 'button', id: 'sort-btn', 'aria-haspopup': 'menu' }, icon('sort', 16), h('span'));
    const alertBar = h('div', { class: 'context-alert', hidden: true });
    const list = h('ol', { class: 'ledger-list', id: 'ledger-list' });
    const empty = h('div', { class: 'empty-state', id: 'ledger-empty' });
    const summary = h('div', { class: 'ledger-summary' });
    const tools = h('div', { class: 'ledger-tools' },
        h('label', { class: 'filter-wrap' }, icon('search', 16), filterInput),
        sortBtn
    );
    const root = h('section', { class: 'ledger card', id: 'ledger', 'aria-label': t('viewLines') },
        h('header', { class: 'ledger-head' }, summary, tools),
        alertBar, list, empty
    );

    const rows = new Map();

    function contextButton(line) {
        const btn = h('button', {
            class: 'ctx-pill' + (line.context ? '' : ' is-missing'), type: 'button', 'aria-haspopup': 'menu',
            dataset: { focusKey: line.id + ':ctx' }
        }, icon(line.context ? 'tag' : 'alert', 13), h('span', { dir: line.context ? 'rtl' : null }, line.context || t('pickContext')));
        btn.addEventListener('click', () => {
            openMenu(btn, CONTEXTS.map((c, i) => ({
                label: c.id, hint: `${c.en} · #${c.key}`, checked: line.context === c.id,
                kbd: String(i + 1),
                run: () => store.dispatch({ type: 'LINE_UPDATE', payload: { id: line.id, patch: { context: c.id } } })
            })), { align: 'start' });
        });
        return btn;
    }

    function buildRow(line) {
        const qty = qtyInput(line.qty, line.id + ':qty');
        const remove = h('button', { class: 'icon-btn sm row-remove', type: 'button', 'aria-label': t('remove'), title: t('remove') }, icon('trash', 16));
        const li = h('li', { class: 'ledger-row', dataset: { id: line.id } });
        li._qty = qty;
        li._remove = remove;
        remove.addEventListener('click', () => actions.removeLine(line.id));
        qty.addEventListener('input', () => sanitizeDigits(qty));
        qty.addEventListener('focus', () => { qty.select(); li.classList.add('is-focus'); });
        qty.addEventListener('blur', () => { li.classList.remove('is-focus'); commitQty(li); });
        qty.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                commitQty(li);
                moveFocus(li.dataset.id, e.key === 'ArrowUp' ? -1 : 1);
            } else if (e.key === 'Escape') {
                e.preventDefault(); e.stopPropagation();
                const cur = findLine(li.dataset.id);
                qty.value = cur ? String(cur.qty) : '';
                qty.blur();
            }
        });
        paint(li, line);
        return li;
    }

    function paint(li, line) {
        li._line = line;
        li.classList.toggle('is-custom', line.custom);
        li.classList.toggle('is-zero', !(line.qty > 0));
        li.classList.toggle('is-last', store.getState().ui.lastLineId === line.id);
        const noteMatch = !line.custom && line.name.match(/\(([^)]*[\u0600-\u06FF][^)]*)\)\s*$/);
        const base = noteMatch ? line.name.slice(0, noteMatch.index).trim() : line.name;
        const body = h('div', { class: 'row-main' },
            h('div', { class: 'row-title' },
                h('span', { class: 'row-name' }, base),
                noteMatch ? h('span', { class: 'row-note', dir: 'rtl' }, noteMatch[1]) : null
            ),
            h('div', { class: 'row-meta' },
                h('span', { class: 'unit-tag' }, line.unit || '—'),
                line.custom ? h('span', { class: 'new-tag' }, t('newItem')) : null,
                line.custom ? contextButton(line) : null
            )
        );
        const keep = li._qty;
        if (document.activeElement !== keep) keep.value = line.qty ? String(line.qty) : '';
        clear(li).append(body, h('div', { class: 'row-qty' }, keep), li._remove);
    }

    function findLine(id) { return store.getState().doc.lines.find(l => l.id === id); }

    function commitQty(li) {
        const line = findLine(li.dataset.id);
        if (!line) return;
        const v = parseQty(li._qty.value);
        if (v === null) { li._qty.value = String(line.qty); return; }
        if (v === line.qty) return;
        if (v === 0) { actions.removeLine(line.id); return; }
        store.dispatch({ type: 'LINE_UPDATE', payload: { id: line.id, patch: { qty: v } }, meta: { group: 'qty:' + line.id } });
    }

    function moveFocus(id, dir) {
        const order = [...list.children];
        const i = order.findIndex(el => el.dataset.id === id);
        const next = order[i + dir];
        if (next) next._qty.focus();
        else if (dir < 0 || i === order.length - 1) actions.focusComposer();
    }

    function renderAlert(s) {
        const tt = totals(s.doc.lines);
        alertBar.hidden = !tt.needsContext;
        if (!tt.needsContext) return;
        clear(alertBar).append(
            icon('alert', 16),
            h('span', null, t('needsContext', tt.needsContext)),
            h('button', {
                class: 'link-btn', type: 'button',
                onclick: () => store.dispatch({ type: 'UI_SET', payload: { onlyNeedsContext: !s.ui.onlyNeedsContext } })
            }, s.ui.onlyNeedsContext ? t('showAll') : t('showOnly'))
        );
    }

    function renderSummary(s) {
        const tt = totals(s.doc.lines);
        clear(summary).append(
            h('span', { class: 'sum-big' }, tt.units.toLocaleString('en')),
            h('span', { class: 'sum-small' }, t('units', tt.units).replace(/^[\d,]+\s*/, ''), ' · ', t('lines', tt.count))
        );
        const labels = { recent: t('sortRecent'), name: t('sortName'), qty: t('sortQty') };
        sortBtn.querySelector('span').textContent = labels[s.prefs.sort];
    }

    function render() {
        const s = store.getState();
        const snap = captureFocus(root);
        const vis = visibleLines(s);
        const seen = new Set();
        const frag = [];
        for (const line of vis) {
            seen.add(line.id);
            let li = rows.get(line.id);
            if (!li) {
                li = buildRow(line);
                li.classList.add('is-new');
                setTimeout(() => li.classList.remove('is-new'), 600);
                rows.set(line.id, li);
            } else if (li._line !== line || li.classList.contains('is-last') !== (s.ui.lastLineId === line.id)) {
                paint(li, line);
            }
            frag.push(li);
        }
        for (const [id, li] of rows) if (!seen.has(id)) { li.remove(); rows.delete(id); }
        const current = [...list.children];
        const same = current.length === frag.length && current.every((el, i) => el === frag[i]);
        if (!same) list.replaceChildren(...frag);

        const hasLines = s.doc.lines.length > 0;
        empty.hidden = hasLines;
        list.hidden = !hasLines;
        tools.hidden = !hasLines;
        root.classList.toggle('is-empty', !hasLines);
        if (!hasLines) {
            clear(empty).append(
                h('div', { class: 'empty-art', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')),
                h('h3', null, t('emptyTitle')),
                h('p', null, t('emptyHint')),
                h('p', { class: 'empty-tip' }, t('emptyTip'))
            );
        }
        renderAlert(s);
        renderSummary(s);
        restoreFocus(root, snap);
    }

    filterInput.addEventListener('input', () => store.dispatch({ type: 'UI_SET', payload: { filter: filterInput.value } }));
    filterInput.addEventListener('keydown', e => {
        if (e.key === 'Escape' && filterInput.value) { e.preventDefault(); e.stopPropagation(); filterInput.value = ''; store.dispatch({ type: 'UI_SET', payload: { filter: '' } }); }
        if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); list.firstElementChild?._qty.focus(); }
    });
    sortBtn.addEventListener('click', () => {
        const cur = store.getState().prefs.sort;
        openMenu(sortBtn, [
            { label: t('sortRecent'), icon: 'history', checked: cur === 'recent', run: () => store.dispatch({ type: 'PREFS_SET', payload: { sort: 'recent' } }) },
            { label: t('sortName'), icon: 'list', checked: cur === 'name', run: () => store.dispatch({ type: 'PREFS_SET', payload: { sort: 'name' } }) },
            { label: t('sortQty'), icon: 'sort', checked: cur === 'qty', run: () => store.dispatch({ type: 'PREFS_SET', payload: { sort: 'qty' } }) }
        ]);
    });

    store.subscribe((s, prev) => {
        if (s.doc.lines !== prev.doc.lines || s.ui !== prev.ui || s.prefs.sort !== prev.prefs.sort) render();
    });

    return {
        el: root,
        render() {
            filterInput.placeholder = t('filterPh');
            rows.forEach(li => li.remove());
            rows.clear();
            render();
        },
        focusFirst() { list.firstElementChild?._qty.focus(); }
    };
}
