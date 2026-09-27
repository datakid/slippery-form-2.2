import { SCHEMA_VERSION, emptyDoc, emptyMeta, makeLine } from './state.js';
import { PHARMACIES, MONTHS, PRODUCT_ALIASES, PRODUCT_MAP, productKey, CONTEXTS } from '../data/catalog.js';

const KEY = 'tally:v1';

function safeParse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function load() {
    const saved = safeParse(localStorage.getItem(KEY));
    if (saved && saved.v === SCHEMA_VERSION) return { data: saved, migrated: null };
    const migrated = migrateLegacy();
    return { data: migrated, migrated: migrated ? migrated.source : null };
}

export function persist(state) {
    const payload = {
        v: SCHEMA_VERSION,
        savedAt: Date.now(),
        doc: state.doc,
        prefs: state.prefs,
        archive: state.archive,
        usage: state.usage
    };
    try {
        localStorage.setItem(KEY, JSON.stringify(payload));
        return { ok: true, savedAt: payload.savedAt };
    } catch (err) {
        console.error('[storage] persist failed', err);
        return { ok: false, error: err };
    }
}

export function storageUsage() {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        bytes += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
    return bytes;
}

export function wipe() {
    localStorage.removeItem(KEY);
}

function resolveLegacyProduct(raw) {
    const aliased = PRODUCT_ALIASES.get(raw);
    const cut = raw.lastIndexOf('|');
    const name = cut === -1 ? raw : raw.slice(0, cut);
    const unit = cut === -1 ? '' : raw.slice(cut + 1);
    if (aliased && PRODUCT_MAP.has(aliased)) {
        const p = PRODUCT_MAP.get(aliased);
        return { name: p.name, unit: p.unit, custom: false };
    }
    const p = PRODUCT_MAP.get(productKey(name, unit));
    if (p) return { name: p.name, unit: p.unit, custom: false };
    return { name: name.trim(), unit: unit.trim(), custom: true };
}

function migrateBayan() {
    const get = k => localStorage.getItem('bayan:v3:' + k) ?? localStorage.getItem(k);
    const rows = safeParse(get('pharmacyData'));
    const pharmacyName = get('selectedPharmacy');
    const cls = get('selectedClass');
    const region = get('selectedRegion');
    const monthName = get('selectedMonth');
    if (!Array.isArray(rows) && !pharmacyName) return null;
    const meta = emptyMeta();
    const ph = PHARMACIES.find(p => p.name === pharmacyName && (!cls || p.cls === cls) && (!region || p.region === region));
    if (ph) meta.pharmacyId = ph.id;
    const m = MONTHS.find(x => x.en === monthName);
    if (m) meta.month = m.n;
    const doc = emptyDoc(meta);
    for (const r of Array.isArray(rows) ? rows : []) {
        if (!r || !r.product) continue;
        const p = resolveLegacyProduct(r.product);
        doc.lines.push(makeLine({ ...p, qty: parseInt(r.unitsSold, 10) || 0, context: CONTEXTS.some(c => c.id === r.category) ? r.category : null }));
    }
    return doc;
}

function migrateFolio() {
    const saved = safeParse(localStorage.getItem('lx_b'));
    if (!saved || !saved.state) return null;
    const s = saved.state;
    const meta = emptyMeta(parseInt(s.year, 10) || new Date().getFullYear());
    const ph = PHARMACIES.find(p => p.name === s.pharmacy && (!s.class || p.cls === s.class));
    if (ph) meta.pharmacyId = ph.id;
    const m = MONTHS.find(x => x.en === s.month || x.ar === s.month);
    if (m) meta.month = m.n;
    const doc = emptyDoc(meta);
    for (const r of Array.isArray(saved.data) ? saved.data : []) {
        if (!r || !r.name) continue;
        const sys = PRODUCT_MAP.get(productKey(r.name, r.unit));
        doc.lines.push(makeLine({
            name: sys ? sys.name : r.name,
            unit: sys ? sys.unit : (r.unit || ''),
            qty: parseInt(r.quantity, 10) || 0,
            context: r.context || null,
            custom: !sys
        }));
    }
    return doc;
}

function migrateLegacy() {
    try {
        const folio = migrateFolio();
        if (folio && folio.lines.length) return { doc: folio, source: 'folio' };
        const bayan = migrateBayan();
        if (bayan && (bayan.lines.length || bayan.meta.pharmacyId)) return { doc: bayan, source: 'bayan' };
    } catch (err) {
        console.warn('[storage] legacy migration failed', err);
    }
    return null;
}

export function readLegacyPrefs() {
    const theme = localStorage.getItem('app-theme') || localStorage.getItem('lx_theme');
    const lang = localStorage.getItem('app-lang');
    return {
        theme: ['light', 'dark', 'system'].includes(theme) ? theme : undefined,
        lang: lang === 'ar' ? 'ar' : undefined
    };
}
