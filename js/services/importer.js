import { loadXLSX } from './xlsx-loader.js';
import { findProduct, PRODUCTS, CONTEXTS } from '../data/catalog.js';
import { createIndex, search } from '../lib/search.js';
import { parseQty, normalize } from '../lib/text.js';
import { resolveContext } from '../lib/omni.js';

const HEADER_ALIASES = {
    name: ['name', 'product', 'productname', 'item', 'drug', 'medicine', 'الصنف', 'الاسم', 'اسمالصنف'],
    unit: ['unit', 'pack', 'package', 'العبوة', 'عبوة', 'الوحدة'],
    qty: ['qty', 'quantity', 'unitsold', 'unitssold', 'units', 'count', 'الكمية', 'الكميةالمنصرفة', 'كمية'],
    context: ['context', 'category', 'السياق', 'التصنيف']
};

let index = null;
function productIndex() {
    if (!index) index = createIndex(PRODUCTS, p => `${p.name} ${p.unit}`);
    return index;
}

function headerKey(h) {
    const k = normalize(h).replace(/[^a-z0-9\u0600-\u06FF]/g, '');
    for (const [field, list] of Object.entries(HEADER_ALIASES)) {
        if (list.some(a => normalize(a).replace(/\s/g, '') === k)) return field;
    }
    return null;
}

export function parseCSVText(text) {
    const src = text.replace(/^\uFEFF/, '');
    const first = src.split(/\r\n|\r|\n/).find(l => l.trim()) || '';
    const delim = [',', ';', '\t'].reduce((best, d) => first.split(d).length > first.split(best).length ? d : best, ',');
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (quoted) {
            if (c === '"') {
                if (src[i + 1] === '"') { field += '"'; i++; }
                else quoted = false;
            } else field += c;
            continue;
        }
        if (c === '"' && field === '') quoted = true;
        else if (c === delim) { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && src[i + 1] === '\n') i++;
            row.push(field); rows.push(row); row = []; field = '';
        } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(cell => String(cell).trim() !== ''));
}

async function readMatrix(file) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.csv') || lower.endsWith('.txt') || file.type === 'text/csv') {
        return parseCSVText(await file.text());
    }
    if (/\.(xlsx|xls|xlsm|ods)$/.test(lower)) {
        const XLSX = await loadXLSX();
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const preferred = wb.SheetNames.find(n => n.toLowerCase() === 'data') || wb.SheetNames[0];
        const sheet = wb.Sheets[preferred];
        return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
            .filter(r => r.some(cell => String(cell).trim() !== ''));
    }
    throw new Error('Unsupported file type: ' + file.name);
}

function locateHeader(matrix) {
    for (let r = 0; r < Math.min(matrix.length, 12); r++) {
        const map = {};
        matrix[r].forEach((cell, c) => {
            const k = headerKey(String(cell));
            if (k && !(k in map)) map[k] = c;
        });
        if ('name' in map && 'qty' in map) return { row: r, map };
    }
    return null;
}

function stripContextSuffix(name) {
    for (const c of CONTEXTS) {
        const suffix = `(${c.id})`;
        if (name.endsWith(suffix)) return { name: name.slice(0, -suffix.length).trim(), context: c.id };
    }
    return { name, context: null };
}

export async function analyzeFile(file) {
    const matrix = await readMatrix(file);
    const header = locateHeader(matrix);
    if (!header) return { file: file.name, error: 'headers', items: [], skipped: [] };
    const { map } = header;
    const merged = new Map();
    const skipped = [];

    for (let r = header.row + 1; r < matrix.length; r++) {
        const cells = matrix[r];
        let rawName = String(cells[map.name] ?? '').trim();
        const unit = map.unit != null ? String(cells[map.unit] ?? '').trim() : '';
        const qty = parseQty(String(cells[map.qty] ?? '').replace(/[.,]0+$/, ''));
        let context = map.context != null ? resolveContext(String(cells[map.context] ?? '').trim()) : null;
        if (!rawName) { skipped.push({ row: r + 1, reason: 'name' }); continue; }
        if (/^(total|الاجمالي|الإجمالي)$/i.test(rawName)) continue;
        if (qty == null) { skipped.push({ row: r + 1, reason: 'qty', name: rawName }); continue; }

        let product = findProduct(rawName, unit);
        if (!product) {
            const stripped = stripContextSuffix(rawName);
            if (stripped.context) {
                rawName = stripped.name;
                context = context || stripped.context;
                product = findProduct(rawName, unit);
            }
        }

        let item;
        if (product) {
            item = { status: 'matched', name: product.name, unit: product.unit, qty, context: null, custom: false };
        } else {
            const hit = search(productIndex(), `${rawName} ${unit}`, { limit: 1 })[0];
            const suggestion = hit && hit.score >= 70 ? hit.item : null;
            item = {
                status: suggestion ? 'suggested' : 'custom',
                name: rawName, unit, qty, context, custom: true,
                suggestion: suggestion ? { name: suggestion.name, unit: suggestion.unit } : null
            };
        }
        const key = `${item.status}|${normalize(item.name)}|${normalize(item.unit)}|${item.context || ''}`;
        if (merged.has(key)) merged.get(key).qty += qty;
        else merged.set(key, item);
    }
    return { file: file.name, items: [...merged.values()], skipped };
}
