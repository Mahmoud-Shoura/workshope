import React from 'react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './History.css';

export function History() {
    const { orders } = useGlassStore();

    if (!orders || orders.length === 0) {
        return (
            <div className="text-center py-20 text-muted-foreground animate-fade-in">
                <h2 className="text-xl font-medium">سجل الطلبات فارغ</h2>
                <p className="mt-2">الحسابات المحفوظة ستظهر هنا.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in mx-auto w-full max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight px-1">سجل الطلبات</h2>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border bg-card text-card-foreground shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-muted/50 text-muted-foreground text-xs font-bold">
                        <tr>
                            <th className="px-6 py-4">التاريخ</th>
                            <th className="px-6 py-4">العميل</th>
                            <th className="px-6 py-4">الأبعاد والكمية</th>
                            <th className="px-6 py-4">النوع</th>
                            <th className="px-6 py-4">السعر</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-mono">
                                    {new Date(order.date).toLocaleDateString('ar-EG')} {new Date(order.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-4 font-medium">
                                    {order.customerName || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="text-xs text-muted-foreground">
                                                {item.length}x{item.width} <span className="opacity-50">/</span> {item.qty}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="text-xs">
                                                {item.typeName}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-primary font-mono">
                                    {order.totalCost?.toLocaleString()} ج.م
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {orders.map((order) => (
                    <div key={order.id} className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start border-b pb-3">
                            <div>
                                <h3 className="font-bold">{order.customerName || 'بدون اسم'}</h3>
                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                    {new Date(order.date).toLocaleDateString('ar-EG')} - {new Date(order.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div className="font-bold text-primary text-lg font-mono">
                                {order.totalCost?.toLocaleString()} ج.م
                            </div>
                        </div>

                        <div className="space-y-2">
                            {order.items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm bg-muted/20 p-2 rounded-lg">
                                    <span className="font-medium">{item.typeName}</span>
                                    <span className="text-muted-foreground font-mono" dir="ltr">{item.length}x{item.width} ({item.qty})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
