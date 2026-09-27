import { h, clear } from '../lib/dom.js';
import { metaInfo, totals, printableLines } from '../core/selectors.js';

export function createPrintSheet() {
    const root = h('section', { class: 'print-sheet', id: 'print-sheet', dir: 'rtl', lang: 'ar', 'aria-hidden': 'true' });

    function build(doc) {
        const info = metaInfo(doc.meta);
        const tt = totals(doc.lines);
        const lines = printableLines(doc.lines);
        const dateFmt = new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        clear(root).append(
            h('header', { class: 'print-head' },
                h('p', null, 'مرسل الي ادارة التموين الطبي والصيدليات'),
                h('p', null, `فرع البحيرة الموازنة ${info.cls?.ar || ''} المنطقة ${info.region?.ar || ''}`),
                h('p', null, `صيدلية ${info.pharmacy?.name || ''}`),
                h('p', null, `بيان الخارجي عن شهر ${info.month?.ar || ''} ${doc.meta.year || ''}`)
            ),
            h('table', { class: 'print-table' },
                h('thead', null, h('tr', null,
                    h('th', { class: 'c-n' }, 'م'),
                    h('th', null, 'الصنف'),
                    h('th', { class: 'c-u' }, 'العبوة'),
                    h('th', { class: 'c-q' }, 'الكمية المنصرفة')
                )),
                h('tbody', null, lines.map((l, i) => h('tr', null,
                    h('td', { class: 'c-n' }, String(i + 1)),
                    h('td', { dir: 'ltr', class: 'c-name' }, l.custom && l.context && l.context !== 'داخل اللستة' ? `${l.name} (${l.context})` : l.name),
                    h('td', { dir: 'ltr', class: 'c-u' }, l.unit),
                    h('td', { class: 'c-q' }, String(l.qty))
                ))),
                h('tfoot', null, h('tr', null,
                    h('td', { colspan: '3' }, `الإجمالي — ${tt.count} صنف`),
                    h('td', { class: 'c-q' }, tt.units.toLocaleString('en'))
                ))
            ),
            h('footer', { class: 'print-foot' },
                h('p', null, `تاريخ الطباعة: ${dateFmt.format(new Date())}`),
                h('div', { class: 'print-sign' }, h('span', null, 'التوقيع: ______________________'), h('span', null, 'الختم'))
            )
        );
    }

    return {
        el: root,
        print(doc) {
            build(doc);
            window.print();
        },
        build
    };
}
