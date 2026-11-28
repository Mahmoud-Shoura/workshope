import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    MessageCircle, ArrowRight, Trash2, Search, User, Phone,
    Edit2, CheckCircle, Printer, Square, CheckSquare, XCircle, X, Loader2
} from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import { PrintSheetModal } from '../PrintSheet/PrintSheetModal';
import { shareInvoicePdf } from '../../utils/pdfShare';
import { hueForSerial } from '../../utils/tint';
import '../../utils/tint.css';
import './History.css';

const EDIT_ORDER_KEY = 'edit_order_pending';
const PREV_BALANCE_ID = 'previous_balance';

const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('ar-EG') : '');

const formatDateFull = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const day = WEEKDAYS_AR[dt.getDay()];
    return `${day} ${dt.toLocaleDateString('ar-EG')}`;
};

const getPayments = (order) =>
    Array.isArray(order?.payment_history)
        ? order.payment_history.filter(p => Number(p.amount) > 0)
        : [];

const getPrevBalance = (order) => {
    const adj = (order?.adjustments || []).find(a => a.id === PREV_BALANCE_ID);
    return adj ? Number(adj.amount) || 0 : 0;
};

/* ─────────────────────────────────────────────────────
   Multi-Invoice Print Modal — يطبع فواتير محددة معاً
───────────────────────────────────────────────────── */
function MultiPrintModal({ orders, onClose, printSettings }) {
    const bodyRef = useRef(null);
    const [isSharingPdf, setIsSharingPdf] = useState(false);

    if (!orders || orders.length === 0) return null;

    const handlePrint = () => window.print();

    const handleSharePdf = async () => {
        if (!bodyRef.current) return;
        setIsSharingPdf(true);
        const firstOrder = orders[0];
        const customerName = firstOrder?.customer_name || firstOrder?.customerName || 'عميل';
        const phoneNumber = firstOrder?.customer_phone || firstOrder?.phoneNumber || '';
        const serials = orders.map(o => o.serialNumber || o.serial_number).filter(Boolean).join('_');

        const clone = bodyRef.current.cloneNode(true);
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:fixed;top:0;left:0;width:794px;background:#fff;z-index:-1;pointer-events:none;padding:0;';
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        try {
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            await shareInvoicePdf({
                element: clone,
                customerName,
                phoneNumber,
                serialNumber: serials || `${orders.length}_فواتير`,
                workshopName: printSettings?.workshop_name || 'الورشة'
            });
        } catch (err) {
            console.error('Multi share PDF error:', err);
            alert('حدث خطأ أثناء مشاركة الفواتير PDF: ' + err.message);
        } finally {
            if (wrapper.parentNode) document.body.removeChild(wrapper);
            setIsSharingPdf(false);
        }
    };

    return createPortal(
        <div className="multi-print-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="multi-print-modal">
                {/* Header */}
                <div className="multi-print-header no-print">
                    <div className="multi-print-title">
                        <span>طباعة {orders.length} فاتورة</span>
                    </div>
                    <div className="multi-print-actions">
                        <button
                            type="button"
                            className="ps-btn ps-btn-wa"
                            onClick={handleSharePdf}
                            disabled={isSharingPdf}
                            title="إرسال الفواتير المحددة PDF على واتساب"
                        >
                            {isSharingPdf
                                ? <><Loader2 size={15} className="spin-icon" /><span>جاري تجهيز PDF...</span></>
                                : <><MessageCircle size={15} /><span>PDF على واتساب</span></>
                            }
                        </button>
                        <button type="button" className="ps-btn ps-btn-print" onClick={handlePrint}>
                            <Printer size={15} /> طباعة الكل
                        </button>
                        <button type="button" className="ps-btn-close" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>

                {/* Pages */}
                <div className="multi-print-body" ref={bodyRef}>
                    {orders.map((order, pageIdx) => {
                        const workshopName = printSettings?.workshop_name || 'ورشة العمل الحديثة';
                        const customerName = order.customer_name || order.customerName || 'عميل نقدي';
                        const phone = order.customer_phone || order.phoneNumber || '';
                        const serial = order.serialNumber || order.serial_number || '';
                        const totalCost = Number(order.total_cost || order.totalCost || 0);
                        const dep = Number(order.deposit || 0);
                        const rem = order.remaining_balance !== undefined
                            ? Number(order.remaining_balance)
                            : Math.max(0, totalCost - dep);
                        const baseCost = order.baseCost ?? order.base_cost ?? 0;
                        const totalArea = order.totalArea ?? order.total_area ?? 0;
                        const adjustments = (order.adjustments || []).filter(a => a.id !== PREV_BALANCE_ID);

                        return (
                            <div key={order.id} className={`multi-print-page ${pageIdx > 0 ? 'page-break-before' : ''}`}>
                                {/* Title */}
                                <div className="mp-title">
                                    <h2>{workshopName}</h2>
                                    <p>كشف تفصيلي بالقياسات وحسابات العميل</p>
                                </div>

                                {/* Info Grid */}
                                <div className="mp-info-grid">
                                    <div className="mp-info-box mp-box-customer">
                                        <div className="mp-box-head">
                                            <span>بيانات العميل والفاتورة</span>
                                            <span className="mp-serial-pill">{serial}</span>
                                        </div>
                                        <table className="mp-info-table">
                                            <tbody>
                                                <tr><td>اسم العميل</td><td><strong>{customerName}</strong></td></tr>
                                                <tr><td>رقم الهاتف</td><td dir="ltr">{phone || '—'}</td></tr>
                                                <tr><td>رقم الفاتورة</td><td><strong className="mp-serial-val">{serial}</strong></td></tr>
                                                <tr><td>تاريخ الفاتورة</td><td>{formatDateFull(order.date)}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mp-info-box mp-box-workshop">
                                        <div className="mp-box-head"><span>بيانات الورشة</span></div>
                                        <table className="mp-info-table">
                                            <tbody>
                                                <tr><td>اسم الورشة</td><td><strong>{workshopName}</strong></td></tr>
                                                {printSettings?.owner_name && <tr><td>صاحب العمل</td><td>{printSettings.owner_name}</td></tr>}
                                                {printSettings?.phone && <tr><td>الهاتف</td><td dir="ltr">{printSettings.phone}</td></tr>}
                                                {printSettings?.address && <tr><td>العنوان</td><td>{printSettings.address}</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="mp-section-label">تفاصيل البنود والقياسات</div>
                                <table className="mp-items-table">
                                    <thead>
                                        <tr>
                                            <th>#</th><th>الصنف / الخامة</th>
                                            <th>الطول</th><th>العرض</th>
                                            <th>العدد</th><th>المساحة / الوصف</th>
                                            <th>السعر</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(order.items || []).map((item, idx) => {
                                            let desc = '';
                                            if (item.isPiece) desc = item.description || 'بالقطعة';
                                            else if (item.extras?.length) desc = `${Number(item.area || 0).toFixed(2)} م² + إضافات`;
                                            else desc = `${Number(item.area || 0).toFixed(2)} م²`;
                                            return (
                                                <tr key={idx} className={idx % 2 === 0 ? 'mp-row-even' : 'mp-row-odd'}>
                                                    <td>{idx + 1}</td>
                                                    <td><strong>{item.typeName}</strong></td>
                                                    <td>{item.isPiece ? '—' : (item.length || '—')}</td>
                                                    <td>{item.isPiece ? '—' : (item.width || '—')}</td>
                                                    <td><strong>{item.qty}</strong></td>
                                                    <td>{desc}</td>
                                                    <td><strong>{Number(item.cost || 0).toFixed(2)}</strong></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Totals */}
                                <div className="mp-totals">
                                    <div className="mp-totals-col">
                                        {totalArea > 0 && <div className="mp-tot-row"><span>إجمالي المساحة:</span><strong>{Number(totalArea).toFixed(2)} م²</strong></div>}
                                        <div className="mp-tot-row"><span>الحساب الأساسي:</span><strong>{Number(baseCost).toFixed(2)} ج.م</strong></div>
                                        {adjustments.map((adj, i) => (
                                            <div key={i} className="mp-tot-row mp-adj">
                                                <span>{adj.name}:</span>
                                                <strong className={adj.amount < 0 ? 'mp-red' : 'mp-blue'}>
                                                    {adj.amount >= 0 ? '+' : ''}{Number(adj.amount).toFixed(2)} ج.م
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mp-totals-summary">
                                        <div className="mp-tot-row mp-tot-total"><span>الإجمالي المطلوب:</span><strong>{totalCost.toFixed(2)} ج.م</strong></div>
                                        <div className="mp-tot-row"><span>العربون / المقدم:</span><strong className="mp-green">{dep.toFixed(2)} ج.م</strong></div>
                                        <div className="mp-tot-row mp-tot-remaining"><span>المتبقي للاستلام:</span><strong className="mp-red">{rem.toFixed(2)} ج.م</strong></div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mp-footer">
                                    <p>{printSettings?.footer_note || `نشكركم لتعاملكم معنا — ${workshopName}`}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
}

/* ═══════════════════════════════════════════════════
   Main History Component
═══════════════════════════════════════════════════ */
export function History({ onViewChange }) {
    const { orders, deleteOrder, markOrderPaid, userRole, printSettings } = useGlassStore();
    const isEmployee = userRole === 'employee';
    const [selectedCustomerName, setSelectedCustomerName] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [printSheetOrder, setPrintSheetOrder] = useState(null);

    // Multi-select state
    const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
    const [multiPrintOrders, setMultiPrintOrders] = useState(null);
    const [showSearchBar, setShowSearchBar] = useState(true);

    const searchRef = useRef(null);
    const lastScrollY = useRef(0);

    // إخفاء شريط البحث عند النزول وإظهاره عند الصعود (في قائمة العملاء فقط)
    useEffect(() => {
        if (selectedCustomerName) return undefined;
        lastScrollY.current = window.scrollY || window.pageYOffset || 0;
        setShowSearchBar(true);

        const handleScroll = () => {
            const currentY = window.scrollY || window.pageYOffset || 0;
            if (currentY <= 40 || searchQuery.trim()) {
                setShowSearchBar(true);
            } else if (currentY > lastScrollY.current + 8) {
                setShowSearchBar(false);
            } else if (currentY < lastScrollY.current - 8) {
                setShowSearchBar(true);
            }
            lastScrollY.current = currentY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [selectedCustomerName, searchQuery]);

    const formatPhone = (raw) => {
        if (!raw) return null;
        let phone = raw.replace(/[^0-9+]/g, '');
        if (phone.startsWith('0') && !phone.startsWith('00')) phone = '20' + phone.slice(1);
        phone = phone.replace(/^\+/, '');
        return phone || null;
    };

    const buildWhatsAppMessage = (order) => {
        const workshopName = printSettings?.workshop_name || 'الورشة الحديثة';
        const customerName = order.customer_name || order.customerName || 'عميل';
        const totalCost = Number(order.total_cost || order.totalCost || 0);
        const dep = Number(order.deposit || 0);
        const remaining = order.remaining_balance !== undefined
            ? Number(order.remaining_balance)
            : (order.remainingBalance !== undefined ? Number(order.remainingBalance) : totalCost - dep);

        let msg = `*فاتورة حساب - ${customerName}* (${workshopName})\n\n`;
        (order.items || []).forEach((item, i) => {
            msg += `${i + 1}. *${item.typeName}*\n`;
            if (item.isPiece) {
                if (item.description) msg += `   الوصف: ${item.description}\n`;
                msg += `   الكمية: ${item.qty} قطعة\n`;
            } else {
                msg += `   الأبعاد: ${item.length} × ${item.width} سم\n`;
                msg += `   الكمية: ${item.qty}\n`;
                msg += `   المساحة: ${Number(item.area).toFixed(2)} م²\n`;
            }
            msg += `   السعر: ${Number(item.cost).toFixed(2)} ج.م\n\n`;
        });

        msg += `━━━━━━━━━━━━━━━━\n`;
        const baseCost = order.base_cost ?? order.baseCost;
        const totalArea = order.total_area ?? order.totalArea;
        if (totalArea) msg += `*إجمالي المساحة:* ${Number(totalArea).toFixed(2)} م²\n`;
        if (baseCost != null) msg += `*الحساب الأساسي:* ${Number(baseCost).toFixed(2)} ج.م\n`;
        if (order.adjustments?.length) {
            msg += `--- الرسوم والخصومات ---\n`;
            order.adjustments.forEach(adj => {
                const sign = adj.amount >= 0 ? '+' : '';
                msg += `${adj.name}: ${sign}${Number(adj.amount).toFixed(2)} ج.م\n`;
            });
            msg += `━━━━━━━━━━━━━━━━\n`;
        }
        msg += `*الإجمالي المطلوب:* ${totalCost.toFixed(2)} ج.م\n`;
        msg += `*العربون/المقدم:* ${dep.toFixed(2)} ج.م\n`;
        getPayments(order).forEach(pay => {
            msg += `*دفعة (${formatDate(pay.date)}):* ${Number(pay.amount).toFixed(2)} ج.م\n`;
        });
        msg += `*المتبقي للاستلام:* ${remaining.toFixed(2)} ج.م\n\n`;
        msg += `_التاريخ: ${new Date(order.date).toLocaleDateString('ar-EG')}_\n`;
        msg += `_${printSettings?.footer_note || `شكراً لتعاملكم معنا - ${workshopName}`}_`;
        return msg;
    };

    const handleSendWhatsApp = (order) => {
        const rawPhone = order.customer_phone || order.phoneNumber;
        const phone = formatPhone(rawPhone);
        if (!phone) { alert('لا يوجد رقم هاتف محفوظ لهذا الطلب'); return; }
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage(order))}`, '_blank');
    };

    const handleDeleteOrder = (id) => {
        if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الفاتورة نهائياً؟')) deleteOrder(id);
    };

    const handleMarkPaid = (order) => {
        if (window.confirm('تأكيد استلام المبلغ المتبقي بالكامل لهذه الفاتورة؟')) markOrderPaid(order.id);
    };

    const handleEditOrder = (order) => {
        try {
            localStorage.setItem(EDIT_ORDER_KEY, JSON.stringify(order));
            sessionStorage.setItem(EDIT_ORDER_KEY, JSON.stringify(order));
        } catch (e) { console.error('Failed to save edit order:', e); }
        if (onViewChange) onViewChange('calculator');
    };

    // ── Multi-select helpers ──
    const toggleSelect = (id) => {
        setSelectedOrderIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = (ordersList) => {
        if (selectedOrderIds.size === ordersList.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(ordersList.map(o => o.id)));
        }
    };

    const handleMultiPrint = (ordersList) => {
        const toPrint = ordersList.filter(o => selectedOrderIds.has(o.id));
        if (toPrint.length === 0) { alert('اختار فاتورة واحدة على الأقل'); return; }
        setMultiPrintOrders(toPrint);
    };

    const handleMultiWhatsApp = (ordersList, fallbackPhone) => {
        const selected = ordersList.filter(o => selectedOrderIds.has(o.id));
        if (selected.length === 0) { alert('اختار فاتورة واحدة على الأقل'); return; }
        if (selected.length === 1) {
            handleSendWhatsApp(selected[0]);
            return;
        }

        const workshopName = printSettings?.workshop_name || 'الورشة الحديثة';
        const customerName = selected[0]?.customer_name || selected[0]?.customerName || 'عميل';
        const rawPhone = selected.map(o => o.customer_phone || o.phoneNumber).find(Boolean) || fallbackPhone;
        const phone = formatPhone(rawPhone);

        let grandTotal = 0;
        let grandPaid = 0;
        let grandRemaining = 0;

        let msg = `*كشف حساب مجمّع - ${customerName}* (${workshopName})\n`;
        msg += `عدد الفواتير: ${selected.length}\n`;
        msg += `━━━━━━━━━━━━━━━━\n\n`;

        selected.forEach((order, idx) => {
            const serial = order.serialNumber || order.serial_number || `#${idx + 1}`;
            const total = Number(order.total_cost || order.totalCost || 0);
            const dep = Number(order.deposit || 0);
            const rem = order.remaining_balance !== undefined
                ? Number(order.remaining_balance)
                : (order.remainingBalance !== undefined ? Number(order.remainingBalance) : Math.max(0, total - dep));
            const paid = Math.max(0, total - rem);

            grandTotal += total;
            grandPaid += paid;
            grandRemaining += rem;

            msg += `📄 *فاتورة ${serial}* (${formatDateFull(order.date)})\n`;
            (order.items || []).forEach((item, i) => {
                const desc = item.isPiece
                    ? `${item.description || 'قطعة'} (${item.qty})`
                    : `${item.length}×${item.width} (${item.qty})`;
                msg += `  ${i + 1}. ${item.typeName}: ${desc} — ${Number(item.cost || 0).toFixed(2)} ج.م\n`;
            });
            msg += `  • الإجمالي: ${total.toFixed(2)} ج.م | المدفوع: ${paid.toFixed(2)} ج.م | المتبقي: ${rem.toFixed(2)} ج.م\n\n`;
        });

        msg += `━━━━━━━━━━━━━━━━\n`;
        msg += `*الإجمالي الكلي:* ${grandTotal.toFixed(2)} ج.م\n`;
        msg += `*إجمالي المدفوع:* ${grandPaid.toFixed(2)} ج.م\n`;
        msg += `*إجمالي المتبقي:* ${grandRemaining.toFixed(2)} ج.م\n`;
        msg += `_${printSettings?.footer_note || `شكراً لتعاملكم معنا - ${workshopName}`}_`;

        const waUrl = phone
            ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
    };

    const clearSelection = () => setSelectedOrderIds(new Set());

    // ── Customer groups ──
    const getGroupedCustomers = () => {
        if (!orders) return [];
        const groups = {};
        orders.forEach(order => {
            const rawName = (order.customer_name || order.customerName || '').trim();
            const name = rawName || 'عميل نقدي / بدون اسم';
            const phone = order.customer_phone || order.phoneNumber || '';
            const totalCost = Number(order.total_cost || order.totalCost || 0);
            const dep = Number(order.deposit || 0);
            const remaining = order.remaining_balance !== undefined ? Number(order.remaining_balance)
                : (order.remainingBalance !== undefined ? Number(order.remainingBalance) : (totalCost - dep));
            const paidTotal = totalCost - remaining;
            if (!groups[name]) {
                groups[name] = { customerName: name, isNameless: !rawName, phoneNumber: phone, ordersCount: 0, totalCost: 0, totalDeposit: 0, totalRemaining: 0, orders: [] };
            }
            groups[name].ordersCount += 1;
            groups[name].totalCost += totalCost;
            groups[name].totalDeposit += paidTotal;
            groups[name].totalRemaining += remaining;
            groups[name].orders.push(order);
            if (phone && !groups[name].phoneNumber) groups[name].phoneNumber = phone;
        });

        const q = searchQuery.trim().toLowerCase();
        if (!q) return Object.values(groups);
        return Object.values(groups).filter(customer => {
            const matchesName = customer.customerName.toLowerCase().includes(q);
            const matchesPhone = (customer.phoneNumber || '').includes(q);
            const matchesSerial = customer.orders.some(o => {
                const s = (o.serialNumber || o.serial_number || '').toLowerCase();
                return s.includes(q);
            });
            return matchesName || matchesPhone || matchesSerial;
        });
    };

    const groupedCustomers = getGroupedCustomers();
    const selectedCustomer = selectedCustomerName ? groupedCustomers.find(c => c.customerName === selectedCustomerName) : null;

    useEffect(() => {
        if (selectedCustomerName && !selectedCustomer) setSelectedCustomerName(null);
    }, [orders, selectedCustomerName, selectedCustomer]);

    // Clear selection when switching views
    useEffect(() => { setSelectedOrderIds(new Set()); }, [selectedCustomerName]);

    if (!orders || orders.length === 0) {
        return (
            <div className="history-empty">
                <h2>سجل الطلبات فارغ</h2>
                <p>الحسابات المحفوظة ستظهر هنا.</p>
            </div>
        );
    }

    /* ══════════════════════════════════════════════════
       Customer Detail View
    ══════════════════════════════════════════════════ */
    if (selectedCustomer) {
        const allCustomerOrders = [...selectedCustomer.orders].sort((a, b) => new Date(b.date) - new Date(a.date));
        const sortedOrders = allCustomerOrders;

        const paymentLog = allCustomerOrders.flatMap(order => {
            const serial = order.serialNumber || order.serial_number || '';
            const entries = [];
            const dep = Number(order.deposit || 0);
            if (dep > 0) entries.push({ key: `${order.id}-dep`, date: order.date, serial, note: 'عربون', amount: dep });
            getPayments(order).forEach((pay, i) => {
                entries.push({ key: `${order.id}-${pay.id || i}`, date: pay.date || order.date, serial, note: pay.note || 'دفعة', amount: Number(pay.amount) });
            });
            return entries;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        const paymentLogTotal = paymentLog.reduce((sum, e) => sum + e.amount, 0);
        const allSelected = selectedOrderIds.size === sortedOrders.length && sortedOrders.length > 0;
        const anySelected = selectedOrderIds.size > 0;

        return (
            <div className="history-container">
                {/* Customer header + back button (بدون شريط بحث) */}
                <div className="customer-detail-header">
                    <button onClick={() => setSelectedCustomerName(null)} className="btn-back">
                        <ArrowRight size={18} />
                        العودة لقائمة العملاء
                    </button>
                    <div className="customer-info-title">
                        <h2>حسابات العميل: {selectedCustomer.customerName}</h2>
                        {selectedCustomer.phoneNumber && <p className="phone-subtitle">الهاتف: {selectedCustomer.phoneNumber}</p>}
                    </div>
                </div>

                {/* Stats */}
                {!isEmployee && (
                    <div className="customer-stats-summary">
                        <div className="stat-card"><span className="stat-label">عدد الفواتير</span><span className="stat-value">{selectedCustomer.ordersCount}</span></div>
                        <div className="stat-card"><span className="stat-label">إجمالي المطلوب</span><span className="stat-value">{selectedCustomer.totalCost.toLocaleString()} ج.م</span></div>
                        <div className="stat-card text-green-card"><span className="stat-label">إجمالي المدفوع</span><span className="stat-value">{selectedCustomer.totalDeposit.toLocaleString()} ج.م</span></div>
                        <div className="stat-card text-red-card"><span className="stat-label">إجمالي المتبقي</span><span className="stat-value">{selectedCustomer.totalRemaining.toLocaleString()} ج.م</span></div>
                    </div>
                )}

                {/* Payment Log */}
                {!isEmployee && paymentLog.length > 0 && (
                    <div className="payment-log">
                        <div className="payment-log-header">
                            <h3>سجل دفعات العميل</h3>
                            <span className="payment-log-count">{paymentLog.length} دفعة</span>
                        </div>
                        <div className="payment-log-table-wrap">
                            <table className="payment-log-table">
                                <thead><tr><th>اليوم والتاريخ</th><th>الفاتورة</th><th>البيان</th><th>المبلغ</th></tr></thead>
                                <tbody>
                                    {paymentLog.map(entry => (
                                        <tr key={entry.key}>
                                            <td>{formatDateFull(entry.date)}</td>
                                            <td>{entry.serial || '—'}</td>
                                            <td>{entry.note}</td>
                                            <td className="text-green payment-log-amount">{entry.amount.toLocaleString()} ج.م</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3}>إجمالي المدفوع</td>
                                        <td className="text-green payment-log-amount">{paymentLogTotal.toLocaleString()} ج.م</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Multi-select toolbar ── */}
                <div className="orders-toolbar">
                    <h3>تفاصيل الفواتير ({sortedOrders.length})</h3>
                    <div className="orders-toolbar-actions">
                        {anySelected && (
                            <>
                                <span className="selection-count">{selectedOrderIds.size} محدد</span>
                                <button
                                    className="btn-multi-whatsapp"
                                    onClick={() => handleMultiWhatsApp(sortedOrders, selectedCustomer.phoneNumber)}
                                    title="إرسال الفواتير المحددة على واتساب"
                                >
                                    <MessageCircle size={15} /> واتساب
                                </button>
                                <button
                                    className="btn-multi-print"
                                    onClick={() => handleMultiPrint(sortedOrders)}
                                >
                                    <Printer size={15} /> طباعة المحدد
                                </button>
                                <button className="btn-clear-selection" onClick={clearSelection}>
                                    <XCircle size={15} /> إلغاء
                                </button>
                            </>
                        )}
                        <button
                            className={`btn-select-all ${allSelected ? 'active' : ''}`}
                            onClick={() => toggleSelectAll(sortedOrders)}
                            title="تحديد الكل"
                        >
                            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            <span>{allSelected ? 'إلغاء الكل' : 'تحديد الكل'}</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="history-table-wrapper">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36 }}></th>
                                <th>الفاتورة والتاريخ</th>
                                <th>البيان والقياسات</th>
                                <th>الصنف / الخامة</th>
                                <th>تفاصيل الحساب</th>
                                <th>العربون والمتبقي</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOrders.map((order) => {
                                const totalCost = Number(order.total_cost || order.totalCost || 0);
                                const dep = Number(order.deposit || 0);
                                const rem = order.remaining_balance !== undefined ? Number(order.remaining_balance)
                                    : (order.remainingBalance !== undefined ? Number(order.remainingBalance) : (totalCost - dep));
                                const phone = order.customer_phone || order.phoneNumber;
                                const baseCost = order.baseCost || order.base_cost;
                                const serial = order.serialNumber || order.serial_number;
                                const prevBalance = getPrevBalance(order);
                                const otherAdjustments = (order.adjustments || []).filter(a => a.id !== PREV_BALANCE_ID);
                                const isChecked = selectedOrderIds.has(order.id);
                                return (
                                    <tr
                                        key={order.id}
                                        className={`tinted ${isChecked ? 'row-selected' : ''}`}
                                        style={{ '--tint-h': hueForSerial(serial, order.id) }}
                                    >
                                        <td className="select-cell" onClick={() => toggleSelect(order.id)}>
                                            {isChecked
                                                ? <CheckSquare size={18} className="check-icon checked" />
                                                : <Square size={18} className="check-icon" />
                                            }
                                        </td>
                                        <td className="history-date">
                                            {serial && <div className="history-serial-pill">{serial}</div>}
                                            <div className="date-day">{WEEKDAYS_AR[new Date(order.date).getDay()]}</div>
                                            <div>{new Date(order.date).toLocaleDateString('ar-EG')}</div>
                                            <div className="time-sub">{new Date(order.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td>
                                            <div className="history-items">
                                                {order.items?.map((item, idx) => (
                                                    <div key={idx}>{item.isPiece ? (item.description || 'قطعة') : `${item.length}x${item.width}`} / {item.qty} {item.isAddLinear ? `(+ م.ط)` : ''}</div>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="history-items">
                                                {order.items?.map((item, idx) => <div key={idx}>{item.typeName}</div>)}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="price-breakdown">
                                                <div className="final-price">{totalCost.toLocaleString()} ج.م</div>
                                                {prevBalance > 0 && <div className="prev-balance-row">منها حساب قديم: {prevBalance.toLocaleString()} ج.م</div>}
                                                {otherAdjustments.length > 0 && (
                                                    <div className="adjustments-tooltip">
                                                        <span>الأساسي: {Number(baseCost || 0).toLocaleString()} ج.م</span>
                                                        {otherAdjustments.map((adj, idx) => (
                                                            <span key={idx}>{adj.name}: {adj.amount >= 0 ? '+' : ''}{adj.amount.toLocaleString()} ج.م</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="payment-breakdown">
                                                <div className="deposit-val text-green">المقدم: {dep.toLocaleString()} ج.م</div>
                                                {getPayments(order).map((pay, i) => (
                                                    <div key={pay.id || i} className="payment-date-row text-green">
                                                        <span className="lbl-colon">دفعة <span className="num-unit">{formatDate(pay.date)}</span></span> {Number(pay.amount).toLocaleString()} ج.م
                                                    </div>
                                                ))}
                                                <div className="remaining-val text-red">الباقي: {rem.toLocaleString()} ج.م</div>
                                            </div>
                                        </td>
                                        <td className="history-actions-cell">
                                            <div className="actions-flex">
                                                <button onClick={() => setPrintSheetOrder(order)} className="btn-print-small" title="كشف الطباعة"><Printer size={16} /></button>
                                                {rem > 0 ? (
                                                    <button onClick={() => handleMarkPaid(order)} className="btn-paid-small" title="تم استلام المبلغ"><CheckCircle size={16} /></button>
                                                ) : (
                                                    <span className="paid-badge"><CheckCircle size={14} /> تم</span>
                                                )}
                                                <button onClick={() => handleEditOrder(order)} className="btn-edit-small" title="تعديل"><Edit2 size={16} /></button>
                                                <button onClick={() => handleSendWhatsApp(order)} className="btn-whatsapp-small" disabled={!phone} title={phone ? 'واتساب' : 'لا يوجد رقم'}><MessageCircle size={16} /></button>
                                                {!isEmployee && <button onClick={() => handleDeleteOrder(order.id)} className="btn-delete-small" title="حذف"><Trash2 size={16} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="history-mobile-cards">
                    {sortedOrders.map((order) => {
                        const totalCost = Number(order.total_cost || order.totalCost || 0);
                        const dep = Number(order.deposit || 0);
                        const rem = order.remaining_balance !== undefined ? Number(order.remaining_balance)
                            : (order.remainingBalance !== undefined ? Number(order.remainingBalance) : (totalCost - dep));
                        const phone = order.customer_phone || order.phoneNumber;
                        const serial = order.serialNumber || order.serial_number;
                        const isChecked = selectedOrderIds.has(order.id);
                        return (
                            <div key={order.id} className={`history-card tinted ${isChecked ? 'card-selected' : ''}`} style={{ '--tint-h': hueForSerial(serial, order.id) }}>
                                <div className="history-card-header">
                                    <div className="card-header-left">
                                        {/* Checkbox */}
                                        <button className="card-select-btn" onClick={() => toggleSelect(order.id)} title="تحديد">
                                            {isChecked
                                                ? <CheckSquare size={20} className="check-icon checked" />
                                                : <Square size={20} className="check-icon" />
                                            }
                                        </button>
                                        <div>
                                            {serial && <span className="history-card-serial-badge">{serial}</span>}
                                            <p className="history-card-date">
                                                <span className="hc-day">{WEEKDAYS_AR[new Date(order.date).getDay()]}</span>
                                                <span className="hc-sep"> • </span>
                                                <span className="hc-date">{new Date(order.date).toLocaleDateString('ar-EG')}</span>
                                                <span className="hc-sep"> • </span>
                                                <span className="hc-time">{new Date(order.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="history-card-header-actions">
                                        <div className="history-card-price">{totalCost.toLocaleString()} ج.م</div>
                                        <div className="actions-flex">
                                            <button onClick={() => setPrintSheetOrder(order)} className="btn-print-card" title="كشف الطباعة"><Printer size={18} /></button>
                                            {rem > 0 ? (
                                                <button onClick={() => handleMarkPaid(order)} className="btn-paid-card" title="تم استلام المبلغ"><CheckCircle size={18} /></button>
                                            ) : (
                                                <span className="paid-badge"><CheckCircle size={14} /> تم الاستلام</span>
                                            )}
                                            <button onClick={() => handleEditOrder(order)} className="btn-edit-card" title="تعديل"><Edit2 size={18} /></button>
                                            <button onClick={() => handleSendWhatsApp(order)} className="btn-whatsapp-card" disabled={!phone} title={phone ? 'واتساب' : 'لا يوجد رقم'}><MessageCircle size={18} /></button>
                                            {!isEmployee && <button onClick={() => handleDeleteOrder(order.id)} className="btn-delete-card" title="حذف"><Trash2 size={18} /></button>}
                                        </div>
                                    </div>
                                </div>

                                <div className="history-card-items">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="history-card-item">
                                            <span>{item.typeName}</span>
                                            <span>{item.isPiece ? (item.description || 'قطعة') : `${item.length}x${item.width}`} ({item.qty}) {item.isAddLinear ? `(+ م.ط)` : ''}</span>
                                        </div>
                                    ))}
                                    {order.adjustments && order.adjustments.length > 0 && (
                                        <div className="history-card-adjustments">
                                            <div className="card-adj-header">الإضافات والخصومات:</div>
                                            {order.adjustments.map((adj, idx) => (
                                                <div key={idx} className="history-card-item adj-row">
                                                    <span>{adj.name}</span>
                                                    <span>{adj.amount >= 0 ? '+' : ''}{adj.amount.toLocaleString()} ج.م</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="history-card-payment-summary">
                                        <div className="payment-row text-green"><span>العربون المدفوع:</span><strong>{dep.toLocaleString()} ج.م</strong></div>
                                        {getPayments(order).map((pay, i) => (
                                            <div key={pay.id || i} className="payment-row text-green">
                                                <span className="lbl-colon">دفعة <span className="num-unit">{formatDate(pay.date)}</span></span>
                                                <strong>{Number(pay.amount).toLocaleString()} ج.م</strong>
                                            </div>
                                        ))}
                                        <div className="payment-row text-red"><span>المتبقي المطلوب:</span><strong>{rem.toLocaleString()} ج.م</strong></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Single Print Modal */}
                <PrintSheetModal
                    isOpen={!!printSheetOrder}
                    onClose={() => setPrintSheetOrder(null)}
                    customerName={printSheetOrder?.customer_name || printSheetOrder?.customerName}
                    phoneNumber={printSheetOrder?.customer_phone || printSheetOrder?.phoneNumber}
                    orderDate={printSheetOrder?.date}
                    serialNumber={printSheetOrder?.serialNumber || printSheetOrder?.serial_number || '#INV-1001'}
                    items={printSheetOrder?.items || []}
                    baseCost={printSheetOrder?.baseCost ?? printSheetOrder?.base_cost ?? 0}
                    totalArea={printSheetOrder?.totalArea ?? printSheetOrder?.total_area ?? 0}
                    adjustments={printSheetOrder?.adjustments || []}
                    totalCost={printSheetOrder?.total_cost || printSheetOrder?.totalCost || 0}
                    deposit={printSheetOrder?.deposit || 0}
                    remainingBalance={printSheetOrder?.remaining_balance ?? printSheetOrder?.remainingBalance}
                    payments={printSheetOrder ? getPayments(printSheetOrder) : []}
                    printSettings={printSettings}
                />

                {/* Multi Print Modal */}
                {multiPrintOrders && (
                    <MultiPrintModal
                        orders={multiPrintOrders}
                        onClose={() => setMultiPrintOrders(null)}
                        printSettings={printSettings}
                    />
                )}
            </div>
        );
    }

    /* ══════════════════════════════════════════════════
       Customers List View (main view)
    ══════════════════════════════════════════════════ */
    return (
        <div className="history-container">
            {/* ── Sticky search bar (يختفي عند النزول ويظهر عند الصعود) ── */}
            <div className={`history-sticky-bar ${!showSearchBar ? 'hidden-on-scroll' : ''}`}>
                <h2 className="history-title-inline">سجل معاملات العملاء</h2>
                <div className="sticky-search-wrap">
                    <Search size={16} className="search-icon" />
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="ابحث باسم العميل، الهاتف، أو رقم الفاتورة..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="search-input sticky-search-input"
                    />
                    {searchQuery && (
                        <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {groupedCustomers.length === 0 ? (
                <div className="history-empty"><p>لا يوجد عملاء يطابقون بحثك.</p></div>
            ) : (
                <div className="customers-grid">
                    {groupedCustomers.map((customer) => {
                        const hasRemaining = customer.totalRemaining > 0;
                        return (
                            <div
                                key={customer.customerName}
                                className={`customer-summary-card ${customer.isNameless ? 'nameless-card' : ''}`}
                                onClick={() => setSelectedCustomerName(customer.customerName)}
                            >
                                <div className="card-top">
                                    <div className="user-icon-wrapper"><User size={20} /></div>
                                    <div className="customer-info">
                                        <h3>{customer.customerName}</h3>
                                        <span className="badge-fats">
                                            {customer.ordersCount} {customer.ordersCount === 1 ? 'فاتورة' : customer.ordersCount === 2 ? 'فاتورتين' : 'فواتير'}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-financials">
                                    <div className="financial-item"><span>إجمالي الحساب:</span><strong>{customer.totalCost.toLocaleString()} ج.م</strong></div>
                                    <div className="financial-item text-green"><span>إجمالي المدفوع:</span><strong>{customer.totalDeposit.toLocaleString()} ج.م</strong></div>
                                    <div className={`financial-item ${hasRemaining ? 'text-red highlight-remaining' : 'text-green'}`}>
                                        <span>المتبقي للاستلام:</span><strong>{customer.totalRemaining.toLocaleString()} ج.م</strong>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
