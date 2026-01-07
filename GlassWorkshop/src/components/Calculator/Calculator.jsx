import React, { useState, useEffect } from 'react';
import { Plus, Trash, Calculator as CalcIcon, Save, Printer } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import { cn } from '../../lib/utils';
import './Calculator.css';

export function Calculator() {
    const { glassTypes, saveOrder } = useGlassStore();
    const [rows, setRows] = useState([
        { id: Date.now(), length: '', width: '', qty: 1, typeId: glassTypes[0]?.id || '' }
    ]);
    const [customerName, setCustomerName] = useState('');

    // Update default type if types change and current selection is invalid
    useEffect(() => {
        setRows(prevRows => prevRows.map(row => {
            if (!glassTypes.find(t => t.id === row.typeId) && glassTypes.length > 0) {
                return { ...row, typeId: glassTypes[0].id };
            }
            return row;
        }));
    }, [glassTypes]);

    const addRow = () => {
        setRows([...rows, { id: Date.now(), length: '', width: '', qty: 1, typeId: glassTypes[0]?.id || '' }]);
    };

    const updateRow = (id, field, value) => {
        setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const deleteRow = (id) => {
        if (rows.length > 1) {
            setRows(rows.filter(row => row.id !== id));
        }
    };

    const calculateRow = (row) => {
        const type = glassTypes.find(t => t.id === row.typeId);
        if (!type) return { area: 0, cost: 0 };

        // Length/Width in cm -> Area in m2
        const areaM2 = (Number(row.length) * Number(row.width)) / 10000;
        const totalArea = areaM2 * Number(row.qty);

        const cost = type.unit === 'm2'
            ? totalArea * type.price
            : Number(row.qty) * type.price;

        return { area: totalArea, cost };
    };

    const totals = rows.reduce((acc, row) => {
        const { area, cost } = calculateRow(row);
        return { area: acc.area + area, cost: acc.cost + cost };
    }, { area: 0, cost: 0 });

    const handleSave = () => {
        if (!customerName) return alert('برجاء إدخال اسم العميل');
        saveOrder({
            customerName,
            items: rows.map(r => ({ ...r, ...calculateRow(r), typeName: glassTypes.find(t => t.id === r.typeId)?.name })),
            totalCost: totals.cost,
            totalArea: totals.area
        });
        alert('تم حفظ الطلب بنجاح!');
        setRows([{ id: Date.now(), length: '', width: '', qty: 1, typeId: glassTypes[0]?.id || '' }]);
        setCustomerName('');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 animate-fade-in mx-auto w-full max-w-4xl">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-primary/20">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-xl text-primary-foreground shadow-lg">
                        <CalcIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">حاسبة الزجاج</h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <input
                        placeholder="اسم العميل"
                        className="border border-primary/20 p-3 rounded-xl bg-background/50 backdrop-blur-sm flex-1 md:w-64 focus:ring-2 ring-primary/30 outline-none transition-all shadow-sm hover:shadow-md"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="flex-1 sm:flex-none bg-gradient-to-r from-primary to-accent text-primary-foreground px-5 py-3 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                            <Save className="w-4 h-4 ml-2" /> حفظ
                        </button>
                        <button onClick={handlePrint} className="flex-1 sm:flex-none bg-secondary/80 backdrop-blur-sm text-secondary-foreground px-5 py-3 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200">
                            <Printer className="w-4 h-4 ml-2" /> طباعة
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-card/90 backdrop-blur-xl border border-primary/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gradient-to-r from-primary/10 to-accent/10 text-foreground text-xs font-bold">
                            <tr>
                                <th className="px-4 py-3 min-w-[150px]">النوع</th>
                                <th className="px-4 py-3 w-28">طول (سم)</th>
                                <th className="px-4 py-3 w-28">عرض (سم)</th>
                                <th className="px-4 py-3 w-24">العدد</th>
                                <th className="px-4 py-3">المساحة (م²)</th>
                                <th className="px-4 py-3">التكلفة (ج.م)</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rows.map((row) => {
                                const { area, cost } = calculateRow(row);
                                return (
                                    <tr key={row.id} className="bg-background hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-2">
                                            <select
                                                className="w-full p-2 bg-transparent border rounded-md focus:border-primary outline-none"
                                                value={row.typeId}
                                                onChange={(e) => updateRow(row.id, 'typeId', e.target.value)}
                                            >
                                                {glassTypes.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name} ({t.price})</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-full p-2 bg-transparent border rounded-md focus:border-primary outline-none"
                                                value={row.length}
                                                onChange={(e) => updateRow(row.id, 'length', e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-full p-2 bg-transparent border rounded-md focus:border-primary outline-none"
                                                value={row.width}
                                                onChange={(e) => updateRow(row.id, 'width', e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-full p-2 bg-transparent border rounded-md focus:border-primary outline-none"
                                                value={row.qty}
                                                onChange={(e) => updateRow(row.id, 'qty', e.target.value)}
                                                min="1"
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-mono text-muted-foreground">
                                            {area.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 font-mono font-bold text-primary">
                                            {cost.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                onClick={() => deleteRow(row.id)}
                                                className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                                                disabled={rows.length === 1}
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-4 p-4">
                    {rows.map((row, index) => {
                        const { area, cost } = calculateRow(row);
                        return (
                            <div key={row.id} className="bg-background/80 backdrop-blur-sm border border-primary/10 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 space-y-3 relative">
                                <div className="absolute top-4 left-4">
                                    <button
                                        onClick={() => deleteRow(row.id)}
                                        className="text-muted-foreground hover:text-destructive p-1"
                                        disabled={rows.length === 1}
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="font-bold text-sm text-muted-foreground mb-2"># {index + 1}</div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">النوع</label>
                                    <select
                                        className="w-full p-2 bg-transparent border rounded-md"
                                        value={row.typeId}
                                        onChange={(e) => updateRow(row.id, 'typeId', e.target.value)}
                                    >
                                        {glassTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.price})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">الطول</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 bg-transparent border rounded-md"
                                            value={row.length}
                                            onChange={(e) => updateRow(row.id, 'length', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">العرض</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 bg-transparent border rounded-md"
                                            value={row.width}
                                            onChange={(e) => updateRow(row.id, 'width', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">العدد</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 bg-transparent border rounded-md"
                                            value={row.qty}
                                            onChange={(e) => updateRow(row.id, 'qty', e.target.value)}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t">
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">المساحة: </span>
                                        <span className="font-mono">{area.toFixed(2)} م²</span>
                                    </div>
                                    <div className="text-sm font-bold text-primary">
                                        {cost.toFixed(2)} ج.م
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-gradient-to-r from-primary/5 to-accent/5 backdrop-blur-xl p-5 border-t border-primary/20 sticky bottom-0">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <button
                            onClick={addRow}
                            className="w-full sm:w-auto flex items-center justify-center text-primary-foreground bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary hover:to-accent px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-200"
                        >
                            <Plus className="w-4 h-4 ml-2" /> إضافة بند
                        </button>

                        <div className="flex gap-6 text-lg">
                            <div className="text-muted-foreground">
                                <span className="text-sm ml-2">الإجمالي (م²):</span>
                                <span className="font-mono font-bold">{totals.area.toFixed(2)}</span>
                            </div>
                            <div className="text-primary">
                                <span className="text-sm ml-2">الإجمالي (ج.م):</span>
                                <span className="font-mono font-bold text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{totals.cost.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
