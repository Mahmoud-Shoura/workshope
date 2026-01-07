import React from 'react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './History.css';

export function History() {
    const { orders } = useGlassStore();

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
                            <div className="history-card-price">
                                {order.totalCost?.toLocaleString()} ج.م
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
