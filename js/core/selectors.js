import { PHARMACY_BY_ID, classById, regionById, monthByNumber } from '../data/catalog.js';
import { normalize } from '../lib/text.js';

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export function metaInfo(meta) {
    const pharmacy = meta.pharmacyId ? PHARMACY_BY_ID.get(meta.pharmacyId) : null;
    return {
        pharmacy,
        cls: pharmacy ? classById(pharmacy.cls) : null,
        region: pharmacy ? regionById(pharmacy.region) : null,
        month: meta.month ? monthByNumber(meta.month) : null,
        year: meta.year,
        complete: Boolean(pharmacy && meta.month && meta.year)
    };
}

export function totals(lines) {
    let units = 0;
    let custom = 0;
    let needsContext = 0;
    let zero = 0;
    for (const l of lines) {
        units += l.qty;
        if (l.custom) {
            custom++;
            if (!l.context) needsContext++;
        }
        if (!(l.qty > 0)) zero++;
    }
    return { count: lines.length, units, custom, needsContext, zero };
}

export function visibleLines(state) {
    const { lines } = state.doc;
    const { filter, onlyNeedsContext } = state.ui;
    const q = normalize(filter);
    let out = lines;
    if (onlyNeedsContext && lines.some(l => l.custom && !l.context)) out = out.filter(l => l.custom && !l.context);
    if (q) out = out.filter(l => normalize(`${l.name} ${l.unit} ${l.context || ''}`).includes(q));
    const sort = state.prefs.sort;
    const copy = out.slice();
    if (sort === 'name') copy.sort((a, b) => collator.compare(a.name, b.name));
    else if (sort === 'qty') copy.sort((a, b) => b.qty - a.qty);
    else copy.sort((a, b) => b.addedAt - a.addedAt);
    return copy;
}

export function issues(state) {
    const info = metaInfo(state.doc.meta);
    const t = totals(state.doc.lines);
    const list = [];
    if (!info.pharmacy) list.push('pharmacy');
    if (!info.month) list.push('month');
    if (!t.count) list.push('empty');
    if (t.needsContext) list.push('context');
    if (t.zero) list.push('zero');
    return list;
}

export function printableLines(lines) {
    return lines.slice().sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.unit, b.unit));
}
