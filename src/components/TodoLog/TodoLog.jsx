import React, { useState, useEffect, useMemo } from 'react';
import {
    CheckSquare, Square, Trash2, Search, Calendar, Plus, ArrowRight, X
} from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import {
    getTodayKey, formatTodoDateKey, loadAllTodos,
    addTodoItem, toggleTodoItem, deleteTodoItem
} from '../../utils/dailyTodos';
import './TodoLog.css';

export function TodoLog({ onViewChange }) {
    const { activeWorkshop } = useGlassStore();
    const workshopId = activeWorkshop?.id;

    const [todayKey] = useState(getTodayKey);
    const [allTodos, setAllTodos] = useState(() => loadAllTodos(workshopId));
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'done'
    const [newText, setNewText] = useState('');

    useEffect(() => {
        setAllTodos(loadAllTodos(workshopId));
    }, [workshopId]);

    const handleAddToday = (e) => {
        e.preventDefault();
        if (!newText.trim()) return;
        setAllTodos(addTodoItem(workshopId, todayKey, newText));
        setNewText('');
    };

    const handleToggle = (dateKey, id) => {
        setAllTodos(toggleTodoItem(workshopId, dateKey, id));
    };

    const handleDelete = (dateKey, id) => {
        if (window.confirm('حذف هذه المهمة من السجل؟')) {
            setAllTodos(deleteTodoItem(workshopId, dateKey, id));
        }
    };

    const dayEntries = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return Object.keys(allTodos)
            .sort((a, b) => b.localeCompare(a)) // newest date first
            .map(dateKey => {
                const rawList = Array.isArray(allTodos[dateKey]) ? allTodos[dateKey] : [];
                const dayTitle = formatTodoDateKey(dateKey);
                const dayMatchesQuery = q && (dayTitle.toLowerCase().includes(q) || dateKey.includes(q));

                const items = rawList.filter(item => {
                    if (statusFilter === 'done' && !item.done) return false;
                    if (statusFilter === 'pending' && item.done) return false;
                    if (q && !dayMatchesQuery && !item.text.toLowerCase().includes(q)) return false;
                    return true;
                });

                return {
                    dateKey,
                    dayTitle,
                    isToday: dateKey === todayKey,
                    totalCount: rawList.length,
                    doneCount: rawList.filter(i => i.done).length,
                    items
                };
            })
            .filter(entry => entry.items.length > 0);
    }, [allTodos, searchQuery, statusFilter, todayKey]);

    const summary = useMemo(() => {
        let total = 0;
        let done = 0;
        const days = Object.keys(allTodos).length;
        Object.values(allTodos).forEach(list => {
            if (!Array.isArray(list)) return;
            total += list.length;
            done += list.filter(i => i.done).length;
        });
        return { days, total, done, pending: total - done };
    }, [allTodos]);

    return (
        <div className="todolog-container">
            <div className="todolog-header">
                <div className="todolog-title-row">
                    <h2>سجل المهام اليومية</h2>
                    {onViewChange && (
                        <button
                            type="button"
                            className="todolog-back-btn"
                            onClick={() => onViewChange('dashboard')}
                        >
                            <ArrowRight size={16} />
                            <span>لوحة الإحصائيات</span>
                        </button>
                    )}
                </div>

                <div className="todolog-summary-pills">
                    <span className="summary-pill">الأيام: <strong>{summary.days}</strong></span>
                    <span className="summary-pill">إجمالي المهام: <strong>{summary.total}</strong></span>
                    <span className="summary-pill pill-green">منجز: <strong>{summary.done}</strong></span>
                    <span className="summary-pill pill-amber">متبقي: <strong>{summary.pending}</strong></span>
                </div>
            </div>

            {/* Quick Add for Today */}
            <form className="todolog-add-bar" onSubmit={handleAddToday}>
                <input
                    type="text"
                    placeholder={`إضافة مهمة جديدة لليوم (${formatTodoDateKey(todayKey)})...`}
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                />
                <button type="submit" disabled={!newText.trim()}>
                    <Plus size={18} />
                    <span>إضافة لليوم</span>
                </button>
            </form>

            {/* Search & Filter */}
            <div className="todolog-controls">
                <div className="todolog-search-wrap">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="ابحث في المهام أو بالتاريخ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button type="button" className="clear-btn" onClick={() => setSearchQuery('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="todolog-filter-tabs">
                    {[
                        { id: 'all', label: 'الكل' },
                        { id: 'pending', label: 'غير منجز' },
                        { id: 'done', label: 'منجز' }
                    ].map(f => (
                        <button
                            key={f.id}
                            type="button"
                            className={`filter-tab-btn ${statusFilter === f.id ? 'active' : ''}`}
                            onClick={() => setStatusFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Days List */}
            {dayEntries.length === 0 ? (
                <div className="todolog-empty">
                    <CheckSquare size={40} opacity={0.35} />
                    <h3>لا توجد مهام مسجلة</h3>
                    <p>أي مهمة تكتبها في الداشبورد أو هنا بتتحفظ تلقائياً حسب اليوم وتظهر في هذا السجل.</p>
                </div>
            ) : (
                <div className="todolog-days-list">
                    {dayEntries.map(day => (
                        <div key={day.dateKey} className={`todolog-day-card ${day.isToday ? 'is-today' : ''}`}>
                            <div className="day-card-header">
                                <div className="day-card-title">
                                    <Calendar size={16} />
                                    <strong>{day.dayTitle}</strong>
                                    {day.isToday && <span className="today-tag">اليوم</span>}
                                </div>
                                <span className="day-progress-badge">
                                    {day.doneCount} / {day.totalCount} منجز
                                </span>
                            </div>

                            <div className="day-card-items">
                                {day.items.map(item => (
                                    <div key={item.id} className={`todolog-item ${item.done ? 'done' : ''}`}>
                                        <button
                                            type="button"
                                            className="todo-check-btn"
                                            onClick={() => handleToggle(day.dateKey, item.id)}
                                        >
                                            {item.done
                                                ? <CheckSquare size={18} className="icon-checked" />
                                                : <Square size={18} className="icon-unchecked" />
                                            }
                                        </button>
                                        <div className="todolog-item-body" onClick={() => handleToggle(day.dateKey, item.id)}>
                                            <span className="todolog-item-text">{item.text}</span>
                                            {item.createdAt && (
                                                <span className="todolog-item-time">
                                                    {new Date(item.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="todo-del-btn"
                                            onClick={() => handleDelete(day.dateKey, item.id)}
                                            title="حذف"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
