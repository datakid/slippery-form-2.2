import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2'
};

const server = createServer(async (req, res) => {
    try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        let file = normalize(join(root, pathname));
        if (file !== root && !file.startsWith(root + sep)) throw new Error('outside root');
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(body);
    } catch {
        res.writeHead(404);
        res.end();
    }
});

await new Promise(done => server.listen(0, '127.0.0.1', done));
const { port } = server.address();

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failed = true;
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const lines = [];
    const errors = [];
    page.on('console', msg => lines.push(msg.text()));
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`http://127.0.0.1:${port}/tests.html`);
    await page.waitForFunction(() => document.title === 'PASS' || document.title === 'FAIL', null, { timeout: 60000 });
    const title = await page.title();
    for (const line of lines) if (line.startsWith('FAIL') || line.startsWith('SUMMARY')) console.log(line);
    for (const message of errors) console.log(`PAGEERROR ${message}`);
    failed = title !== 'PASS' || errors.length > 0;
} finally {
    await browser.close();
    server.close();
}
process.exit(failed ? 1 : 0);
