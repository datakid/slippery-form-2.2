const VERSION = 'v1';
const SHELL_CACHE = `tally-shell-${VERSION}`;
const FONT_CACHE = `tally-fonts-${VERSION}`;
const NETWORK_TIMEOUT = 4000;
const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

const SHELL = [
    './',
    'index.html',
    'manifest.webmanifest',
    'favicon.svg',
    'css/app.css',
    'css/print.css',
    'css/tokens.css',
    'images/apple-touch-icon.png',
    'images/icon-192.png',
    'images/icon-512.png',
    'images/icon-maskable-512.png',
    'js/main.js',
    'js/i18n.js',
    'js/core/selectors.js',
    'js/core/state.js',
    'js/core/storage.js',
    'js/core/store.js',
    'js/data/catalog.js',
    'js/lib/dom.js',
    'js/lib/omni.js',
    'js/lib/search.js',
    'js/lib/text.js',
    'js/services/exporter.js',
    'js/services/importer.js',
    'js/services/offline.js',
    'js/services/xlsx-loader.js',
    'js/ui/catalog-view.js',
    'js/ui/composer.js',
    'js/ui/dialogs.js',
    'js/ui/ledger.js',
    'js/ui/overlay.js',
    'js/ui/print.js',
    'js/ui/setup.js',
    'js/vendor/xlsx.full.min.js'
];

function keyOf(url) {
    const clean = new URL(url.href);
    clean.search = '';
    clean.hash = '';
    return clean.href;
}

const SHELL_KEYS = new Set(SHELL.map(path => keyOf(new URL(path, self.location.href))));

function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), ms);
        promise.then(
            value => { clearTimeout(timer); resolve(value); },
            error => { clearTimeout(timer); reject(error); }
        );
    });
}

async function shellResponse(event, key) {
    const cache = await caches.open(SHELL_CACHE);
    const network = fetch(event.request, { cache: 'no-cache' }).then(res => {
        if (res.ok && !res.redirected) cache.put(key, res.clone());
        return res;
    });
    event.waitUntil(network.catch(() => {}));
    let res = null;
    try { res = await withTimeout(network, NETWORK_TIMEOUT); } catch {}
    if (res && res.ok) return res;
    const hit = await cache.match(key);
    return hit || res || network;
}

async function fontResponse(event) {
    const cache = await caches.open(FONT_CACHE);
    const hit = await cache.match(event.request);
    const network = fetch(event.request).then(res => {
        if (res.ok || res.type === 'opaque') cache.put(event.request, res.clone());
        return res;
    });
    event.waitUntil(network.catch(() => {}));
    return hit || network;
}

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then(cache => cache.addAll(SHELL.map(path => new Request(path, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names
                    .filter(name => name.startsWith('tally-') && name !== SHELL_CACHE && name !== FONT_CACHE)
                    .map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
    const url = new URL(req.url);
    if (url.origin === self.location.origin) {
        const key = keyOf(url);
        if (SHELL_KEYS.has(key)) event.respondWith(shellResponse(event, key));
        return;
    }
    if (FONT_HOSTS.has(url.hostname)) event.respondWith(fontResponse(event));
});
