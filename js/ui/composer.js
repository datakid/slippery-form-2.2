import { h, icon, clear } from '../lib/dom.js';
import { t } from '../i18n.js';
import { PRODUCTS, CONTEXTS, PRODUCT_MAP, productKey } from '../data/catalog.js';
import { createIndex, searchWithLayoutFallback } from '../lib/search.js';
import { parseOmni } from '../lib/omni.js';
import { parseQty, debounce, normalize } from '../lib/text.js';
import { makeLine, lineKey } from '../core/state.js';

const productIndex = createIndex(PRODUCTS, p => `${p.name} ${p.unit}`);

export function createComposer({ store, commands, actions }) {
    const st = { mode: 'search', selected: null, results: [], active: 0, open: false, custom: null, remapped: null };

    const input = h('input', {
        class: 'composer-input', id: 'composer-input', type: 'text', autocomplete: 'off', spellcheck: 'false',
        role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'composer-results', 'aria-autocomplete': 'list',
        enterkeyhint: 'next'
    });
    const chip = h('button', { class: 'selected-chip', type: 'button', hidden: true });
    const qty = h('input', {
        class: 'composer-qty', id: 'composer-qty', type: 'text', inputmode: 'numeric', autocomplete: 'off',
        pattern: '[0-9]*', enterkeyhint: 'done', 'aria-label': t('qty')
    });
    const stepDown = h('button', { class: 'qty-step', type: 'button', tabindex: '-1', 'aria-label': '−1' }, icon('minus', 15));
    const stepUp = h('button', { class: 'qty-step', type: 'button', tabindex: '-1', 'aria-label': '+1' }, icon('plus', 15));
    const addBtn = h('button', { class: 'btn btn-primary composer-add', type: 'button', id: 'composer-add' }, icon('plus', 18), h('span', { class: 'composer-add-label' }));
    const list = h('div', { class: 'composer-results', id: 'composer-results', role: 'listbox', hidden: true });
    const unitInput = h('input', { class: 'field-input sm', id: 'custom-unit', type: 'text', autocomplete: 'off' });
    const ctxGroup = h('div', { class: 'segmented ctx-seg', role: 'radiogroup' });
    const customRow = h('div', { class: 'composer-custom', hidden: true },
        h('span', { class: 'custom-badge' }, icon('sparkle', 14), h('span', { class: 'custom-badge-text' })),
        h('label', { class: 'custom-field' }, h('span', { class: 'field-label sm custom-unit-label' }), unitInput),
        h('div', { class: 'custom-field' }, h('span', { class: 'field-label sm custom-ctx-label' }), ctxGroup)
    );
    const quick = h('div', { class: 'quick-strip', id: 'quick-strip' });

    const bar = h('div', { class: 'composer-bar' },
        h('span', { class: 'composer-icon' }, icon('search', 20)),
        h('div', { class: 'composer-field' }, chip, input),
        h('div', { class: 'qty-wrap' }, stepDown, qty, stepUp),
        addBtn
    );
    const root = h('section', { class: 'composer card glass', id: 'composer', 'aria-label': t('addLine') }, bar, customRow, list);

    function lines() { return store.getState().doc.lines; }

    function inReportQty(p) {
        const k = 'p:' + productKey(p.name, p.unit);
        const l = lines().find(x => lineKey(x) === k);
        return l ? l.qty : 0;
    }

    function currentUsage() {
        const s = store.getState();
        return s.usage[s.doc.meta.pharmacyId || '_'] || {};
    }

    function usageBoost(p) {
        const u = currentUsage()[p.key] || 0;
        return Math.min(u, 12) * 1.5;
    }

    function setOpen(v) {
        st.open = v && (st.results.length > 0 || st.mode === 'command');
        list.hidden = !st.open;
        input.setAttribute('aria-expanded', String(st.open));
        root.classList.toggle('is-open', st.open);
    }

    function renderResults() {
        clear(list);
        if (st.remapped) list.appendChild(h('div', { class: 'results-note' }, icon('keyboard', 14), t('layoutFixed', st.remapped)));
        if (st.mode === 'command') list.appendChild(h('div', { class: 'results-heading' }, t('commands')));
        st.results.forEach((r, i) => {
            const id = `opt-${i}`;
            let row;
            if (r.type === 'product') {
                const p = r.item;
                const have = inReportQty(p);
                row = h('div', { class: 'result', id, role: 'option' },
                    h('span', { class: 'result-main' },
                        h('span', { class: 'result-name' }, p.base),
                        p.note ? h('span', { class: 'result-note', dir: 'rtl' }, p.note) : null
                    ),
                    h('span', { class: 'result-unit' }, p.unit),
                    have ? h('span', { class: 'result-have' }, `${have} ${t('inReport')}`) : null
                );
            } else if (r.type === 'pharmacy') {
                const cur = store.getState().doc.meta.pharmacyId === r.item.id;
                row = h('div', { class: 'result result-cmd', id, role: 'option' },
                    icon('store', 17),
                    h('span', { class: 'result-main' },
                        h('span', { class: 'result-name', dir: 'rtl' }, r.item.name),
                        h('span', { class: 'result-sub' }, cur ? t('pharmacyCurrent') : t('switchPharmacy'))
                    ),
                    h('span', { class: 'result-unit' }, r.item.id)
                );
            } else if (r.type === 'adjust') {
                const l = r.line;
                row = h('div', { class: 'result result-cmd' + (l ? '' : ' is-disabled'), id, role: 'option' },
                    icon(r.delta < 0 ? 'minus' : 'plus', 17),
                    h('span', { class: 'result-main' },
                        h('span', { class: 'result-name' }, l ? l.name.split(' (')[0] : t('noLastLine')),
                        l ? h('span', { class: 'result-sub' }, t('adjustPreview', l.qty, Math.max(0, l.qty + r.delta))) : null
                    ),
                    l ? h('span', { class: 'result-unit' }, l.unit || '—') : null
                );
            } else if (r.type === 'new') {
                row = h('div', { class: 'result result-new', id, role: 'option' },
                    icon('sparkle', 16),
                    h('span', { class: 'result-main' },
                        h('span', { class: 'result-name' }, t('addAsNew', r.name)),
                        h('span', { class: 'result-sub' }, t('addAsNewHint'))
                    )
                );
            } else {
                row = h('div', { class: 'result result-cmd', id, role: 'option' },
                    icon(r.item.icon, 17),
                    h('span', { class: 'result-main' }, h('span', { class: 'result-name' }, r.item.label())),
                    r.item.kbd ? h('kbd', null, r.item.kbd) : null
                );
            }
            row.setAttribute('aria-selected', String(i === st.active));
            if (i === st.active) row.classList.add('is-active');
            row.addEventListener('pointerdown', e => e.preventDefault());
            row.addEventListener('click', () => { st.active = i; choose(r); });
            row.addEventListener('pointermove', () => {
                if (st.active !== i) { st.active = i; highlight(); }
            });
            list.appendChild(row);
        });
        if (st.results.length) input.setAttribute('aria-activedescendant', `opt-${st.active}`);
        else input.removeAttribute('aria-activedescendant');
    }

    function highlight() {
        [...list.querySelectorAll('.result')].forEach((el, i) => {
            el.classList.toggle('is-active', i === st.active);
            el.setAttribute('aria-selected', String(i === st.active));
            if (i === st.active) el.scrollIntoView({ block: 'nearest' });
        });
        input.setAttribute('aria-activedescendant', `opt-${st.active}`);
    }

    const runSearch = debounce(() => compute(), 40);

    function compute() {
        const raw = input.value;
        const parsed = parseOmni(raw);
        st.remapped = null;
        st.mode = 'search';
        if (parsed.kind === 'pharmacy') {
            st.results = [{ type: 'pharmacy', item: parsed.pharmacy }];
        } else if (parsed.kind === 'adjust') {
            st.results = [{ type: 'adjust', delta: parsed.delta, line: actions.lastLine() }];
        } else if (parsed.kind === 'command') {
            st.mode = 'command';
            const q = parsed.query;
            st.results = commands()
                .filter(c => !q || c.id.startsWith(q) || normalize(c.label()).includes(normalize(q)))
                .map(c => ({ type: 'cmd', item: c }));
        } else if (parsed.kind === 'line' && parsed.name) {
            if (parsed.forceExt) {
                st.results = [{ type: 'new', name: parsed.name }];
            } else {
                const { results, remapped } = searchWithLayoutFallback(productIndex, parsed.name + (parsed.unit ? ' ' + parsed.unit : ''), { limit: 8, boost: usageBoost });
                st.remapped = remapped;
                st.results = results.map(r => ({ type: 'product', item: r.item }));
                if (parsed.name.length >= 2) st.results.push({ type: 'new', name: parsed.name });
            }
        } else {
            st.results = [];
        }
        st.active = 0;
        renderResults();
        setOpen(document.activeElement === input);
    }

    function select(product) {
        runSearch.cancel();
        st.selected = product;
        st.custom = null;
        st.mode = 'qty';
        chip.hidden = false;
        clear(chip).append(
            h('span', { class: 'chip-name' }, product.base),
            h('span', { class: 'chip-unit' }, product.unit),
            icon('x', 14)
        );
        chip.title = product.name;
        input.value = '';
        input.hidden = true;
        customRow.hidden = true;
        qty.value = '';
        setOpen(false);
        root.classList.remove('is-custom');
        root.classList.add('has-selection');
        const have = inReportQty(product);
        qty.placeholder = have ? t('prev', have) : t('composerPhQty');
        qty.focus();
        qty.select();
    }

    function startCustom(name, preset = {}) {
        runSearch.cancel();
        st.custom = { name, unit: preset.unit || '', context: preset.context || null };
        st.selected = null;
        st.mode = 'custom';
        chip.hidden = false;
        clear(chip).append(h('span', { class: 'chip-name' }, name), icon('x', 14));
        chip.title = name;
        input.value = '';
        input.hidden = true;
        customRow.hidden = false;
        root.classList.add('has-selection', 'is-custom');
        unitInput.value = st.custom.unit;
        renderCtx();
        setOpen(false);
        qty.value = preset.qty ? String(preset.qty) : '';
        qty.placeholder = t('composerPhQty');
        (st.custom.unit ? qty : unitInput).focus();
    }

    function renderCtx() {
        clear(ctxGroup);
        CONTEXTS.forEach((c, i) => {
            const active = st.custom?.context === c.id;
            ctxGroup.appendChild(h('button', {
                class: 'seg' + (active ? ' is-active' : ''), type: 'button', role: 'radio', 'aria-checked': String(active),
                title: `${c.en} · #${c.key}`,
                onclick: () => { st.custom.context = active ? null : c.id; renderCtx(); qty.focus(); }
            }, h('span', { dir: 'rtl' }, c.id), h('kbd', { class: 'seg-kbd' }, String(i + 1))));
        });
    }

    function reset({ keepFocus = true } = {}) {
        runSearch.cancel();
        st.selected = null;
        st.custom = null;
        st.mode = 'search';
        st.results = [];
        chip.hidden = true;
        input.hidden = false;
        input.value = '';
        qty.value = '';
        qty.placeholder = t('composerPhQty');
        customRow.hidden = true;
        root.classList.remove('has-selection', 'is-custom', 'shake');
        setOpen(false);
        if (keepFocus) input.focus();
    }

    function shake() {
        root.classList.remove('shake');
        void root.offsetWidth;
        root.classList.add('shake');
    }

    function commit(entry, amount) {
        const q = amount ?? parseQty(qty.value);
        if (!q) { shake(); actions.notify(t('qtyRequired'), 'danger'); qty.focus(); qty.select(); return false; }
        const line = entry.custom
            ? makeLine({ name: entry.name, unit: entry.unit, qty: q, context: entry.context, custom: true })
            : makeLine({ name: entry.name, unit: entry.unit, qty: q, custom: false });
        actions.addLine(line, entry.key);
        reset();
        return true;
    }

    function commitCurrent() {
        if (st.mode === 'qty' && st.selected) return commit(st.selected);
        if (st.mode === 'custom' && st.custom) {
            st.custom.unit = unitInput.value.trim();
            return commit({ ...st.custom, custom: true });
        }
        return false;
    }

    function choose(r) {
        if (!r) { shake(); actions.notify(t('noMatchHint'), 'danger', { duration: 2600 }); return; }
        if (r.type === 'cmd') { reset({ keepFocus: false }); r.item.run(); return; }
        if (r.type === 'pharmacy') { reset(); actions.setPharmacy(r.item); return; }
        if (r.type === 'adjust') {
            if (actions.adjustLast(r.delta)) reset();
            else shake();
            return;
        }
        const parsed = parseOmni(input.value);
        if (r.type === 'product') {
            if (parsed.kind === 'line' && parsed.qty) { commit(r.item, parsed.qty); return; }
            select(r.item);
        } else if (r.type === 'new') {
            const preset = parsed.kind === 'line' ? { unit: parsed.unit, context: parsed.context, qty: parsed.qty } : {};
            if (preset.unit && preset.context && preset.qty) {
                commit({ name: r.name, unit: preset.unit, context: preset.context, custom: true }, preset.qty);
                return;
            }
            startCustom(r.name, preset);
        }
    }

    function handleEnter() {
        const parsed = parseOmni(input.value);
        if (parsed.kind === 'empty') return;
        if (parsed.kind === 'adjust') { choose({ type: 'adjust', delta: parsed.delta }); return; }
        if (parsed.kind === 'pharmacy') { choose({ type: 'pharmacy', item: parsed.pharmacy }); return; }
        if (parsed.kind === 'line' && parsed.forceExt) {
            if (!parsed.name) { shake(); actions.notify(t('nameRequired'), 'danger'); return; }
            choose({ type: 'new', name: parsed.name });
            return;
        }
        if (!runSearch.flush() && !st.results.length) compute();
        choose(st.results[st.active]);
    }

    input.addEventListener('input', () => {
        if (input.value.trim() === '') { runSearch.cancel(); st.results = []; st.remapped = null; setOpen(false); return; }
        runSearch();
    });
    input.addEventListener('focus', () => { if (input.value) compute(); });
    input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) setOpen(false); }, 80));
    input.addEventListener('keydown', e => {
        if (e.isComposing) return;
        if (e.key === 'ArrowDown' && st.results.length) {
            e.preventDefault();
            if (!st.open) setOpen(true);
            else { st.active = (st.active + 1) % st.results.length; highlight(); }
        } else if (e.key === 'ArrowUp' && st.results.length && st.open) {
            e.preventDefault();
            st.active = (st.active - 1 + st.results.length) % st.results.length; highlight();
        } else if (e.key === 'ArrowDown' && !input.value) {
            if (actions.focusLedger()) e.preventDefault();
        } else if ((e.key === 'Home' || e.key === 'End') && st.open && st.results.length) {
            e.preventDefault();
            st.active = e.key === 'Home' ? 0 : st.results.length - 1; highlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleEnter();
        } else if (e.key === 'Escape') {
            if (st.open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
            else if (input.value) { e.preventDefault(); e.stopPropagation(); input.value = ''; }
        } else if (e.key === 'Tab' && st.open && st.results[st.active]?.type === 'product' && !e.shiftKey) {
            e.preventDefault();
            choose(st.results[st.active]);
        }
    });

    qty.addEventListener('input', () => {
        const clean = qty.value.replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/\D/g, '').slice(0, 7);
        if (clean !== qty.value) qty.value = clean;
    });
    qty.addEventListener('keydown', e => {
        if (e.isComposing) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            if (st.mode === 'search') {
                if (input.value.trim()) handleEnter();
                else input.focus();
                return;
            }
            commitCurrent();
        } else if (e.key === 'Escape' || (e.key === 'Backspace' && !qty.value && st.mode !== 'search')) {
            e.preventDefault();
            e.stopPropagation();
            if (st.mode === 'custom' && e.key === 'Backspace') { unitInput.focus(); return; }
            const name = st.selected?.base || st.custom?.name || '';
            reset();
            input.value = name;
            compute();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            bump((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
        } else if (st.mode === 'custom' && e.altKey && /^Digit[1-4]$/.test(e.code || '')) {
            e.preventDefault();
            st.custom.context = CONTEXTS[+e.code.slice(5) - 1].id; renderCtx(); qty.focus();
        }
    });
    qty.addEventListener('focus', () => qty.select());
    function bump(d) {
        const v = Math.min(9999999, Math.max(0, (parseQty(qty.value) || 0) + d));
        qty.value = v ? String(v) : '';
        qty.focus();
        const end = qty.value.length;
        try { qty.setSelectionRange(end, end); } catch {}
    }
    stepUp.addEventListener('click', () => bump(1));
    stepDown.addEventListener('click', () => bump(-1));

    unitInput.addEventListener('keydown', e => {
        if (e.isComposing) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            st.custom.unit = unitInput.value.trim();
            if (st.custom.context) qty.focus();
            else ctxGroup.querySelector('.is-active, button')?.focus();
        } else if (e.key === 'Escape') {
            e.preventDefault(); e.stopPropagation();
            const name = st.custom?.name || '';
            reset();
            input.value = name;
            compute();
        }
    });
    unitInput.addEventListener('input', () => { if (st.custom) st.custom.unit = unitInput.value; });
    ctxGroup.addEventListener('keydown', e => {
        const btns = [...ctxGroup.querySelectorAll('button')];
        const i = btns.indexOf(document.activeElement);
        const digit = /^Digit[1-4]$/.test(e.code || '') ? +e.code.slice(5) : /^[1-4]$/.test(e.key) ? +e.key : 0;
        if (digit) { e.preventDefault(); if (st.custom) { st.custom.context = CONTEXTS[digit - 1].id; renderCtx(); } qty.focus(); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const dir = (e.key === 'ArrowRight') !== (document.documentElement.dir === 'rtl') ? 1 : -1;
            btns[(i + dir + btns.length) % btns.length].focus();
        } else if (e.key === 'Enter' && i >= 0) {
            e.preventDefault();
            if (st.custom) { st.custom.context = CONTEXTS[i].id; renderCtx(); }
            qty.focus();
        } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); unitInput.focus(); }
    });

    chip.addEventListener('click', () => {
        const name = st.selected?.base || st.custom?.name || '';
        reset();
        input.value = name;
        compute();
    });

    addBtn.addEventListener('click', () => {
        if (st.mode === 'search') {
            if (input.value.trim()) handleEnter();
            else input.focus();
        } else commitCurrent();
    });

    function renderQuick() {
        const usage = currentUsage();
        const top = Object.entries(usage)
            .filter(([k]) => PRODUCT_MAP.has(k))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([k]) => PRODUCT_MAP.get(k));
        clear(quick);
        quick.hidden = !top.length;
        if (!top.length) return;
        quick.appendChild(h('span', { class: 'quick-label' }, icon('bolt', 14), t('frequent')));
        for (const p of top) {
            const have = inReportQty(p);
            quick.appendChild(h('button', {
                class: 'quick-chip' + (have ? ' is-have' : ''), type: 'button', title: `${p.name} · ${p.unit}`,
                onclick: () => { actions.showLedger(); select(p); }
            }, p.base.length > 22 ? p.base.slice(0, 21) + '…' : p.base, h('small', null, p.unit)));
        }
    }

    function render() {
        input.placeholder = t('composerPh');
        const have = st.selected ? inReportQty(st.selected) : 0;
        qty.placeholder = have ? t('prev', have) : t('composerPhQty');
        qty.setAttribute('aria-label', t('qty'));
        root.setAttribute('aria-label', t('addLine'));
        input.setAttribute('aria-label', t('composerPh'));
        stepDown.title = t('stepHint');
        stepUp.title = t('stepHint');
        addBtn.querySelector('.composer-add-label').textContent = t('add');
        unitInput.placeholder = t('unitPh');
        customRow.querySelector('.custom-badge-text').textContent = t('newItem');
        customRow.querySelector('.custom-unit-label').textContent = t('unit');
        customRow.querySelector('.custom-ctx-label').textContent = t('context');
        renderQuick();
    }

    store.subscribe((s, prev) => {
        if (s.usage !== prev.usage || s.doc.meta.pharmacyId !== prev.doc.meta.pharmacyId || s.doc.lines !== prev.doc.lines) renderQuick();
    });

    return {
        el: root,
        quickEl: quick,
        render,
        focus() {
            if (st.mode === 'search') input.focus();
            else if (st.mode === 'custom' && !unitInput.value.trim()) unitInput.focus();
            else qty.focus();
        },
        reset,
        prefill(text) { reset(); input.value = text; compute(); },
        debug: () => ({ ...st, results: st.results.length })
    };
}
