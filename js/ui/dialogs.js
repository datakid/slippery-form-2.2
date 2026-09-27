import { h, icon, clear, kbd } from '../lib/dom.js';
import { t, label, getLang } from '../i18n.js';
import { openSheet, confirmSheet, toast } from './overlay.js';
import { analyzeFile } from '../services/importer.js';
import { makeLine } from '../core/state.js';
import { metaInfo, totals } from '../core/selectors.js';
import { CONTEXTS } from '../data/catalog.js';

export function openHelp() {
    const tips = t('tips').map(([code, text]) => h('li', { class: 'tip-row' }, h('code', null, code), h('span', null, text)));
    const keys = t('keys').map(([k, text]) => h('li', { class: 'tip-row' }, kbd(...k), h('span', null, text)));
    openSheet({
        title: t('shortcuts'), size: 'md',
        body: h('div', { class: 'help-grid' },
            h('section', null, h('h3', { class: 'help-h' }, icon('bolt', 16), t('tipsTitle')), h('ul', { class: 'tip-list' }, tips)),
            h('section', null, h('h3', { class: 'help-h' }, icon('keyboard', 16), t('keysTitle')), h('ul', { class: 'tip-list' }, keys))
        )
    });
}

export function openImport({ store, actions }) {
    const fileInput = h('input', { type: 'file', accept: '.csv,.xlsx,.xls,.xlsm,.ods,text/csv', hidden: true });
    const drop = h('button', { class: 'drop-zone', type: 'button' },
        h('span', { class: 'drop-icon' }, icon('upload', 26)),
        h('strong', null, t('importDrop')),
        h('small', null, t('importAccepted'))
    );
    const body = h('div', { class: 'import-body' }, h('p', { class: 'sheet-text' }, t('importHint')), drop, fileInput);
    const sheet = openSheet({ title: t('importTitle'), size: 'lg', body });

    drop.addEventListener('click', () => fileInput.click());
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', e => { if (e.dataTransfer?.files?.[0]) handle(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) handle(fileInput.files[0]); });

    async function handle(file) {
        drop.classList.add('is-busy');
        let result;
        try { result = await analyzeFile(file); }
        catch (err) { console.error('[import]', err); toast(t('importFailed'), { tone: 'danger' }); drop.classList.remove('is-busy'); return; }
        drop.classList.remove('is-busy');
        if (!result.items.length) { toast(t('importNothing'), { tone: 'danger' }); return; }
        review(result);
    }

    function review(result) {
        const items = result.items.map(i => ({ ...i, include: true }));
        const stats = h('div', { class: 'import-stats' });
        const table = h('ol', { class: 'import-list' });
        const addBtn = h('button', { class: 'btn btn-primary', type: 'button' });

        function draw() {
            const c = { matched: 0, suggested: 0, custom: 0 };
            items.forEach(i => { c[i.status]++; });
            clear(stats).append(
                stat(t('matched'), c.matched, 'ok'),
                stat(t('suggested'), c.suggested, 'warn'),
                stat(t('custom'), c.custom, 'new'),
                stat(t('skipped'), result.skipped.length, 'muted')
            );
            clear(table);
            items.forEach((it) => {
                const toggle = h('input', { type: 'checkbox', checked: it.include, 'aria-label': it.name });
                toggle.addEventListener('change', () => { it.include = toggle.checked; draw(); });
                const actionsCell = [];
                if (it.status === 'suggested') {
                    actionsCell.push(
                        h('button', { class: 'btn btn-sm btn-tonal', type: 'button', onclick: () => {
                            Object.assign(it, { status: 'matched', name: it.suggestion.name, unit: it.suggestion.unit, custom: false, context: null });
                            draw();
                        } }, t('accept'), ' → ', it.suggestion.name, ' ', h('small', null, it.suggestion.unit)),
                        h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onclick: () => { it.status = 'custom'; draw(); } }, t('keepNew'))
                    );
                }
                if (it.status === 'custom') {
                    const sel = h('select', { class: 'select sm', 'aria-label': t('context') },
                        h('option', { value: '' }, t('pickContext')),
                        CONTEXTS.map(c => h('option', { value: c.id, selected: it.context === c.id }, c.id))
                    );
                    sel.addEventListener('change', () => { it.context = sel.value || null; draw(); });
                    actionsCell.push(sel);
                }
                table.appendChild(h('li', { class: `import-row is-${it.status}${it.include ? '' : ' is-off'}` },
                    toggle,
                    h('div', { class: 'row-main' },
                        h('div', { class: 'row-title' }, h('span', { class: 'row-name' }, it.name)),
                        h('div', { class: 'row-meta' }, h('span', { class: 'unit-tag' }, it.unit || '—'), h('span', { class: `status-dot s-${it.status}` }, t(it.status === 'custom' ? 'newItem' : it.status)))
                    ),
                    h('div', { class: 'import-actions' }, actionsCell),
                    h('span', { class: 'import-qty' }, it.qty.toLocaleString('en'))
                ));
            });
            const n = items.filter(i => i.include && i.status !== 'suggested').length;
            addBtn.textContent = t('importAdd', n);
            addBtn.disabled = n === 0;
        }

        clear(body).append(h('p', { class: 'sheet-text' }, h('strong', null, result.file)), stats, table);
        const foot = sheet.dialog.querySelector('.sheet-foot') || h('footer', { class: 'sheet-foot' });
        const back = h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => sheet.close() }, t('cancel'));
        clear(foot).append(back, addBtn);
        if (!foot.parentNode) sheet.dialog.appendChild(foot);
        sheet.dialog.querySelector('.sheet-title').textContent = t('importReview');

        addBtn.addEventListener('click', () => {
            const chosen = items.filter(i => i.include && i.status !== 'suggested');
            const lines = chosen.map(i => makeLine({ name: i.name, unit: i.unit, qty: i.qty, context: i.context, custom: i.status === 'custom' }));
            store.dispatch({ type: 'LINES_ADD_MANY', payload: { lines } });
            actions.notify(t('imported', t('lines', lines.length)), 'success');
            sheet.close();
        });
        draw();
    }

    function stat(name, n, tone) {
        return h('div', { class: `stat stat-${tone}` }, h('strong', null, String(n)), h('span', null, name));
    }
}

