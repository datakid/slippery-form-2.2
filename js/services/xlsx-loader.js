let pending = null;

export function loadXLSX() {
    if (globalThis.XLSX) return Promise.resolve(globalThis.XLSX);
    if (pending) return pending;
    pending = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/vendor/xlsx.full.min.js';
        s.async = true;
        s.onload = () => globalThis.XLSX ? resolve(globalThis.XLSX) : reject(new Error('XLSX global missing after load'));
        s.onerror = () => { pending = null; reject(new Error('Failed to load xlsx library')); };
        document.head.appendChild(s);
    });
    return pending;
}
