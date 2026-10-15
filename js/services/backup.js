import { SCHEMA_VERSION } from '../core/state.js';
import { sanitizeDoc, sanitizePrefs, sanitizeArchive, sanitizeUsage } from '../core/storage.js';
import { download } from './exporter.js';

export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

function withoutDevicePrefs(prefs) {
    const { lastBackup, ...rest } = prefs;
    return rest;
}

export function backupFilename(date = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `tally-backup_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

export function buildBackup(state, now = Date.now()) {
    return {
        app: 'tally',
        kind: 'backup',
        v: SCHEMA_VERSION,
        exportedAt: new Date(now).toISOString(),
        doc: state.doc,
        prefs: withoutDevicePrefs(state.prefs),
        archive: state.archive,
        usage: state.usage
    };
}

export function downloadBackup(state) {
    const name = backupFilename();
    download(new Blob([JSON.stringify(buildBackup(state), null, 2)], { type: 'application/json' }), name);
    return name;
}

export function parseBackup(text) {
    let raw;
    try { raw = JSON.parse(text); } catch { return { error: 'format' }; }
    if (!raw || typeof raw !== 'object' || raw.app !== 'tally' || raw.kind !== 'backup') return { error: 'format' };
    if (!Number.isInteger(raw.v)) return { error: 'format' };
    if (raw.v > SCHEMA_VERSION) return { error: 'newer' };
    const doc = sanitizeDoc(raw.doc);
    if (!doc) return { error: 'format' };
    return {
        data: {
            doc,
            prefs: raw.prefs && typeof raw.prefs === 'object' ? withoutDevicePrefs(sanitizePrefs(raw.prefs)) : null,
            archive: sanitizeArchive(raw.archive),
            usage: sanitizeUsage(raw.usage),
            exportedAt: Date.parse(raw.exportedAt) || null
        }
    };
}

export async function storageStatus() {
    const api = navigator.storage;
    if (!api || !api.persisted) return { supported: false, persisted: false };
    const persisted = await api.persisted().catch(() => false);
    return { supported: true, persisted };
}

export async function requestPersistence() {
    const api = navigator.storage;
    if (!api || !api.persist) return false;
    try { return await api.persist(); } catch { return false; }
}
