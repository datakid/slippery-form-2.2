import { uid } from '../lib/text.js';
import { PRODUCT_MAP, PHARMACY_BY_ID, productKey } from '../data/catalog.js';
import { normalize } from '../lib/text.js';

export const SCHEMA_VERSION = 1;

export function emptyMeta(year = new Date().getFullYear()) {
    return { year, month: null, pharmacyId: null };
}

export function emptyDoc(meta) {
    return { id: uid(), meta: meta || emptyMeta(), lines: [], createdAt: Date.now() };
}

export function initialState() {
    return {
        doc: emptyDoc(),
        prefs: { theme: 'system', lang: 'en', mergeMode: 'add', sort: 'recent' },
        ui: { view: 'ledger', filter: '', lastLineId: null, onlyNeedsContext: false },
        archive: [],
        usage: {}
    };
}

export function lineKey(line) {
    if (!line.custom) return 'p:' + productKey(line.name, line.unit);
    return 'c:' + normalize(line.name) + '|' + normalize(line.unit) + '|' + (line.context || '');
}

export function makeLine({ name, unit, qty, context = null, custom }) {
    const isCustom = custom ?? !PRODUCT_MAP.has(productKey(name, unit));
    const now = Date.now();
    return {
        id: uid(),
        name: String(name).trim(),
        unit: String(unit || '').trim(),
        qty: Math.max(0, Math.floor(Number(qty) || 0)),
        context: isCustom ? (context || null) : null,
        custom: isCustom,
        addedAt: now,
        updatedAt: now
    };
}

function withDoc(state, patch) {
    return { ...state, doc: { ...state.doc, ...patch, updatedAt: Date.now() } };
}

function mergeInto(lines, incoming, mode) {
    const key = lineKey(incoming);
    const idx = lines.findIndex(l => lineKey(l) === key);
    if (idx === -1) return { lines: [...lines, incoming], id: incoming.id, merged: null };
    const prev = lines[idx];
    const qty = mode === 'replace' ? incoming.qty : prev.qty + incoming.qty;
    const next = { ...prev, qty, updatedAt: Date.now() };
    const out = lines.slice();
    out[idx] = next;
    return { lines: out, id: prev.id, merged: { from: prev.qty, to: qty } };
}

export function reducer(state, action) {
    const { type, payload = {} } = action;
    switch (type) {
        case 'META_SET': {
            const meta = { ...state.doc.meta, ...payload };
            if (meta.pharmacyId && !PHARMACY_BY_ID.has(meta.pharmacyId)) meta.pharmacyId = null;
            if (JSON.stringify(meta) === JSON.stringify(state.doc.meta)) return state;
            return withDoc(state, { meta });
        }
        case 'LINE_ADD': {
            const line = payload.line;
            if (!line || !line.name) return state;
            const mode = payload.mode || state.prefs.mergeMode;
            const res = mergeInto(state.doc.lines, line, mode);
            action.result = { id: res.id, merged: res.merged };
            return { ...withDoc(state, { lines: res.lines }), ui: { ...state.ui, lastLineId: res.id } };
        }
        case 'LINES_ADD_MANY': {
            let lines = state.doc.lines;
            for (const line of payload.lines || []) lines = mergeInto(lines, line, 'add').lines;
            if (lines === state.doc.lines) return state;
            return withDoc(state, { lines });
        }
        case 'LINE_UPDATE': {
            const idx = state.doc.lines.findIndex(l => l.id === payload.id);
            if (idx === -1) return state;
            const prev = state.doc.lines[idx];
            const patch = { ...payload.patch };
            if ('qty' in patch) patch.qty = Math.max(0, Math.floor(Number(patch.qty) || 0));
            const next = { ...prev, ...patch, updatedAt: Date.now() };
            if (Object.keys(patch).every(k => prev[k] === next[k])) return state;
            const lines = state.doc.lines.slice();
            lines[idx] = next;
            return { ...withDoc(state, { lines }), ui: { ...state.ui, lastLineId: next.id } };
        }
        case 'LINES_UPDATE': {
            const ids = new Set(payload.ids);
            let changed = false;
            const lines = state.doc.lines.map(l => {
                if (!ids.has(l.id)) return l;
                const patch = typeof payload.patch === 'function' ? payload.patch(l) : payload.patch;
                changed = true;
                return { ...l, ...patch, updatedAt: Date.now() };
            });
            return changed ? withDoc(state, { lines }) : state;
        }
        case 'LINE_REMOVE': {
            const ids = new Set(Array.isArray(payload.ids) ? payload.ids : [payload.id]);
            const lines = state.doc.lines.filter(l => !ids.has(l.id));
            if (lines.length === state.doc.lines.length) return state;
            const ui = ids.has(state.ui.lastLineId) ? { ...state.ui, lastLineId: null } : state.ui;
            return { ...withDoc(state, { lines }), ui };
        }
        case 'DOC_CLEAR':
            if (!state.doc.lines.length) return state;
            return withDoc(state, { lines: [] });
        case 'DOC_REPLACE':
            return { ...state, doc: payload.doc, ui: { ...state.ui, lastLineId: null, filter: '' } };
        case 'PREFS_SET':
            return { ...state, prefs: { ...state.prefs, ...payload } };
        case 'UI_SET':
            return { ...state, ui: { ...state.ui, ...payload } };
        case 'ARCHIVE_ADD': {
            const archive = [payload.entry, ...state.archive.filter(a => a.id !== payload.entry.id)].slice(0, 36);
            return { ...state, archive };
        }
        case 'USAGE_BUMP': {
            const scope = payload.scope || '_';
            const bucket = { ...(state.usage[scope] || {}) };
            bucket[payload.key] = (bucket[payload.key] || 0) + 1;
            return { ...state, usage: { ...state.usage, [scope]: bucket } };
        }
        case 'ARCHIVE_REMOVE':
            return { ...state, archive: state.archive.filter(a => a.id !== payload.id) };
        default:
            console.warn('[reducer] unknown action', type);
            return state;
    }
}
