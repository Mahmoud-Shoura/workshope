import React, { useState, useEffect } from 'react';
import { MessageCircle, ArrowRight, Trash2, Search, User, Calendar, DollarSign } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './History.css';

export function History() {
    const { orders, deleteOrder } = useGlassStore();
    const [selectedCustomerName, setSelectedCustomerName] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const formatWhatsAppMessage = (order) => {
        let message = `*فاتورة زجاج - ${order.customerName || 'عميل'}*\n\n`;

        order.items?.forEach((item, index) => {
            message += `${index + 1}. *${item.typeName}*\n`;
            message += `   الأبعاد: ${item.length} × ${item.width} سم\n`;
            message += `   الكمية: ${item.qty}\n`;
            message += `   المساحة: ${item.area.toFixed(2)} م²\n`;
            message += `   السعر: ${item.cost.toFixed(2)} ج.م\n\n`;
        });

        message += `━━━━━━━━━━━━━━━━\n`;
        message += `*المساحة الكلية:* ${order.totalArea?.toFixed(2)} م²\n`;

        if (order.baseCost !== undefined) {
            message += `*إجمالي سعر الزجاج:* ${order.baseCost.toFixed(2)} ج.م\n`;
        } else {
            const computedBase = order.items?.reduce((sum, item) => sum + item.cost, 0) || order.totalCost || 0;
            message += `*إجمالي سعر الزجاج:* ${computedBase.toFixed(2)} ج.م\n`;
        }

        if (order.adjustments && order.adjustments.length > 0) {
            message += `--- الرسوم والخصومات ---\n`;
            order.adjustments.forEach(adj => {
                const prefix = adj.amount >= 0 ? '+' : '';
                message += `${adj.name}: ${prefix}${adj.amount.toFixed(2)} ج.م\n`;
            });
            message += `━━━━━━━━━━━━━━━━\n`;
        }

        const deposit = order.deposit || 0;
        const remaining = order.remainingBalance !== undefined ? order.remainingBalance : (order.totalCost - deposit);

        message += `*الإجمالي المطلوب:* ${order.totalCost?.toFixed(2)} ج.م\n`;
        message += `*العربون/المقدم:* ${deposit.toFixed(2)} ج.م\n`;
        message += `*المتبقي للاستلام:* ${remaining.toFixed(2)} ج.م\n\n`;
        message += `_التاريخ: ${new Date(order.date).toLocaleDateString('ar-EG')}_\n`;
        message += `_شكراً لتعاملكم معنا ورشة الزجاج الحديثة_`;

        return message;
    };

    const handleSendWhatsApp = (order) => {
        if (!order.phoneNumber) {
            alert('لا يوجد رقم هاتف محفوظ لهذا الطلب');
            return;
        }

        const message = formatWhatsAppMessage(order);
        const phone = order.phoneNumber.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

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
            const rawName = (order.customerName || '').trim();
            const name = rawName || 'عميل نقدي / بدون اسم';
            if (!groups[name]) {
                groups[name] = {
                    customerName: name,
                    isNameless: !rawName,
                    phoneNumber: order.phoneNumber || '',
                    ordersCount: 0,
                    totalCost: 0,
                    totalDeposit: 0,
                    totalRemaining: 0,
                    orders: []
                };
            }
            groups[name].ordersCount += 1;
            groups[name].totalCost += order.totalCost || 0;
            const dep = order.deposit || 0;
            groups[name].totalDeposit += dep;
            groups[name].totalRemaining += (order.remainingBalance !== undefined ? order.remainingBalance : (order.totalCost - dep));
            groups[name].orders.push(order);

            if (order.phoneNumber && !groups[name].phoneNumber) {
                groups[name].phoneNumber = order.phoneNumber;
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

                <h3>تفاصيل الفواتير والمعاملات</h3>

                {/* Desktop View */}
                <div className="history-table-wrapper">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>التاريخ</th>
                                <th>الأبعاد والكمية</th>
                                <th>نوع الزجاج</th>
                                <th>تفاصيل الحساب</th>
                                <th>العربون والمتبقي</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOrders.map((order) => {
                                const dep = order.deposit || 0;
                                const rem = order.remainingBalance !== undefined ? order.remainingBalance : (order.totalCost - dep);
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
                                                        {item.length}x{item.width} / {item.qty}
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
                                                <div className="final-price">{order.totalCost?.toLocaleString()} ج.م</div>
                                                {order.adjustments && order.adjustments.length > 0 && (
                                                    <div className="adjustments-tooltip">
                                                        <span>الزجاج: {order.baseCost?.toLocaleString()} ج.م</span>
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
                                                    disabled={!order.phoneNumber}
                                                    title={order.phoneNumber ? 'إرسال عبر واتساب' : 'لا يوجد رقم هاتف'}
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="btn-delete-small"
                                                    title="حذف الفاتورة"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
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
                        const dep = order.deposit || 0;
                        const rem = order.remainingBalance !== undefined ? order.remainingBalance : (order.totalCost - dep);
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
                                            {order.totalCost?.toLocaleString()} ج.م
                                        </div>
                                        <div className="actions-flex">
                                            <button
                                                onClick={() => handleSendWhatsApp(order)}
                                                className="btn-whatsapp-card"
                                                disabled={!order.phoneNumber}
                                                title={order.phoneNumber ? 'إرسال عبر واتساب' : 'لا يوجد رقم هاتف'}
                                            >
                                                <MessageCircle size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteOrder(order.id)}
                                                className="btn-delete-card"
                                                title="حذف الفاتورة"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="history-card-items">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="history-card-item">
                                            <span>{item.typeName}</span>
                                            <span>{item.length}x{item.width} ({item.qty})</span>
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
