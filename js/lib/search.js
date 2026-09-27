import { normalize, tokens, dice, hasArabic, remapArabicLayout } from './text.js';

export function createIndex(items, getText) {
    return items.map(item => {
        const text = normalize(getText(item));
        return { item, text, words: text.split(' '), compact: text.replace(/\s+/g, '') };
    });
}

function scoreEntry(entry, qTokens, qText) {
    let score = 0;
    let matched = 0;
    for (const t of qTokens) {
        let best = 0;
        for (let w = 0; w < entry.words.length; w++) {
            const word = entry.words[w];
            if (word === t) best = Math.max(best, 30 - Math.min(w, 5));
            else if (word.startsWith(t)) best = Math.max(best, 22 - Math.min(w, 5) + Math.min(t.length, 6));
            else if (t.length >= 2 && word.includes(t)) best = Math.max(best, 10 + Math.min(t.length, 4));
        }
        if (!best && t.length >= 3 && entry.compact.includes(t)) best = 8;
        if (best) matched++;
        score += best;
    }
    if (matched === qTokens.length) {
        if (entry.text.startsWith(qText)) score += 25;
        score += 20;
        return score;
    }
    if (qText.length >= 3) {
        const d = dice(qText, entry.text.slice(0, Math.max(qText.length + 6, 12)));
        if (d >= 0.42) return d * 40 + matched * 4;
    }
    return 0;
}

export function search(index, query, { limit = 12, boost } = {}) {
    const qText = normalize(query);
    if (!qText) return [];
    const qTokens = qText.split(' ').filter(Boolean);
    const scored = [];
    for (const entry of index) {
        let s = scoreEntry(entry, qTokens, qText);
        if (s > 0) {
            if (boost) s += boost(entry.item);
            scored.push({ item: entry.item, score: s });
        }
    }
    scored.sort((a, b) => b.score - a.score || a.item.name?.localeCompare?.(b.item.name) || 0);
    return scored.slice(0, limit);
}

export function searchWithLayoutFallback(index, query, opts) {
    const primary = search(index, query, opts);
    if (primary.length || !hasArabic(query)) return { results: primary, remapped: null };
    const remapped = remapArabicLayout(query);
    if (remapped === query) return { results: primary, remapped: null };
    return { results: search(index, remapped, opts), remapped };
}

export function bestMatch(index, query, minScore = 30) {
    const [top] = search(index, query, { limit: 1 });
    return top && top.score >= minScore ? top : null;
}

export { tokens };
