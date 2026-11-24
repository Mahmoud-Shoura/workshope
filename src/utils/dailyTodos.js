const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function formatTodoDateKey(dateKey) {
    if (!dateKey) return '';
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    const dayName = WEEKDAYS_AR[dt.getDay()];
    return `${dayName} ${dt.toLocaleDateString('ar-EG')}`;
}

function getStorageKey(workshopId) {
    return `workshop_daily_todos_${workshopId || 'default'}`;
}

export function loadAllTodos(workshopId) {
    try {
        const raw = localStorage.getItem(getStorageKey(workshopId));
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

export function saveAllTodos(workshopId, data) {
    try {
        localStorage.setItem(getStorageKey(workshopId), JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save daily todos:', e);
    }
}

export function addTodoItem(workshopId, dateKey, text) {
    const clean = (text || '').trim();
    if (!clean) return loadAllTodos(workshopId);
    const all = loadAllTodos(workshopId);
    const list = Array.isArray(all[dateKey]) ? all[dateKey] : [];
    const newItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: clean,
        done: false,
        createdAt: new Date().toISOString()
    };
    const updated = { ...all, [dateKey]: [newItem, ...list] };
    saveAllTodos(workshopId, updated);
    return updated;
}

export function toggleTodoItem(workshopId, dateKey, id) {
    const all = loadAllTodos(workshopId);
    const list = Array.isArray(all[dateKey]) ? all[dateKey] : [];
    const updated = {
        ...all,
        [dateKey]: list.map(item => (item.id === id ? { ...item, done: !item.done } : item))
    };
    saveAllTodos(workshopId, updated);
    return updated;
}

export function deleteTodoItem(workshopId, dateKey, id) {
    const all = loadAllTodos(workshopId);
    const list = Array.isArray(all[dateKey]) ? all[dateKey] : [];
    const filtered = list.filter(item => item.id !== id);
    const updated = { ...all };
    if (filtered.length === 0) {
        delete updated[dateKey];
    } else {
        updated[dateKey] = filtered;
    }
    saveAllTodos(workshopId, updated);
    return updated;
}
