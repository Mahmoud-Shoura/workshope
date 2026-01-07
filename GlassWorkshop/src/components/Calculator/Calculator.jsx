import React, { useState, useEffect } from 'react';
import { Plus, Trash, Save, Printer } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
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
        <div className="calculator-container print-area">
            {/* Header */}
            <div className="calculator-header">
                <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                />
                <div className="calculator-buttons">
                    <button onClick={handleSave} className="btn-save">
                        <Save size={16} />
                        Save
                    </button>
                    <button onClick={handlePrint} className="btn-print">
                        <Printer size={16} />
                        Print
                    </button>
                </div>
            </div>

            {/* Table Wrapper */}
            <div className="calculator-table-wrapper">
                {/* Desktop Table View */}
                <table className="calculator-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>L (cm)</th>
                            <th>W (cm)</th>
                            <th>Qty</th>
                            <th>Area (m²)</th>
                            <th>Cost (EGP)</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const { area, cost } = calculateRow(row);
                            return (
                                <tr key={row.id}>
                                    <td>
                                        <select
                                            value={row.typeId}
                                            onChange={(e) => updateRow(row.id, 'typeId', e.target.value)}
                                        >
                                            {glassTypes.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.price})</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={row.length}
                                            onChange={(e) => updateRow(row.id, 'length', e.target.value)}
                                            placeholder="0"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={row.width}
                                            onChange={(e) => updateRow(row.id, 'width', e.target.value)}
                                            placeholder="0"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={row.qty}
                                            onChange={(e) => updateRow(row.id, 'qty', e.target.value)}
                                            min="1"
                                        />
                                    </td>
                                    <td>{area.toFixed(2)}</td>
                                    <td>{cost.toFixed(2)}</td>
                                    <td>
                                        <button
                                            onClick={() => deleteRow(row.id)}
                                            className="btn-delete"
                                            disabled={rows.length === 1}
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="calculator-mobile-cards">
                    {rows.map((row, index) => {
                        const { area, cost } = calculateRow(row);
                        return (
                            <div key={row.id} className="calculator-card">
                                <div className="calculator-card-header">
                                    <span className="calculator-card-number">#{index + 1}</span>
                                    <button
                                        onClick={() => deleteRow(row.id)}
                                        className="btn-delete"
                                        disabled={rows.length === 1}
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>

                                <div className="calculator-card-field">
                                    <label className="calculator-card-label">النوع</label>
                                    <select
                                        value={row.typeId}
                                        onChange={(e) => updateRow(row.id, 'typeId', e.target.value)}
                                    >
                                        {glassTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.price})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="calculator-card-inputs">
                                    <div className="calculator-card-field">
                                        <label className="calculator-card-label">الطول</label>
                                        <input
                                            type="number"
                                            value={row.length}
                                            onChange={(e) => updateRow(row.id, 'length', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="calculator-card-field">
                                        <label className="calculator-card-label">العرض</label>
                                        <input
                                            type="number"
                                            value={row.width}
                                            onChange={(e) => updateRow(row.id, 'width', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="calculator-card-field">
                                        <label className="calculator-card-label">العدد</label>
                                        <input
                                            type="number"
                                            value={row.qty}
                                            onChange={(e) => updateRow(row.id, 'qty', e.target.value)}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div className="calculator-card-footer">
                                    <span className="calculator-card-area">المساحة: {area.toFixed(2)} م²</span>
                                    <span className="calculator-card-cost">{cost.toFixed(2)} ج.م</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="calculator-footer">
                    <button onClick={addRow} className="btn-add-row">
                        <Plus size={16} />
                        Add Row
                    </button>

                    <div className="calculator-totals">
                        <div className="total-item">
                            <span className="total-label">{totals.area.toFixed(2)} m²</span>
                        </div>
                        <div className="total-item">
                            <span className="total-value">{totals.cost.toFixed(2)} EGP</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
