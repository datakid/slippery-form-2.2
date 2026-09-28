import { h, icon, clear } from '../lib/dom.js';
import { t } from '../i18n.js';

let toastHost = null;
const MAX_TOASTS = 3;
const canPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

function topSheet() {
    const open = [...document.querySelectorAll('dialog[open]:not(.is-closing)')];
    return open[open.length - 1] || null;
}

function placeToasts() {
    if (!toastHost) return;
    const parent = topSheet() || document.body;
    if (toastHost.parentNode !== parent) parent.appendChild(toastHost);
    if (!canPopover) return;
    try {
        if (toastHost.matches(':popover-open')) toastHost.hidePopover();
        if (toastHost.children.length) toastHost.showPopover();
    } catch {}
}

export function toast(message, { tone = 'neutral', action, duration = 4200 } = {}) {
    if (!toastHost) {
        toastHost = h('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
        if (canPopover) toastHost.setAttribute('popover', 'manual');
    }
    const el = h('div', { class: `toast toast-${tone}` },
        tone === 'danger' ? icon('alert', 16) : tone === 'success' ? icon('check', 16) : null,
        h('span', { class: 'toast-text' }, message)
    );
    let timer = null;
    const dismiss = () => {
        clearTimeout(timer);
        el.classList.add('is-leaving');
        setTimeout(() => {
            el.remove();
            if (canPopover && toastHost && !toastHost.children.length) { try { toastHost.hidePopover(); } catch {} }
        }, 220);
    };
    if (action) {
        el.appendChild(h('button', {
            class: 'toast-action', type: 'button',
            onclick: () => { action.run(); dismiss(); }
        }, action.label));
    }
    toastHost.appendChild(el);
    while (toastHost.children.length > MAX_TOASTS) toastHost.firstElementChild.remove();
    placeToasts();
    timer = setTimeout(dismiss, duration);
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => { timer = setTimeout(dismiss, 1800); });
    return dismiss;
}

export function openSheet({ title, subtitle, body, footer, size = 'md', onClose, className = '' }) {
    const closeBtn = h('button', { class: 'icon-btn sheet-close', type: 'button', 'aria-label': t('close') }, icon('x', 18));
    const dialog = h('dialog', { class: `sheet sheet-${size} ${className}` },
        h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
        h('header', { class: 'sheet-head' },
            h('div', null,
                h('h2', { class: 'sheet-title' }, title),
                subtitle ? h('p', { class: 'sheet-sub' }, subtitle) : null
            ),
            closeBtn
        ),
        h('div', { class: 'sheet-body' }, body),
        footer ? h('footer', { class: 'sheet-foot' }, footer) : null
    );
    const opener = document.activeElement;
    let closed = false;
    const close = (result) => {
        if (closed) return;
        closed = true;
        dialog.classList.add('is-closing');
        placeToasts();
        setTimeout(() => {
            try { dialog.close(); } catch {}
            dialog.remove();
            placeToasts();
            if (opener && opener.isConnected && !topSheet() && document.activeElement === document.body) {
                try { opener.focus({ preventScroll: true }); } catch {}
            }
            onClose && onClose(result);
        }, 180);
    };
    closeBtn.addEventListener('click', () => close());
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    dialog.addEventListener('mousedown', e => { if (e.target === dialog) close(); });
    document.body.appendChild(dialog);
    dialog.showModal();
    placeToasts();
    return { dialog, close };
}

export function confirmSheet({ title, body, confirmLabel, tone = 'primary' }) {
    return new Promise(resolve => {
        let result = false;
        const ok = h('button', { class: `btn btn-${tone}`, type: 'button' }, confirmLabel || t('confirm'));
        const cancel = h('button', { class: 'btn btn-quiet', type: 'button' }, t('cancel'));
        const sheet = openSheet({
            title, size: 'sm',
            body: h('p', { class: 'sheet-text' }, body),
            footer: [cancel, ok],
            onClose: () => resolve(result)
        });
        ok.addEventListener('click', () => { result = true; sheet.close(); });
        cancel.addEventListener('click', () => sheet.close());
        requestAnimationFrame(() => ok.focus());
    });
}

let activeMenu = null;

export function closeMenu() {
    if (activeMenu) activeMenu.close();
}

export function openMenu(anchor, items, { align = 'end', onClose } = {}) {
    closeMenu();
    const list = h('div', { class: 'menu', role: 'menu' });
    const buttons = [];
    for (const item of items) {
        if (item === '-') { list.appendChild(h('div', { class: 'menu-sep', role: 'separator' })); continue; }
        if (item.heading) { list.appendChild(h('div', { class: 'menu-heading' }, item.heading)); continue; }
        const btn = h('button', {
            class: `menu-item${item.tone ? ' menu-' + item.tone : ''}${item.checked ? ' is-checked' : ''}`,
            type: 'button', role: item.checked != null ? 'menuitemradio' : 'menuitem',
            'aria-checked': item.checked != null ? String(!!item.checked) : null,
            onclick: () => {
                close();
                if (anchor.isConnected) anchor.focus({ preventScroll: true });
                item.run();
            }
        },
            item.icon ? icon(item.icon, 17) : h('span', { class: 'menu-icon-gap' }),
            h('span', { class: 'menu-label' },
                h('span', null, item.label),
                item.hint ? h('small', null, item.hint) : null
            ),
            item.checked ? icon('check', 16) : item.kbd ? h('kbd', null, item.kbd) : null
        );
        btn._kbd = item.kbd && item.kbd.length === 1 ? item.kbd.toLowerCase() : null;
        buttons.push(btn);
        list.appendChild(btn);
    }
    document.body.appendChild(list);
    const r = anchor.getBoundingClientRect();
    const mw = list.offsetWidth;
    const mh = list.offsetHeight;
    const rtl = document.documentElement.dir === 'rtl';
    const endAligned = (align === 'end') !== rtl;
    let left = endAligned ? r.right - mw : r.left;
    left = Math.max(8, Math.min(left, innerWidth - mw - 8));
    let top = r.bottom + 8;
    if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh - 8);
    list.style.left = left + 'px';
    list.style.top = top + 'px';
    anchor.setAttribute('aria-expanded', 'true');

    const onKey = e => {
        const i = buttons.indexOf(document.activeElement);
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); anchor.focus(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length]?.focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length]?.focus(); }
        else if (e.key === 'Home') { e.preventDefault(); buttons[0]?.focus(); }
        else if (e.key === 'End') { e.preventDefault(); buttons[buttons.length - 1]?.focus(); }
        else if (e.key === 'Tab') close();
        else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const hit = buttons.find(b => b._kbd === e.key.toLowerCase());
            if (hit) { e.preventDefault(); e.stopPropagation(); hit.click(); }
        }
    };
    const onDown = e => { if (!list.contains(e.target) && !anchor.contains(e.target)) close(); };
    function close() {
        if (activeMenu !== api) return;
        activeMenu = null;
        anchor.setAttribute('aria-expanded', 'false');
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerdown', onDown, true);
        window.removeEventListener('resize', close);
        list.classList.add('is-leaving');
        setTimeout(() => list.remove(), 140);
        onClose && onClose();
    }
    const api = { close, el: list };
    activeMenu = api;
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('resize', close);
    requestAnimationFrame(() => (buttons.find(b => b.classList.contains('is-checked')) || buttons[0])?.focus());
    return api;
}

export { clear };
