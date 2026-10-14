export function registerOffline({ onReady } = {}) {
    if (!('serviceWorker' in navigator) || !document.querySelector('link[rel="manifest"]')) return;

    function watch(worker) {
        if (!worker || !onReady) return;
        worker.addEventListener('statechange', () => { if (worker.state === 'activated') onReady(); });
    }

    function start() {
        const firstVisit = !navigator.serviceWorker.controller;
        navigator.serviceWorker.register('sw.js')
            .then(reg => { if (firstVisit) watch(reg.installing); })
            .catch(err => console.warn('[offline] registration failed', err));
    }

    if (document.readyState === 'complete') start();
    else addEventListener('load', start, { once: true });
}
