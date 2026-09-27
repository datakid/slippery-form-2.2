const AR_DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g;
const AR_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

const AR_TO_LATIN_LAYOUT = {
    'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p', 'ج': '[', 'د': ']',
    'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k', 'م': 'l', 'ك': ';', 'ط': "'",
    'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'ى': 'n', 'ة': 'm', 'و': ',', 'ز': '.', 'ظ': '/', 'لا': 'b', 'ذ': '`'
};

export function toLatinDigits(str) {
    return String(str ?? '').replace(AR_DIGITS, d => {
        const code = d.charCodeAt(0);
        return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
    });
}

export function normalize(str) {
    return toLatinDigits(str)
        .toLowerCase()
        .replace(AR_DIACRITICS, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/[()[\]{}"'`،,;:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function tokens(str) {
    return normalize(str).split(' ').filter(Boolean);
}

export function hasArabic(str) {
    return /[\u0600-\u06FF]/.test(String(str || ''));
}

export function remapArabicLayout(str) {
    let out = '';
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        const pair = s.slice(i, i + 2);
        if (pair === 'لا') { out += 'b'; i++; continue; }
        const ch = s[i];
        out += AR_TO_LATIN_LAYOUT[ch] ?? ch;
    }
    return out;
}

export function bigrams(str) {
    const s = str.replace(/\s+/g, '');
    if (s.length < 2) return s ? [s] : [];
    const out = [];
    for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
    return out;
}

export function dice(a, b) {
    const A = bigrams(a);
    const B = bigrams(b);
    if (!A.length || !B.length) return 0;
    const pool = new Map();
    for (const g of B) pool.set(g, (pool.get(g) || 0) + 1);
    let hits = 0;
    for (const g of A) {
        const n = pool.get(g);
        if (n) { hits++; pool.set(g, n - 1); }
    }
    return (2 * hits) / (A.length + B.length);
}

export function parseQty(value) {
    const s = toLatinDigits(String(value ?? '')).trim();
    if (!/^\d{1,7}$/.test(s)) return null;
    return parseInt(s, 10);
}

export function uid() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function debounce(fn, ms) {
    let t = null;
    const wrapped = (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
    wrapped.flush = (...args) => { clearTimeout(t); fn(...args); };
    wrapped.cancel = () => clearTimeout(t);
    return wrapped;
}
