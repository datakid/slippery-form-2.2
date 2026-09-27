export function createStore({ reducer, initialState, historyKey = 'doc', historyLimit = 80, logLimit = 200 }) {
    let state = initialState;
    const listeners = new Set();
    const past = [];
    const future = [];
    const log = [];
    let lastGroup = null;
    let lastGroupAt = 0;

    function record(entry) {
        log.push({ at: Date.now(), ...entry });
        if (log.length > logLimit) log.shift();
    }

    function emit(prev, action) {
        for (const fn of listeners) {
            try { fn(state, prev, action); }
            catch (err) { console.error('[store] listener failed for', action?.type, err); }
        }
    }

    function dispatch(action) {
        if (!action || !action.type) throw new Error('Action requires a type');
        const prev = state;
        let next;
        try {
            next = reducer(state, action);
        } catch (err) {
            record({ type: action.type, error: String(err) });
            console.error('[store] reducer failed', action, err);
            throw err;
        }
        if (next === prev) {
            record({ type: action.type, noop: true });
            return state;
        }
        if (next[historyKey] !== prev[historyKey] && !action.meta?.skipHistory) {
            const now = Date.now();
            const group = action.meta?.group;
            const merge = group && group === lastGroup && now - lastGroupAt < 1200;
            if (!merge) {
                past.push({ snapshot: prev[historyKey], label: action.type });
                if (past.length > historyLimit) past.shift();
            }
            future.length = 0;
            lastGroup = group || null;
            lastGroupAt = now;
        }
        state = next;
        record({ type: action.type, payload: summarize(action.payload) });
        emit(prev, action);
        return state;
    }

    function travel(from, to, type) {
        if (!from.length) return false;
        const entry = from.pop();
        to.push({ snapshot: state[historyKey], label: entry.label });
        const prev = state;
        state = { ...state, [historyKey]: entry.snapshot };
        lastGroup = null;
        record({ type, label: entry.label });
        emit(prev, { type, payload: { label: entry.label } });
        return entry.label;
    }

    return {
        getState: () => state,
        dispatch,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        undo: () => travel(past, future, '@@UNDO'),
        redo: () => travel(future, past, '@@REDO'),
        canUndo: () => past.length > 0,
        canRedo: () => future.length > 0,
        clearHistory() { past.length = 0; future.length = 0; },
        getLog: () => log.slice()
    };
}

function summarize(payload) {
    if (payload == null) return payload;
    try {
        const s = JSON.stringify(payload);
        return s.length > 400 ? s.slice(0, 400) + '…' : JSON.parse(s);
    } catch {
        return '[unserializable]';
    }
}
