import React, { useState, useEffect } from 'react';
import { Plus, Trash, Save, Printer, MessageCircle } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import { VoiceInput } from '../VoiceInput/VoiceInput';
import './Calculator.css';

export function Calculator() {
    const { glassTypes, saveOrder } = useGlassStore();
    const [rows, setRows] = useState([
        { id: Date.now(), length: '', width: '', qty: 1, typeId: glassTypes[0]?.id || '' }
    ]);
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

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

        const length = Number(row.length);
        const width = Number(row.width);
        const qty = Number(row.qty);

        let area = 0;
        let cost = 0;

        if (type.unit === 'm2') {
            // المتر المربع: المساحة بالمتر المربع
            const areaM2 = (length * width) / 10000;
            area = areaM2 * qty;
            cost = area * type.price;
        } else if (type.unit === 'piece') {
            // بالقطعة: الكمية فقط
            const areaM2 = (length * width) / 10000;
            area = areaM2 * qty;
            cost = qty * type.price;
        } else if (type.unit === 'linear_x2') {
            // متر طولي ×2: (الطول + العرض) × 2
            const linearMeters = ((length + width) * 2) / 100; // تحويل من سم إلى متر
            area = linearMeters * qty;
            cost = area * type.price;
        } else if (type.unit === 'linear_x4') {
            // متر طولي ×4: (الطول + العرض) × 4
            const linearMeters = ((length + width) * 4) / 100; // تحويل من سم إلى متر
            area = linearMeters * qty;
            cost = area * type.price;
        }

        return { area, cost };
    };


    const totals = rows.reduce((acc, row) => {
        const { area, cost } = calculateRow(row);
        return { area: acc.area + area, cost: acc.cost + cost };
    }, { area: 0, cost: 0 });

    const formatWhatsAppMessage = () => {
        let message = `*فاتورة زجاج - ${customerName || 'عميل'}*\n\n`;

        rows.forEach((row, index) => {
            const type = glassTypes.find(t => t.id === row.typeId);
            const { area, cost } = calculateRow(row);
            const unitLabel = type?.unit === 'm2' ? 'م²' :
                type?.unit === 'piece' ? 'قطعة' :
                    type?.unit === 'linear_x2' ? 'م.ط' :
                        'م.ط';

            message += `${index + 1}. *${type?.name}*\n`;
            message += `   الأبعاد: ${row.length} × ${row.width} سم\n`;
            message += `   الكمية: ${row.qty}\n`;
            message += `   ${type?.unit === 'piece' ? 'المساحة' : 'الطول'}: ${area.toFixed(2)} ${unitLabel}\n`;
            message += `   السعر: ${cost.toFixed(2)} ج.م\n\n`;
        });

        message += `━━━━━━━━━━━━━━━━\n`;
        message += `*الإجمالي الكلي:* ${totals.area.toFixed(2)}\n`;
        message += `*الإجمالي:* ${totals.cost.toFixed(2)} ج.م`;

        return message;
    };

    const handleSendWhatsApp = () => {
        if (!phoneNumber) return alert('برجاء إدخال رقم الهاتف');

        const message = formatWhatsAppMessage();
        const phone = phoneNumber.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    };

    const handleSave = () => {
        if (!customerName) return alert('برجاء إدخال اسم العميل');
        saveOrder({
            customerName,
            phoneNumber,
            items: rows.map(r => ({ ...r, ...calculateRow(r), typeName: glassTypes.find(t => t.id === r.typeId)?.name })),
            totalCost: totals.cost,
            totalArea: totals.area
        });
        alert('تم حفظ الطلب بنجاح!');
        setRows([{ id: Date.now(), length: '', width: '', qty: 1, typeId: glassTypes[0]?.id || '' }]);
        setCustomerName('');
        setPhoneNumber('');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleVoiceInput = (rowId, measurements) => {
        updateRow(rowId, 'length', measurements.length.toString());
        updateRow(rowId, 'width', measurements.width.toString());
        updateRow(rowId, 'qty', measurements.qty.toString());
    };

    return (
        <div className="calculator-container print-area">
            {/* Header */}
            <div className="calculator-header">
                <div className="calculator-inputs">
                    <input
                        type="text"
                        placeholder="اسم العميل"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                    />
                    <input
                        type="tel"
                        placeholder="رقم الهاتف (واتساب)"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        dir="ltr"
                    />
                </div>
                <div className="calculator-buttons">
                    <button onClick={handleSave} className="btn-save">
                        <Save size={16} />
                        حفظ
                    </button>
                    <button onClick={handleSendWhatsApp} className="btn-whatsapp">
                        <MessageCircle size={16} />
                        واتساب
                    </button>
                    <button onClick={handlePrint} className="btn-print">
                        <Printer size={16} />
                        طباعة
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
                            <th>Voice</th>
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
                                        <VoiceInput
                                            rowId={row.id}
                                            onMeasurementsDetected={(measurements) => handleVoiceInput(row.id, measurements)}
                                        />
                                    </td>
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

                                <div className="calculator-card-voice">
                                    <VoiceInput
                                        rowId={row.id}
                                        onMeasurementsDetected={(measurements) => handleVoiceInput(row.id, measurements)}
                                    />
                                    <span className="voice-hint">أو اضغط للإدخال الصوتي</span>
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
