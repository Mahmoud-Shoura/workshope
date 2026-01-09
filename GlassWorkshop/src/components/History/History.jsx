import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './History.css';

export function History() {
    const { orders } = useGlassStore();

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
        message += `*إجمالي المساحة:* ${order.totalArea?.toFixed(2)} م²\n`;
        message += `*الإجمالي:* ${order.totalCost?.toFixed(2)} ج.م\n\n`;
        message += `_التاريخ: ${new Date(order.date).toLocaleDateString('ar-EG')}_`;

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

    if (!orders || orders.length === 0) {
        return (
            <div className="history-empty">
                <h2>سجل الطلبات فارغ</h2>
                <p>الحسابات المحفوظة ستظهر هنا.</p>
            </div>
        );
    }

    return (
        <div className="history-container">
            <h2>سجل الطلبات</h2>

            {/* Desktop Table View */}
            <div className="history-table-wrapper">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>العميل</th>
                            <th>الأبعاد والكمية</th>
                            <th>النوع</th>
                            <th>السعر</th>
                            <th>واتساب</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id}>
                                <td className="history-date">
                                    {new Date(order.date).toLocaleDateString('ar-EG')} {new Date(order.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="history-customer">
                                    {order.customerName || '-'}
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
                                <td className="history-price">
                                    {order.totalCost?.toLocaleString()} ج.م
                                </td>
                                <td className="history-actions">
                                    <button
                                        onClick={() => handleSendWhatsApp(order)}
                                        className="btn-whatsapp-small"
                                        disabled={!order.phoneNumber}
                                        title={order.phoneNumber ? 'إرسال عبر واتساب' : 'لا يوجد رقم هاتف'}
                                    >
                                        <MessageCircle size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="history-mobile-cards">
                {orders.map((order) => (
                    <div key={order.id} className="history-card">
                        <div className="history-card-header">
                            <div>
                                <h3>{order.customerName || 'بدون اسم'}</h3>
                                <p className="history-card-date">
                                    {new Date(order.date).toLocaleDateString('ar-EG')} - {new Date(order.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div className="history-card-header-actions">
                                <div className="history-card-price">
                                    {order.totalCost?.toLocaleString()} ج.م
                                </div>
                                <button
                                    onClick={() => handleSendWhatsApp(order)}
                                    className="btn-whatsapp-card"
                                    disabled={!order.phoneNumber}
                                    title={order.phoneNumber ? 'إرسال عبر واتساب' : 'لا يوجد رقم هاتف'}
                                >
                                    <MessageCircle size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="history-card-items">
                            {order.items?.map((item, idx) => (
                                <div key={idx} className="history-card-item">
                                    <span>{item.typeName}</span>
                                    <span>{item.length}x{item.width} ({item.qty})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