export function openArchive({ store, actions }) {
    const body = h('div', { class: 'archive-body' });
    const sheet = openSheet({ title: t('archive'), size: 'md', body });

    function draw() {
        const list = store.getState().archive;
        clear(body);
        if (!list.length) { body.appendChild(h('p', { class: 'empty-small' }, icon('archive', 22), t('archiveEmpty'))); return; }
        const fmt = new Intl.DateTimeFormat(getLang() === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
        const ol = h('ol', { class: 'archive-list' });
        for (const entry of list) {
            const info = metaInfo(entry.doc.meta);
            const tt = totals(entry.doc.lines);
            ol.appendChild(h('li', { class: 'archive-row' },
                h('div', { class: 'archive-avatar' }, info.pharmacy ? info.pharmacy.id : '—'),
                h('div', { class: 'row-main' },
                    h('div', { class: 'row-title' }, h('span', { class: 'row-name', dir: 'rtl' }, info.pharmacy ? info.pharmacy.name : t('notSet'))),
                    h('div', { class: 'row-meta' },
                        h('span', { class: 'unit-tag' }, `${info.month ? label(info.month) : '—'} ${entry.doc.meta.year}`),
                        h('span', { class: 'muted small' }, `${t('lines', tt.count)} · ${t('units', tt.units)}`),
                        h('span', { class: 'muted small' }, fmt.format(entry.finishedAt))
                    )
                ),
                h('div', { class: 'archive-actions' },
                    h('button', { class: 'btn btn-sm btn-tonal', type: 'button', onclick: async () => {
                        const ok = !store.getState().doc.lines.length || await confirmSheet({ title: t('openTitle'), body: t('openBody'), confirmLabel: t('open') });
                        if (!ok) return;
                        actions.openArchived(entry);
                        sheet.close();
                    } }, t('open')),
                    h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': t('delete'), title: t('delete'), onclick: () => {
                        store.dispatch({ type: 'ARCHIVE_REMOVE', payload: { id: entry.id } });
                        draw();
                    } }, icon('trash', 16))
                )
            ));
        }
        body.appendChild(ol);
    }
    draw();
}

export function openFinish({ store, actions }) {
    return new Promise(resolve => {
        let format = store.getState().prefs.lastFormat || 'xlsx';
        const seg = h('div', { class: 'format-choice', role: 'radiogroup' });
        function drawSeg() {
            clear(seg).append(
                ...[['xlsx', 'sheet', t('exportXlsx'), t('exportXlsxHint')], ['csv', 'file', t('exportCsv'), t('exportCsvHint')]].map(([id, ic, name, sub]) =>
                    h('button', { class: 'format-card' + (format === id ? ' is-active' : ''), type: 'button', role: 'radio', 'aria-checked': String(format === id), onclick: () => { format = id; drawSeg(); } },
                        icon(ic, 22), h('strong', null, name), h('small', null, sub))
                )
            );
        }
        drawSeg();
        const s = store.getState();
        const info = metaInfo(s.doc.meta);
        const tt = totals(s.doc.lines);
        let done = false;
        const ok = h('button', { class: 'btn btn-primary', type: 'button' }, icon('check', 18), t('finishConfirm'));
        const cancel = h('button', { class: 'btn btn-quiet', type: 'button' }, t('cancel'));
        const sheet = openSheet({
            title: t('finishTitle'), size: 'sm',
            body: h('div', { class: 'finish-body' },
                h('div', { class: 'finish-summary' },
                    h('strong', { dir: 'rtl' }, info.pharmacy?.name || ''),
                    h('span', null, `${info.month ? label(info.month) : ''} ${s.doc.meta.year} · ${t('lines', tt.count)} · ${t('units', tt.units)}`)
                ),
                h('p', { class: 'sheet-text' }, t('finishBody')),
                h('span', { class: 'field-label' }, t('finishExport')),
                seg
            ),
            footer: [cancel, ok],
            onClose: () => resolve(done ? format : null)
        });
        ok.addEventListener('click', () => { done = true; sheet.close(); });
        cancel.addEventListener('click', () => sheet.close());
        requestAnimationFrame(() => ok.focus());
    });
}
