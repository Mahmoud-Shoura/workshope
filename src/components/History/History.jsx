import React, { useState, useEffect } from 'react';
import { MessageCircle, ArrowRight, Trash2, Search, User, Calendar, DollarSign } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './History.css';

export function History() {
    const { orders, deleteOrder, userRole, printSettings } = useGlassStore();
    const isEmployee = userRole === 'employee';
    const [selectedCustomerName, setSelectedCustomerName] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const formatWhatsAppMessage = (order) => {
        const workshopName = printSettings?.workshop_name || 'الورشة الحديثة';
        // Support both snake_case (from DB) and camelCase (legacy)
        const customerName = order.customer_name || order.customerName || 'عميل';
        const totalCost = order.total_cost || order.totalCost || 0;
        const deposit = order.deposit || 0;
        const remaining = order.remaining_balance !== undefined ? order.remaining_balance
            : (order.remainingBalance !== undefined ? order.remainingBalance : (totalCost - deposit));

        let message = `*فاتورة حساب - ${customerName}* (${workshopName})\n\n`;

        order.items?.forEach((item, index) => {
            message += `${index + 1}. *${item.typeName}*\n`;
            if (item.isPiece) {
                if (item.description) {
                    message += `   الوصف: ${item.description}\n`;
                }
                message += `   الكمية: ${item.qty} قطعة\n`;
            } else {
                message += `   الأبعاد: ${item.length} × ${item.width} سم\n`;
                message += `   الكمية: ${item.qty}\n`;
                if (item.isAddLinear) {
                    const perimeter = ((item.length + item.width) * 2 / 100 * item.qty);
                    message += `   المساحة: ${item.area.toFixed(2)} م² + ${perimeter.toFixed(2)} م.ط إضافي\n`;
                } else {
                    message += `   المساحة/الطول: ${item.area.toFixed(2)} م²\n`;
                }
            }
            message += `   السعر: ${item.cost.toFixed(2)} ج.م\n\n`;
        });

        message += `━━━━━━━━━━━━━━━━\n`;
        const totalArea = order.totalArea || order.total_area;
        if (totalArea) message += `*إجمالي المساحة:* ${Number(totalArea).toFixed(2)} م²\n`;

        const baseCost = order.baseCost || order.base_cost;
        if (baseCost !== undefined) {
            message += `*الحساب الأساسي:* ${Number(baseCost).toFixed(2)} ج.م\n`;
        } else {
            const computedBase = order.items?.reduce((sum, item) => sum + item.cost, 0) || totalCost;
            message += `*الحساب الأساسي:* ${Number(computedBase).toFixed(2)} ج.م\n`;
        }

        if (order.adjustments && order.adjustments.length > 0) {
            message += `--- الرسوم والخصومات ---\n`;
            order.adjustments.forEach(adj => {
                const prefix = adj.amount >= 0 ? '+' : '';
                message += `${adj.name}: ${prefix}${adj.amount.toFixed(2)} ج.م\n`;
            });
            message += `━━━━━━━━━━━━━━━━\n`;
        }

        message += `*الإجمالي المطلوب:* ${Number(totalCost).toFixed(2)} ج.م\n`;
        message += `*العربون/المقدم:* ${Number(deposit).toFixed(2)} ج.م\n`;
        message += `*المتبقي للاستلام:* ${Number(remaining).toFixed(2)} ج.م\n\n`;
        message += `_التاريخ: ${new Date(order.date).toLocaleDateString('ar-EG')}_\n`;
        message += `_${printSettings?.footer_note || `شكراً لتعاملكم معنا - ${workshopName}`}_`;

        return message;
    };

    const handleSendWhatsApp = (order) => {
        const phone = order.customer_phone || order.phoneNumber;
        if (!phone) {
            alert('لا يوجد رقم هاتف محفوظ لهذا الطلب');
            return;
        }

        const message = formatWhatsAppMessage(order);
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    };

    const handleDeleteOrder = (id) => {
        if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه المعاملة نهائياً من السجل؟')) {
            deleteOrder(id);
        }
    };

    // Helper to group orders by customer name
    const getGroupedCustomers = () => {
        if (!orders) return [];
        const groups = {};

        orders.forEach(order => {
            // Support both snake_case (from DB) and camelCase (legacy)
            const rawName = (order.customer_name || order.customerName || '').trim();
            const name = rawName || 'عميل نقدي / بدون اسم';
            const phone = order.customer_phone || order.phoneNumber || '';
            const totalCost = Number(order.total_cost || order.totalCost || 0);
            const dep = Number(order.deposit || 0);
            const remaining = order.remaining_balance !== undefined ? Number(order.remaining_balance)
                : (order.remainingBalance !== undefined ? Number(order.remainingBalance) : (totalCost - dep));

            if (!groups[name]) {
                groups[name] = {
                    customerName: name,
                    isNameless: !rawName,
                    phoneNumber: phone,
                    ordersCount: 0,
                    totalCost: 0,
                    totalDeposit: 0,
                    totalRemaining: 0,
                    orders: []
                };
            }
            groups[name].ordersCount += 1;
            groups[name].totalCost += totalCost;
            groups[name].totalDeposit += dep;
            groups[name].totalRemaining += remaining;
            groups[name].orders.push(order);

            if (phone && !groups[name].phoneNumber) {
                groups[name].phoneNumber = phone;
            }
        });

        // Convert to array and filter based on search query
        return Object.values(groups).filter(customer => {
            return customer.customerName.toLowerCase().includes(searchQuery.toLowerCase());
        });
    };

    const groupedCustomers = getGroupedCustomers();
    const selectedCustomer = selectedCustomerName ? groupedCustomers.find(c => c.customerName === selectedCustomerName) : null;

    // Reset selected customer if they no longer have orders (e.g. all deleted)
    useEffect(() => {
        if (selectedCustomerName && !selectedCustomer) {
            setSelectedCustomerName(null);
        }
    }, [orders, selectedCustomerName, selectedCustomer]);

    if (!orders || orders.length === 0) {
        return (
            <div className="history-empty">
                <h2>سجل الطلبات فارغ</h2>
                <p>الحسابات المحفوظة ستظهر هنا.</p>
            </div>
        );
    }

    // 1. Render Detailed Customer View
    if (selectedCustomer) {
        // Sort orders of this customer by date descending
        const sortedOrders = [...selectedCustomer.orders].sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
            <div className="history-container">
                <div className="customer-detail-header">
                    <button 
                        onClick={() => setSelectedCustomerName(null)}
                        className="btn-back"
                    >
                        <ArrowRight size={18} />
                        العودة لقائمة العملاء
                    </button>
                    <div className="customer-info-title">
                        <h2>حسابات العميل: {selectedCustomer.customerName}</h2>
                        {selectedCustomer.phoneNumber && <p className="phone-subtitle">الهاتف: {selectedCustomer.phoneNumber}</p>}
                    </div>
                </div>

                {/* Customer Global Stats Summary */}
                {!isEmployee && (
                    <div className="customer-stats-summary">
                        <div className="stat-card">
                            <span className="stat-label">عدد الفواتير</span>
                            <span className="stat-value">{selectedCustomer.ordersCount}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">إجمالي المطلوب</span>
                            <span className="stat-value">{selectedCustomer.totalCost.toLocaleString()} ج.م</span>
                        </div>
                        <div className="stat-card text-green-card">
                            <span className="stat-label">إجمالي المدفوع (عربون)</span>
                            <span className="stat-value">{selectedCustomer.totalDeposit.toLocaleString()} ج.م</span>
                        </div>
                        <div className="stat-card text-red-card">
                            <span className="stat-label">إجمالي المتبقي</span>
                            <span className="stat-value">{selectedCustomer.totalRemaining.toLocaleString()} ج.م</span>
                        </div>
                    </div>
                )}

                <h3>تفاصيل الفواتير والمعاملات</h3>

                {/* Desktop View */}
                <div className="history-table-wrapper">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>التاريخ</th>
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
                                return (
                                    <tr key={order.id}>
                                        <td className="history-date">
                                            <div>{new Date(order.date).toLocaleDateString('ar-EG')}</div>
                                            <div className="time-sub">{new Date(order.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td>
                                            <div className="history-items">
                                                {order.items?.map((item, idx) => (
                                                    <div key={idx}>
                                                        {item.isPiece ? (item.description || 'قطعة') : `${item.length}x${item.width}`} / {item.qty} {item.isAddLinear ? `(+ م.ط)` : ''}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="history-items">
                                                {order.items?.map((item, idx) => (
                                                    <div key={idx}>
                                                        {item.typeName}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="price-breakdown">
                                                <div className="final-price">{totalCost.toLocaleString()} ج.م</div>
                                                {order.adjustments && order.adjustments.length > 0 && (
                                                    <div className="adjustments-tooltip">
                                                        <span>الأساسي: {Number(baseCost || 0).toLocaleString()} ج.م</span>
                                                        {order.adjustments.map((adj, idx) => (
                                                            <span key={idx}>
                                                                {adj.name}: {adj.amount >= 0 ? '+' : ''}{adj.amount.toLocaleString()} ج.م
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="payment-breakdown">
                                                <div className="deposit-val text-green">المقدم: {dep.toLocaleString()} ج.م</div>
                                                <div className="remaining-val text-red">الباقي: {rem.toLocaleString()} ج.م</div>
                                            </div>
                                        </td>
                                        <td className="history-actions-cell">
                                            <div className="actions-flex">
                                                <button
                                                    onClick={() => handleSendWhatsApp(order)}
                                                    className="btn-whatsapp-small"
                                                    disabled={!phone}
                                                    title={phone ? 'إرسال عبر واتساب' : 'لا يوجد رقم هاتف'}
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                                {!isEmployee && (
                                                    <button
                                                        onClick={() => handleDeleteOrder(order.id)}
                                                        className="btn-delete-small"
                                                        title="حذف الفاتورة"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="history-mobile-cards">
                    {sortedOrders.map((order) => {
                        const totalCost = Number(order.total_cost || order.totalCost || 0);
                        const dep = Number(order.deposit || 0);
                        const rem = order.remaining_balance !== undefined ? Number(order.remaining_balance)
                            : (order.remainingBalance !== undefined ? Number(order.remainingBalance) : (totalCost - dep));
                        const phone = order.customer_phone || order.phoneNumber;
                        return (
                            <div key={order.id} className="history-card">
                                <div className="history-card-header">
                                    <div>
                                        <p className="history-card-date">
                                            {new Date(order.date).toLocaleDateString('ar-EG')} - {new Date(order.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="history-card-header-actions">
                                        <div className="history-card-price">
                                            {totalCost.toLocaleString()} ج.م
                                        </div>
                                        <div className="actions-flex">
                                            <button
                                                onClick={() => handleSendWhatsApp(order)}
                                                className="btn-whatsapp-card"
                                                disabled={!phone}
                                                title={phone ? 'إرسال عبر واتساب' : 'لا يوجد رقم هاتف'}
                                            >
                                                <MessageCircle size={18} />
                                            </button>
                                            {!isEmployee && (
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="btn-delete-card"
                                                    title="حذف الفاتورة"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="history-card-items">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="history-card-item">
                                            <span>{item.typeName}</span>
                                            <span>
                                                {item.isPiece ? 
                                                 (item.description || 'قطعة') : 
                                                 `${item.length}x${item.width}`} ({item.qty}) {item.isAddLinear ? `(+ م.ط)` : ''}
                                            </span>
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
                                        <div className="payment-row text-green">
                                            <span>العربون المدفوع:</span>
                                            <strong>{dep.toLocaleString()} ج.م</strong>
                                        </div>
                                        <div className="payment-row text-red">
                                            <span>المتبقي المطلوب:</span>
                                            <strong>{rem.toLocaleString()} ج.م</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // 2. Render Customers Registry List View
    return (
        <div className="history-container">
            <h2>سجل معاملات العملاء</h2>

            {/* Search Bar */}
            <div className="search-bar-container">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder="ابحث عن اسم العميل..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>

            {groupedCustomers.length === 0 ? (
                <div className="history-empty">
                    <p>لا يوجد عملاء يطابقون بحثك.</p>
                </div>
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
                                    <div className="user-icon-wrapper">
                                        <User size={20} />
                                    </div>
                                    <div className="customer-info">
                                        <h3>{customer.customerName}</h3>
                                        <span className="badge-fats">
                                            {customer.ordersCount} {customer.ordersCount === 1 ? 'فاتورة' : customer.ordersCount === 2 ? 'فاتورتين' : 'فواتير'}
                                        </span>
                                    </div>
                                </div>

                                <div className="card-financials">
                                    <div className="financial-item">
                                        <span>إجمالي الحساب:</span>
                                        <strong>{customer.totalCost.toLocaleString()} ج.م</strong>
                                    </div>
                                    <div className="financial-item text-green">
                                        <span>إجمالي العربون:</span>
                                        <strong>{customer.totalDeposit.toLocaleString()} ج.م</strong>
                                    </div>
                                    <div className={`financial-item ${hasRemaining ? 'text-red highlight-remaining' : 'text-green'}`}>
                                        <span>المتبقي للاستلام:</span>
                                        <strong>{customer.totalRemaining.toLocaleString()} ج.م</strong>
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
