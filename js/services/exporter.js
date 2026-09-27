import { metaInfo, totals, printableLines } from '../core/selectors.js';
import { loadXLSX } from './xlsx-loader.js';

export const EXPORT_COLUMNS = ['year', 'month', 'class', 'region', 'pharmacyId', 'pharmacy', 'name', 'unit', 'unitSold', 'method', 'category'];

export function toRows(doc) {
    const info = metaInfo(doc.meta);
    return printableLines(doc.lines).map(l => ({
        year: doc.meta.year ?? '',
        month: info.month ? info.month.en : '',
        class: info.pharmacy ? info.pharmacy.cls : '',
        region: info.pharmacy ? info.pharmacy.region : '',
        pharmacyId: info.pharmacy ? info.pharmacy.id : '',
        pharmacy: info.pharmacy ? info.pharmacy.name : '',
        name: l.name,
        unit: l.unit,
        unitSold: l.qty,
        method: l.custom ? 'new' : 'old',
        category: l.context || ''
    }));
}

export function fileBase(doc) {
    const info = metaInfo(doc.meta);
    const parts = ['tally', info.pharmacy ? info.pharmacy.id : 'draft'];
    if (doc.meta.year) parts.push(String(doc.meta.year));
    if (info.month) parts.push(String(info.month.n).padStart(2, '0'));
    return parts.join('_');
}

function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(doc) {
    const rows = toRows(doc);
    const out = [EXPORT_COLUMNS.join(',')];
    for (const r of rows) out.push(EXPORT_COLUMNS.map(c => csvCell(r[c])).join(','));
    return '\uFEFF' + out.join('\r\n') + '\r\n';
}

export function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportCSV(doc) {
    const name = fileBase(doc) + '.csv';
    download(new Blob([toCSV(doc)], { type: 'text/csv;charset=utf-8' }), name);
    return name;
}

export async function exportXLSX(doc) {
    const XLSX = await loadXLSX();
    const info = metaInfo(doc.meta);
    const rows = toRows(doc);
    const tt = totals(doc.lines);

    const header = ['Product', 'Unit', 'Units sold', 'Type', 'Context'];
    const body = rows.map(r => [r.name, r.unit, r.unitSold, r.method === 'new' ? 'New item' : 'Listed', r.category]);
    const reportAoa = [
        ['مرسل الي ادارة التموين الطبي والصيدليات'],
        [`فرع البحيرة — الموازنة ${info.cls ? info.cls.ar : ''} — المنطقة ${info.region ? info.region.ar : ''}`],
        [`صيدلية ${info.pharmacy ? info.pharmacy.name : ''}`],
        [`بيان الخارجي عن شهر ${info.month ? info.month.ar : ''} ${doc.meta.year || ''}`],
        [],
        header,
        ...body,
        [],
        ['Total', `${tt.count} items`, tt.units, '', '']
    ];
    const report = XLSX.utils.aoa_to_sheet(reportAoa);
    report['!cols'] = [{ wch: 48 }, { wch: 12 }, { wch: 12 }, { wch: 11 }, { wch: 16 }];
    report['!merges'] = [0, 1, 2, 3].map(r => ({ s: { r, c: 0 }, e: { r, c: 4 } }));
    report['!views'] = [{ RTL: false }];

    const data = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS });
    data['!cols'] = EXPORT_COLUMNS.map(c => ({ wch: c === 'name' ? 46 : c === 'pharmacy' ? 22 : 11 }));
    data['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: EXPORT_COLUMNS.length - 1 } }) };

    const wb = XLSX.utils.book_new();
    wb.Props = { Title: 'Tally report', CreatedDate: new Date() };
    XLSX.utils.book_append_sheet(wb, report, 'Report');
    XLSX.utils.book_append_sheet(wb, data, 'Data');
    const name = fileBase(doc) + '.xlsx';
    XLSX.writeFile(wb, name, { compression: true });
    return name;
}
