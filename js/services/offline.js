export function registerOffline({ onReady, onUpdate } = {}) {
    if (!('serviceWorker' in navigator) || !document.querySelector('link[rel="manifest"]')) return;
    const hadController = Boolean(navigator.serviceWorker.controller);

    function watch(worker) {
        if (!worker || !onReady) return;
        worker.addEventListener('statechange', () => { if (worker.state === 'activated') onReady(); });
    }

    if (hadController && onUpdate) {
        navigator.serviceWorker.addEventListener('controllerchange', () => onUpdate(), { once: true });
    }

    function start() {
        navigator.serviceWorker.register('sw.js')
            .then(reg => { if (!hadController) watch(reg.installing); })
            .catch(err => console.warn('[offline] registration failed', err));
    }

    if (document.readyState === 'complete') start();
    else addEventListener('load', start, { once: true });
}
