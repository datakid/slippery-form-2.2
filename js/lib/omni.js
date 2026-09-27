import { toLatinDigits } from './text.js';
import { CONTEXTS, PHARMACY_BY_ID } from '../data/catalog.js';

const QTY_TAIL = /\s*(?:[*×x=]|,)\s*(\d{1,7})\s*$/i;
const ADJUST = /^([+-])\s*(\d{1,7})$/;
const PHARMACY_ID = /^([abc])(\d{2,3})$/i;

export function resolveContext(token) {
    if (!token) return null;
    const t = String(token).trim().toLowerCase();
    const n = parseInt(t, 10);
    if (!isNaN(n) && n >= 1 && n <= CONTEXTS.length) return CONTEXTS[n - 1].id;
    const byKey = CONTEXTS.find(c => c.key === t);
    if (byKey) return byKey.id;
    const byPrefix = CONTEXTS.find(c => c.id.startsWith(token) || c.en.toLowerCase().startsWith(t));
    return byPrefix ? byPrefix.id : null;
}

export function parseOmni(raw) {
    const original = String(raw ?? '');
    let s = toLatinDigits(original).trim();
    if (!s) return { kind: 'empty' };

    const adj = s.match(ADJUST);
    if (adj) return { kind: 'adjust', delta: (adj[1] === '-' ? -1 : 1) * parseInt(adj[2], 10) };

    const pid = s.match(PHARMACY_ID);
    if (pid && PHARMACY_BY_ID.has(s.toLowerCase())) {
        return { kind: 'pharmacy', pharmacy: PHARMACY_BY_ID.get(s.toLowerCase()) };
    }

    if (s.startsWith('/')) return { kind: 'command', query: s.slice(1).trim().toLowerCase() };

    const forceExt = s.startsWith('!');
    if (forceExt) s = s.slice(1).trim();

    let qty = null;
    const q = s.match(QTY_TAIL);
    if (q) {
        qty = parseInt(q[1], 10);
        s = s.slice(0, q.index).trim();
    }

    let context = null;
    let contextToken = null;
    const c = s.match(/(?:^|\s)#(\S+)/);
    if (c) {
        contextToken = c[1];
        context = resolveContext(c[1]);
        s = (s.slice(0, c.index) + ' ' + s.slice(c.index + c[0].length)).replace(/\s{2,}/g, ' ').trim();
    }

    let unit = null;
    const u = s.match(/(?:^|\s)@(\S+(?:\s+[A-Za-z]+)?)/);
    if (u) {
        unit = u[1].trim();
        s = (s.slice(0, u.index) + ' ' + s.slice(u.index + u[0].length)).replace(/\s{2,}/g, ' ').trim();
    }

    return { kind: 'line', forceExt, name: s, unit, qty, context, contextToken };
}
