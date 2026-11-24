import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, Wallet, AlertCircle, FileText, Users, Layers,
    CheckSquare, Square, Plus, Trash2, Calendar, ArrowLeft, CheckCircle2, Clock
} from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import {
    getTodayKey, formatTodoDateKey, loadAllTodos,
    addTodoItem, toggleTodoItem, deleteTodoItem
} from '../../utils/dailyTodos';
import './Dashboard.css';

const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const formatOrderDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${WEEKDAYS_AR[dt.getDay()]} ${dt.toLocaleDateString('ar-EG')}`;
};

export function Dashboard({ onViewChange }) {
    const { orders = [], glassTypes = [], activeWorkshop, userRole } = useGlassStore();
    const isEmployee = userRole === 'employee';
    const workshopId = activeWorkshop?.id;

    const [period, setPeriod] = useState('all'); // 'today' | 'week' | 'month' | 'all'
    const [todayKey, setTodayKey] = useState(getTodayKey);
    const [allTodos, setAllTodos] = useState(() => loadAllTodos(workshopId));
    const [newTodoText, setNewTodoText] = useState('');

    // Reload todos when workshop changes
    useEffect(() => {
        setAllTodos(loadAllTodos(workshopId));
    }, [workshopId]);

    // Auto-rollover if midnight passes while app is open
    useEffect(() => {
        const checkDay = () => {
            const current = getTodayKey();
            if (current !== todayKey) {
                setTodayKey(current);
                setAllTodos(loadAllTodos(workshopId));
            }
        };
        const interval = setInterval(checkDay, 30000);
        window.addEventListener('focus', checkDay);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', checkDay);
        };
    }, [todayKey, workshopId]);

    const todayTodos = useMemo(() => allTodos[todayKey] || [], [allTodos, todayKey]);
    const todayDoneCount = todayTodos.filter(t => t.done).length;

    const handleAddTodo = (e) => {
        e.preventDefault();
        if (!newTodoText.trim()) return;
        const updated = addTodoItem(workshopId, todayKey, newTodoText);
        setAllTodos(updated);
        setNewTodoText('');
    };

    const handleToggleTodo = (id) => {
        setAllTodos(toggleTodoItem(workshopId, todayKey, id));
    };

    const handleDeleteTodo = (id) => {
        setAllTodos(deleteTodoItem(workshopId, todayKey, id));
    };

    // Filter orders by selected period
    const filteredOrders = useMemo(() => {
        if (period === 'all') return orders;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return orders.filter(o => {
            if (!o.date) return false;
            const d = new Date(o.date);
            if (period === 'today') return d >= startOfToday;
            if (period === 'week') {
                const weekAgo = new Date(startOfToday);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return d >= weekAgo;
            }
            if (period === 'month') {
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }, [orders, period]);

    // Compute comprehensive statistics
    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalCollected = 0;
        let totalRemaining = 0;
        let totalArea = 0;
        let totalPieces = 0;
        let paidCount = 0;
        let unpaidCount = 0;
        const customerSet = new Set();
        const typeMap = {};
        const customerMap = {};

        filteredOrders.forEach(order => {
            const total = Number(order.total_cost || order.totalCost || 0);
            const dep = Number(order.deposit || 0);
            const rem = order.remaining_balance !== undefined
                ? Number(order.remaining_balance)
                : (order.remainingBalance !== undefined ? Number(order.remainingBalance) : Math.max(0, total - dep));
            const paid = Math.max(0, total - rem);

            totalRevenue += total;
            totalCollected += paid;
            totalRemaining += rem;
            if (rem <= 0.01) paidCount += 1;
            else unpaidCount += 1;

            const custName = (order.customer_name || order.customerName || '').trim() || 'عميل نقدي';
            customerSet.add(custName);
            if (!customerMap[custName]) {
                customerMap[custName] = { name: custName, count: 0, total: 0, remaining: 0 };
            }
            customerMap[custName].count += 1;
            customerMap[custName].total += total;
            customerMap[custName].remaining += rem;

            (order.items || []).forEach(item => {
                const qty = Number(item.qty || 0);
                const cost = Number(item.cost || 0);
                const tName = item.typeName || 'غير محدد';

                if (item.isPiece || item.unit === 'piece') {
                    totalPieces += qty;
                } else {
                    totalArea += Number(item.area || 0);
                }

                if (!typeMap[tName]) {
                    typeMap[tName] = { name: tName, qty: 0, area: 0, cost: 0, count: 0 };
                }
                typeMap[tName].qty += qty;
                typeMap[tName].area += (item.isPiece || item.unit === 'piece') ? 0 : Number(item.area || 0);
                typeMap[tName].cost += cost;
                typeMap[tName].count += 1;
            });
        });

        const topTypes = Object.values(typeMap).sort((a, b) => b.cost - a.cost).slice(0, 5);
        const topCustomers = Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 5);
        const recentOrders = [...filteredOrders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

        return {
            ordersCount: filteredOrders.length,
            customersCount: customerSet.size,
            totalRevenue,
            totalCollected,
            totalRemaining,
            totalArea,
            totalPieces,
            paidCount,
            unpaidCount,
            collectionRate: totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0,
            topTypes,
            topCustomers,
            recentOrders
        };
    }, [filteredOrders]);

    return (
        <div className="dash-container">
            {/* Header + Period Filter */}
            <div className="dash-header">
                <div className="dash-title-wrap">
                    <h2>لوحة التحكم والإحصائيات</h2>
                    <span className="dash-today-badge">
                        <Calendar size={14} />
                        {formatTodoDateKey(todayKey)}
                    </span>
                </div>

                <div className="dash-period-tabs">
                    {[
                        { id: 'today', label: 'اليوم' },
                        { id: 'week', label: 'آخر 7 أيام' },
                        { id: 'month', label: 'هذا الشهر' },
                        { id: 'all', label: 'الكل' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            className={`dash-period-btn ${period === tab.id ? 'active' : ''}`}
                            onClick={() => setPeriod(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="dash-kpi-grid">
                {!isEmployee && (
                    <>
                        <div className="dash-kpi-card kpi-blue">
                            <div className="kpi-icon"><TrendingUp size={22} /></div>
                            <div className="kpi-info">
                                <span className="kpi-label">إجمالي المبيعات</span>
                                <strong className="kpi-value">{stats.totalRevenue.toLocaleString()} ج.م</strong>
                                <span className="kpi-sub">{stats.ordersCount} فاتورة</span>
                            </div>
                        </div>

                        <div className="dash-kpi-card kpi-green">
                            <div className="kpi-icon"><Wallet size={22} /></div>
                            <div className="kpi-info">
                                <span className="kpi-label">إجمالي المحصّل</span>
                                <strong className="kpi-value">{stats.totalCollected.toLocaleString()} ج.م</strong>
                                <span className="kpi-sub">نسبة التحصيل: {stats.collectionRate}%</span>
                            </div>
                        </div>

                        <div className="dash-kpi-card kpi-red">
                            <div className="kpi-icon"><AlertCircle size={22} /></div>
                            <div className="kpi-info">
                                <span className="kpi-label">المتبقي عند العملاء</span>
                                <strong className="kpi-value">{stats.totalRemaining.toLocaleString()} ج.م</strong>
                                <span className="kpi-sub">{stats.unpaidCount} فاتورة غير مسددة</span>
                            </div>
                        </div>
                    </>
                )}

                <div className="dash-kpi-card kpi-purple">
                    <div className="kpi-icon"><FileText size={22} /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">حالة الفواتير</span>
                        <strong className="kpi-value">{stats.ordersCount} فاتورة</strong>
                        <span className="kpi-sub">{stats.paidCount} خالصة • {stats.unpaidCount} متبقي</span>
                    </div>
                </div>

                <div className="dash-kpi-card kpi-teal">
                    <div className="kpi-icon"><Layers size={22} /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">إجمالي الشغل</span>
                        <strong className="kpi-value">{stats.totalArea.toFixed(2)} م²</strong>
                        <span className="kpi-sub">{stats.totalPieces} قطعة • {glassTypes.length} صنف مسجل</span>
                    </div>
                </div>

                <div className="dash-kpi-card kpi-amber">
                    <div className="kpi-icon"><Users size={22} /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">العملاء</span>
                        <strong className="kpi-value">{stats.customersCount} عميل</strong>
                        <span className="kpi-sub">في الفترة المحددة</span>
                    </div>
                </div>
            </div>

            {/* Main Grid: Daily To-Do Widget + Analytics */}
            <div className="dash-main-grid">
                {/* ── Daily To-Do List Card ── */}
                <div className="dash-card dash-todo-card">
                    <div className="dash-card-header">
                        <div className="dash-card-title">
                            <CheckSquare size={18} className="title-icon-green" />
                            <div>
                                <h3>مهام اليوم (To-Do)</h3>
                                <span className="todo-date-sub">{formatTodoDateKey(todayKey)}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="dash-link-btn"
                            onClick={() => onViewChange && onViewChange('todos')}
                        >
                            <span>سجل المهام</span>
                            <ArrowLeft size={14} />
                        </button>
                    </div>

                    <form className="todo-add-form" onSubmit={handleAddTodo}>
                        <input
                            type="text"
                            placeholder="اكتب مهمة أو ملاحظة لليوم..."
                            value={newTodoText}
                            onChange={(e) => setNewTodoText(e.target.value)}
                            className="todo-input"
                        />
                        <button type="submit" className="todo-add-btn" disabled={!newTodoText.trim()}>
                            <Plus size={18} />
                            <span>إضافة</span>
                        </button>
                    </form>

                    <div className="todo-stats-bar">
                        <span>المهام: {todayTodos.length}</span>
                        <span className="text-green">منجز: {todayDoneCount}</span>
                    </div>

                    <div className="todo-list">
                        {todayTodos.length === 0 ? (
                            <div className="todo-empty">
                                <p>لا توجد مهام مسجلة لليوم بعد.</p>
                                <span>كل ما يُكتب هنا يُحفظ تلقائياً في سجل المهام، وتبدأ القائمة فارغة في اليوم التالي.</span>
                            </div>
                        ) : (
                            todayTodos.map(item => (
                                <div key={item.id} className={`todo-item ${item.done ? 'done' : ''}`}>
                                    <button
                                        type="button"
                                        className="todo-check-btn"
                                        onClick={() => handleToggleTodo(item.id)}
                                        aria-label={item.done ? 'إلغاء الإنجاز' : 'تحديد كمنجز'}
                                    >
                                        {item.done
                                            ? <CheckSquare size={18} className="icon-checked" />
                                            : <Square size={18} className="icon-unchecked" />
                                        }
                                    </button>
                                    <span className="todo-text" onClick={() => handleToggleTodo(item.id)}>
                                        {item.text}
                                    </span>
                                    <button
                                        type="button"
                                        className="todo-del-btn"
                                        onClick={() => handleDeleteTodo(item.id)}
                                        title="حذف"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Top Glass Types ── */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-title">
                            <Layers size={18} className="title-icon-blue" />
                            <h3>أكثر الأصناف طلباً</h3>
                        </div>
                    </div>
                    {stats.topTypes.length === 0 ? (
                        <div className="dash-empty-box">لا توجد بيانات في هذه الفترة</div>
                    ) : (
                        <div className="dash-rank-list">
                            {stats.topTypes.map((t, idx) => (
                                <div key={t.name} className="dash-rank-row">
                                    <div className="rank-left">
                                        <span className="rank-num">{idx + 1}</span>
                                        <div>
                                            <div className="rank-name">{t.name}</div>
                                            <div className="rank-meta">
                                                العدد: {t.qty} {t.area > 0 ? `• ${t.area.toFixed(2)} م²` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    {!isEmployee && (
                                        <strong className="rank-val">{t.cost.toLocaleString()} ج.م</strong>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Top Customers ── */}
                {!isEmployee && (
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <div className="dash-card-title">
                                <Users size={18} className="title-icon-amber" />
                                <h3>أبرز العملاء</h3>
                            </div>
                            <button
                                type="button"
                                className="dash-link-btn"
                                onClick={() => onViewChange && onViewChange('history')}
                            >
                                <span>السجل</span>
                                <ArrowLeft size={14} />
                            </button>
                        </div>
                        {stats.topCustomers.length === 0 ? (
                            <div className="dash-empty-box">لا توجد بيانات في هذه الفترة</div>
                        ) : (
                            <div className="dash-rank-list">
                                {stats.topCustomers.map((c, idx) => (
                                    <div key={c.name} className="dash-rank-row">
                                        <div className="rank-left">
                                            <span className="rank-num">{idx + 1}</span>
                                            <div>
                                                <div className="rank-name">{c.name}</div>
                                                <div className="rank-meta">
                                                    {c.count} {c.count === 1 ? 'فاتورة' : 'فواتير'}
                                                    {c.remaining > 0 && (
                                                        <span className="rank-rem"> • متبقي {c.remaining.toLocaleString()} ج.م</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <strong className="rank-val">{c.total.toLocaleString()} ج.م</strong>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Recent Orders ── */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-title">
                            <FileText size={18} className="title-icon-purple" />
                            <h3>أحدث الفواتير</h3>
                        </div>
                        <button
                            type="button"
                            className="dash-link-btn"
                            onClick={() => onViewChange && onViewChange('history')}
                        >
                            <span>كل الفواتير</span>
                            <ArrowLeft size={14} />
                        </button>
                    </div>
                    {stats.recentOrders.length === 0 ? (
                        <div className="dash-empty-box">لا توجد فواتير في هذه الفترة</div>
                    ) : (
                        <div className="dash-rank-list">
                            {stats.recentOrders.map(order => {
                                const serial = order.serialNumber || order.serial_number || '';
                                const cust = order.customer_name || order.customerName || 'عميل نقدي';
                                const total = Number(order.total_cost || order.totalCost || 0);
                                const dep = Number(order.deposit || 0);
                                const rem = order.remaining_balance !== undefined
                                    ? Number(order.remaining_balance)
                                    : Math.max(0, total - dep);
                                const isPaid = rem <= 0.01;
                                return (
                                    <div key={order.id} className="dash-rank-row">
                                        <div className="rank-left">
                                            <span className={`status-dot ${isPaid ? 'paid' : 'pending'}`}>
                                                {isPaid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                            </span>
                                            <div>
                                                <div className="rank-name">
                                                    {cust} {serial && <span className="mini-serial">{serial}</span>}
                                                </div>
                                                <div className="rank-meta">{formatOrderDate(order.date)}</div>
                                            </div>
                                        </div>
                                        {!isEmployee && (
                                            <div className="rank-right-col">
                                                <strong className="rank-val">{total.toLocaleString()} ج.م</strong>
                                                {!isPaid && <span className="rank-rem">باقي {rem.toLocaleString()}</span>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
