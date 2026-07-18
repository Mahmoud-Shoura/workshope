import React, { useState, useEffect } from 'react';
import { Plus, Trash, Save, Printer, MessageCircle } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './Calculator.css';

export function Calculator() {
    const { glassTypes, customButtons, saveOrder, printSettings } = useGlassStore();
    const [groups, setGroups] = useState([
        { id: 1, typeId: glassTypes[0]?.id || '', inputText: '', isAddLinear: false, linearPrice: '' }
    ]);
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [deposit, setDeposit] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [showPrintSheet, setShowPrintSheet] = useState(false);
    const [activeButtons, setActiveButtons] = useState([]);

    // Compute groups with fallback typeIds if they are deleted from inventory
    const adjustedGroups = groups.map(group => {
        if (!glassTypes.find(t => t.id === group.typeId) && glassTypes.length > 0) {
            return { ...group, typeId: glassTypes[0].id };
        }
        return group;
    });

    const addGroup = () => {
        setGroups([...groups, { id: Date.now(), typeId: glassTypes[0]?.id || '', inputText: '', isAddLinear: false, linearPrice: '' }]);
    };

    const updateGroup = (id, field, value) => {
        setGroups(groups.map(group => group.id === id ? { ...group, [field]: value } : group));
    };

    const deleteGroup = (id) => {
        if (groups.length > 1) {
            setGroups(groups.filter(group => group.id !== id));
        }
    };

    const handleAddPieceRow = (groupId) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        let currentRows = [];
        try {
            if (group.inputText.trim()) {
                currentRows = JSON.parse(group.inputText);
            }
            if (!Array.isArray(currentRows)) currentRows = [];
        } catch (e) {
            if (group.inputText.trim()) {
                currentRows = parseMeasurementsText(group.inputText, true).map(r => ({
                    id: r.id,
                    desc: r.description,
                    qty: r.qty
                }));
            }
        }
        currentRows.push({ id: `${Date.now()}-${Math.random()}`, desc: '', qty: 1 });
        updateGroup(groupId, 'inputText', JSON.stringify(currentRows));
    };

    const handlePieceRowChange = (groupId, index, field, value) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        let currentRows = [];
        try {
            if (group.inputText.trim()) {
                currentRows = JSON.parse(group.inputText);
            }
            if (!Array.isArray(currentRows)) currentRows = [];
        } catch (e) {
            currentRows = parseMeasurementsText(group.inputText, true).map(r => ({
                id: r.id,
                desc: r.description,
                qty: r.qty
            }));
        }
        if (currentRows[index]) {
            currentRows[index][field] = value;
        }
        updateGroup(groupId, 'inputText', JSON.stringify(currentRows));
    };

    const handleRemovePieceRow = (groupId, index) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        let currentRows = [];
        try {
            if (group.inputText.trim()) {
                currentRows = JSON.parse(group.inputText);
            }
            if (!Array.isArray(currentRows)) currentRows = [];
        } catch (e) {
            currentRows = parseMeasurementsText(group.inputText, true).map(r => ({
                id: r.id,
                desc: r.description,
                qty: r.qty
            }));
        }
        currentRows.splice(index, 1);
        updateGroup(groupId, 'inputText', JSON.stringify(currentRows));
    };

    const parseMeasurementsText = (text, isPiece) => {
        if (!text) return [];
        if (isPiece) {
            try {
                const data = JSON.parse(text);
                if (Array.isArray(data)) {
                    return data.map((item, index) => ({
                        id: item.id || `${Date.now()}-${index}-${Math.random()}`,
                        raw: item.desc || '',
                        description: item.desc || '',
                        length: 0,
                        width: 0,
                        qty: isNaN(Number(item.qty)) || Number(item.qty) <= 0 ? 1 : Number(item.qty),
                        isValid: true
                    }));
                }
            } catch (e) {
                // Fallback if not JSON
            }
            // parse line by line
            const lines = text.split(/[\n,;]+/);
            const parsed = [];
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                const numbers = trimmed.match(/\d+(\.\d+)?/g);
                if (numbers && numbers.length > 0) {
                    const qty = parseInt(numbers[numbers.length - 1], 10);
                    const desc = trimmed.replace(numbers[numbers.length - 1], '').replace(/[*xX:-]/g, '').trim();
                    parsed.push({
                        id: `${Date.now()}-${index}-${Math.random()}`,
                        raw: trimmed,
                        description: desc || 'بند قطعة',
                        length: 0,
                        width: 0,
                        qty: isNaN(qty) || qty <= 0 ? 1 : qty,
                        isValid: true
                    });
                } else {
                    parsed.push({
                        id: `${Date.now()}-${index}-${Math.random()}`,
                        raw: trimmed,
                        description: trimmed,
                        length: 0,
                        width: 0,
                        qty: 1,
                        isValid: true
                    });
                }
            });
            return parsed;
        }

        const lines = text.split(/[\n,;+]+/);
        const parsed = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            const numbers = trimmed.match(/\d+(\.\d+)?/g);
            if (numbers && numbers.length >= 2) {
                const length = parseFloat(numbers[0]);
                const width = parseFloat(numbers[1]);
                const qty = numbers[2] ? parseInt(numbers[2], 10) : 1;
                parsed.push({
                    id: `${Date.now()}-${index}-${Math.random()}`,
                    raw: trimmed,
                    length,
                    width,
                    qty: isNaN(qty) || qty <= 0 ? 1 : qty,
                    isValid: true
                });
            } else {
                parsed.push({
                    id: `${Date.now()}-${index}-${Math.random()}`,
                    raw: trimmed,
                    length: 0,
                    width: 0,
                    qty: 0,
                    isValid: false
                });
            }
        });
        return parsed;
    };

    const calculateRow = (length, width, qty, typeId, isAddLinear, linearPrice) => {
        const type = glassTypes.find(t => t.id === typeId);
        if (!type) return { area: 0, cost: 0, extraLinearCost: 0 };

        let area = 0;
        let cost = 0;

        if (type.unit === 'm2') {
            const areaM2 = (length * width) / 10000;
            area = areaM2 * qty;
            cost = area * type.price;
        } else if (type.unit === 'piece') {
            area = 0;
            cost = qty * type.price;
        } else if (type.unit === 'linear_x2') {
            const linearMeters = ((length + width) * 2) / 100;
            area = linearMeters * qty;
            cost = area * type.price;
        } else if (type.unit === 'linear_x4') {
            const linearMeters = ((length + width) * 4) / 100;
            area = linearMeters * qty;
            cost = area * type.price;
        }

        let extraLinearCost = 0;
        if (isAddLinear && type.unit !== 'piece' && Number(linearPrice) > 0) {
            const linearMeters = ((length + width) * 2) / 100 * qty;
            extraLinearCost = linearMeters * Number(linearPrice);
            cost += extraLinearCost;
        }

        return { area, cost, extraLinearCost };
    };

    const getActiveItems = () => {
        const allItems = [];
        adjustedGroups.forEach(group => {
            const type = glassTypes.find(t => t.id === group.typeId);
            const isPiece = type?.unit === 'piece';
            const parsed = parseMeasurementsText(group.inputText, isPiece);
            parsed.forEach(item => {
                if (item.isValid) {
                    const { area, cost, extraLinearCost } = calculateRow(
                        item.length,
                        item.width,
                        item.qty,
                        group.typeId,
                        group.isAddLinear,
                        group.linearPrice
                    );
                    allItems.push({
                        id: item.id,
                        length: item.length,
                        width: item.width,
                        qty: item.qty,
                        typeId: group.typeId,
                        typeName: type?.name || '',
                        description: item.description || '',
                        isPiece,
                        isAddLinear: group.isAddLinear,
                        linearPrice: Number(group.linearPrice) || 0,
                        extraLinearCost,
                        area,
                        cost
                    });
                }
            });
        });
        return allItems;
    };

    const activeItems = getActiveItems();

    const totals = activeItems.reduce((acc, item) => {
        return { area: acc.area + item.area, cost: acc.cost + item.cost };
    }, { area: 0, cost: 0 });

    const baseCost = totals.cost;

    // Calculate details of adjustments applied
    const getAdjustments = (subtotal) => {
        if (!customButtons) return [];
        return customButtons
            .filter(btn => activeButtons.includes(btn.id))
            .map(btn => {
                let amount = 0;
                if (btn.type === 'discount_percent') {
                    amount = - (subtotal * btn.value / 100);
                } else if (btn.type === 'discount_fixed') {
                    amount = - btn.value;
                } else if (btn.type === 'fee_percent') {
                    amount = (subtotal * btn.value / 100);
                } else if (btn.type === 'fee_fixed') {
                    amount = btn.value;
                } else if (btn.type === 'fee_linear_meter') {
                    const totalLinearMeters = activeItems.reduce((sum, item) => sum + (((item.length + item.width) * 2) / 100) * item.qty, 0);
                    amount = totalLinearMeters * btn.value;
                } else if (btn.type === 'fee_per_piece') {
                    const totalQty = activeItems.reduce((sum, item) => sum + item.qty, 0);
                    amount = totalQty * btn.value;
                }
                return {
                    id: btn.id,
                    name: btn.name,
                    type: btn.type,
                    value: btn.value,
                    amount: Math.round(amount * 100) / 100
                };
            });
    };

    const adjustments = getAdjustments(baseCost);
    const totalCostWithAdjustments = baseCost + adjustments.reduce((acc, adj) => acc + adj.amount, 0);

    const formatWhatsAppMessage = () => {
        const workshopName = printSettings?.workshop_name || 'الورشة الحديثة';
        let message = `*فاتورة حساب - ${customerName || 'عميل'}* (${workshopName})\n\n`;

        activeItems.forEach((item, index) => {
            message += `${index + 1}. *${item.typeName}*\n`;
            if (item.isPiece) {
                if (item.description) {
                    message += `   الوصف: ${item.description}\n`;
                }
                message += `   الكمية: ${item.qty} قطعة\n`;
            } else {
                message += `   الأبعاد: ${item.length} × ${item.width} سم\n`;
                message += `   الكمية: ${item.qty}\n`;
                const unitLabel = glassTypes.find(t => t.id === item.typeId)?.unit === 'm2' ? 'م²' : 'م.ط';
                if (item.isAddLinear) {
                    const perimeter = ((item.length + item.width) * 2 / 100 * item.qty);
                    message += `   المساحة: ${item.area.toFixed(2)} ${unitLabel} + ${perimeter.toFixed(2)} م.ط إضافي\n`;
                } else {
                    message += `   المساحة/الطول: ${item.area.toFixed(2)} ${unitLabel}\n`;
                }
            }
            message += `   السعر: ${item.cost.toFixed(2)} ج.م\n\n`;
        });

        message += `━━━━━━━━━━━━━━━━\n`;
        message += `*إجمالي المساحة:* ${totals.area.toFixed(2)} م²\n`;
        message += `*الحساب الأساسي:* ${baseCost.toFixed(2)} ج.م\n`;

        if (adjustments.length > 0) {
            message += `--- الرسوم والخصومات ---\n`;
            adjustments.forEach(adj => {
                const prefix = adj.amount >= 0 ? '+' : '';
                message += `${adj.name}: ${prefix}${adj.amount.toFixed(2)} ج.م\n`;
            });
            message += `━━━━━━━━━━━━━━━━\n`;
        }

        const depositAmount = Number(deposit || 0);
        const remaining = totalCostWithAdjustments - depositAmount;

        message += `*الإجمالي المطلوب:* ${totalCostWithAdjustments.toFixed(2)} ج.م\n`;
        message += `*العربون/المقدم:* ${depositAmount.toFixed(2)} ج.م\n`;
        message += `*المتبقي للاستلام:* ${remaining.toFixed(2)} ج.م\n\n`;
        message += `_التاريخ: ${new Date(orderDate).toLocaleDateString('ar-EG')}_\n`;
        message += `_${printSettings?.footer_note || `شكراً لتعاملكم معنا - ${workshopName}`}_`;

        return message;
    };

    const handleSendWhatsApp = () => {
        if (!phoneNumber) return alert('برجاء إدخال رقم الهاتف');
        if (activeItems.length === 0) return alert('برجاء إدخال أصناف أو مقاسات صحيحة أولاً');

        const message = formatWhatsAppMessage();
        const phone = phoneNumber.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    };

    const handleSave = () => {
        if (!customerName) return alert('برجاء إدخال اسم العميل');
        if (activeItems.length === 0) return alert('برجاء إدخال أصناف أو مقاسات صحيحة أولاً');

        const now = new Date();
        const selectedDate = new Date(orderDate);
        selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

        saveOrder({
            customerName,
            phoneNumber,
            items: activeItems,
            baseCost,
            totalCost: totalCostWithAdjustments,
            totalArea: totals.area,
            adjustments,
            deposit: Number(deposit || 0),
            remainingBalance: totalCostWithAdjustments - Number(deposit || 0),
            date: selectedDate.toISOString()
        });
        alert('تم حفظ الطلب بنجاح!');
        setGroups([{ id: Date.now(), typeId: glassTypes[0]?.id || '', inputText: '', isAddLinear: false, linearPrice: '' }]);
        setCustomerName('');
        setPhoneNumber('');
        setDeposit('');
        setOrderDate(new Date().toISOString().split('T')[0]);
        setActiveButtons([]);
    };

    return (
        <div className="calculator-container">
            {/* Header */}
            <div className="calculator-header no-print">
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
                    <input
                        type="number"
                        placeholder="العربون / المقدم المدفوع (ج.م)"
                        value={deposit}
                        onChange={e => setDeposit(e.target.value)}
                        min="0"
                    />
                    <input
                        type="date"
                        value={orderDate}
                        onChange={e => setOrderDate(e.target.value)}
                        title="تاريخ المعاملة"
                    />
                </div>
                <div className="calculator-buttons">
                    <button onClick={handleSave} className="btn-save" disabled={activeItems.length === 0}>
                        <Save size={16} />
                        حفظ
                    </button>
                    <button onClick={handleSendWhatsApp} className="btn-whatsapp" disabled={activeItems.length === 0}>
                        <MessageCircle size={16} />
                        واتساب
                    </button>
                    <button onClick={() => setShowPrintSheet(true)} className="btn-print" disabled={activeItems.length === 0}>
                        <Printer size={16} />
                        كشف الطباعة
                    </button>
                </div>
            </div>

            {/* Groups Wrapper */}
            <div className="calculator-groups-wrapper no-print">
                {adjustedGroups.map((group, groupIdx) => {
                    const type = glassTypes.find(t => t.id === group.typeId);
                    const isPiece = type?.unit === 'piece';
                    const parsedRows = parseMeasurementsText(group.inputText, isPiece);
                    
                    const groupSubtotal = parsedRows.reduce((acc, r) => {
                        if (!r.isValid) return acc;
                        const { area, cost } = calculateRow(r.length, r.width, r.qty, group.typeId, group.isAddLinear, group.linearPrice);
                        return { area: acc.area + area, cost: acc.cost + cost };
                    }, { area: 0, cost: 0 });

                    return (
                        <div key={group.id} className="calculator-group-card">
                            <div className="calculator-group-header">
                                <div className="group-title-select">
                                    <span className="group-number">المجموعة #{groupIdx + 1}</span>
                                    <select
                                        value={group.typeId}
                                        onChange={(e) => updateGroup(group.id, 'typeId', e.target.value)}
                                        className="group-type-select"
                                    >
                                        {glassTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.price} ج.م / {t.unit === 'm2' ? 'م²' : t.unit === 'piece' ? 'قطعة' : 'م.ط'})</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={() => deleteGroup(group.id)}
                                    className="btn-delete-group"
                                    disabled={groups.length === 1}
                                    title="حذف المجموعة"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>

                            <div className="calculator-group-body">
                                {isPiece ? (
                                    <div className="pieces-editor-container" style={{ width: '100%' }}>
                                        <label className="group-input-label">إدخال بنود القطع:</label>
                                        <table className="pieces-editor-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'right', borderBottom: '1px solid #ccc' }}>
                                                    <th style={{ padding: '8px 4px' }}>#</th>
                                                    <th style={{ padding: '8px 4px' }}>البيان / الوصف (اختياري)</th>
                                                    <th style={{ padding: '8px 4px', width: '120px' }}>العدد (قطع)</th>
                                                    <th style={{ padding: '8px 4px' }}>سعر القطعة</th>
                                                    <th style={{ padding: '8px 4px' }}>الإجمالي</th>
                                                    <th style={{ padding: '8px 4px', width: '50px' }}>إجراء</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedRows.map((row, idx) => {
                                                    const itemPrice = type?.price || 0;
                                                    const totalItemCost = row.qty * itemPrice;
                                                    return (
                                                        <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                                                            <td style={{ padding: '8px 4px' }}>{idx + 1}</td>
                                                            <td style={{ padding: '8px 4px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={row.description || ''}
                                                                    onChange={(e) => handlePieceRowChange(group.id, idx, 'desc', e.target.value)}
                                                                    placeholder="مثال: مقبض، رف، برواز..."
                                                                    className="piece-desc-input"
                                                                    style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '8px 4px' }}>
                                                                <input
                                                                    type="number"
                                                                    value={row.qty}
                                                                    onChange={(e) => handlePieceRowChange(group.id, idx, 'qty', parseInt(e.target.value, 10) || 1)}
                                                                    min="1"
                                                                    className="piece-qty-input"
                                                                    style={{ width: '80px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '8px 4px' }}>{itemPrice.toLocaleString()} ج.م</td>
                                                            <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>{totalItemCost.toLocaleString()} ج.م</td>
                                                            <td style={{ padding: '8px 4px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemovePieceRow(group.id, idx)}
                                                                    className="btn-delete-small"
                                                                    style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer' }}
                                                                >
                                                                    <Trash size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {parsedRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                                                            لا توجد بنود مدخلة بعد. اضغط على الزر بالأسفل لإضافة قطعة.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                        <button
                                            type="button"
                                            onClick={() => handleAddPieceRow(group.id)}
                                            className="btn-add-piece-row-action"
                                            style={{
                                                marginTop: '12px',
                                                padding: '8px 12px',
                                                background: '#1976d2',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <Plus size={14} /> إضافة بند قطعة جديد
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="group-input-section" style={{ width: '100%' }}>
                                            <div className="dual-calc-toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                                <label className="group-input-label">أدخل المقاسات:</label>
                                                <div className="linear-add-toggle-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={group.isAddLinear || false}
                                                            onChange={(e) => updateGroup(group.id, 'isAddLinear', e.target.checked)}
                                                        />
                                                        <span>إضافة حساب متر طولي لهذا المقاس</span>
                                                    </label>
                                                    {group.isAddLinear && (
                                                        <div className="linear-price-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span className="price-input-prefix" style={{ fontSize: '14px' }}>سعر م.ط:</span>
                                                            <input 
                                                                type="number"
                                                                value={group.linearPrice || ''}
                                                                onChange={(e) => updateGroup(group.id, 'linearPrice', e.target.value)}
                                                                placeholder="ج.م"
                                                                className="linear-price-input"
                                                                style={{ width: '85px', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '4px' }}
                                                                min="0"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <textarea
                                                value={group.inputText}
                                                onChange={(e) => updateGroup(group.id, 'inputText', e.target.value)}
                                                placeholder="مثال للتنسيق:&#10;120*80*2 (طول*عرض*عدد)&#10;100*90*1&#10;150x60 (يفترض العدد 1)"
                                                className="group-textarea"
                                                rows={5}
                                            />
                                            <span className="group-input-hint">
                                                اكتب المقاسات بالتنسيق: الطول * العرض * العدد (مثال: 120*80*2 أو 120x80x3) وافصل بينها بسطر جديد.
                                            </span>
                                        </div>

                                        <div className="group-preview-section" style={{ width: '100%', marginTop: '16px' }}>
                                            <label className="group-input-label">كشف الحساب للمجموعة:</label>
                                            {parsedRows.length === 0 ? (
                                                <div className="preview-empty">
                                                    لا توجد مقاسات صحيحة مدخلة بعد.
                                                </div>
                                            ) : (
                                                <div className="preview-table-wrapper">
                                                    <table className="preview-table">
                                                        <thead>
                                                            <tr>
                                                                <th>#</th>
                                                                <th>المقاس (سم)</th>
                                                                <th>العدد</th>
                                                                <th>المساحة ({type?.unit === 'm2' ? 'م²' : 'م.ط'})</th>
                                                                {group.isAddLinear && <th>م.ط إضافي</th>}
                                                                <th>السعر (ج.م)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {parsedRows.map((r, rIdx) => {
                                                                if (!r.isValid) {
                                                                    return (
                                                                        <tr key={r.id} className="preview-row-invalid">
                                                                            <td>{rIdx + 1}</td>
                                                                            <td colSpan={group.isAddLinear ? 5 : 4} className="error-text">
                                                                                تنسيق غير مدعوم: "{r.raw}"
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                }
                                                                const { area, cost } = calculateRow(r.length, r.width, r.qty, group.typeId, group.isAddLinear, group.linearPrice);
                                                                const rowPerimeter = ((r.length + r.width) * 2 / 100) * r.qty;
                                                                return (
                                                                    <tr key={r.id} className="preview-row-valid">
                                                                        <td>{rIdx + 1}</td>
                                                                        <td>{r.length} × {r.width}</td>
                                                                        <td>{r.qty}</td>
                                                                        <td>{area.toFixed(2)}</td>
                                                                        {group.isAddLinear && <td>{rowPerimeter.toFixed(2)} م.ط</td>}
                                                                        <td>{cost.toFixed(2)}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="calculator-group-footer">
                                <div className="group-subtotals">
                                    {!isPiece && (
                                        <span className="subtotal-item">
                                            المساحة: <strong>{groupSubtotal.area.toFixed(2)} م²</strong>
                                        </span>
                                    )}
                                    <span className="subtotal-item">
                                        السعر: <strong>{groupSubtotal.cost.toFixed(2)} ج.م</strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Custom Buttons Section */}
            {customButtons && customButtons.length > 0 && activeItems.length > 0 && (
                <div className="calculator-adjustments-container no-print">
                    <span className="adjustments-section-label">إضافات وتعديلات سريعة:</span>
                    <div className="adjustments-buttons-grid">
                        {customButtons.map(btn => {
                            const isActive = activeButtons.includes(btn.id);
                            let estimatedAmount = 0;
                            if (btn.type === 'discount_percent') {
                                estimatedAmount = - (baseCost * btn.value / 100);
                            } else if (btn.type === 'discount_fixed') {
                                estimatedAmount = - btn.value;
                            } else if (btn.type === 'fee_percent') {
                                estimatedAmount = (baseCost * btn.value / 100);
                            } else if (btn.type === 'fee_fixed') {
                                estimatedAmount = btn.value;
                            } else if (btn.type === 'fee_linear_meter') {
                                const totalLinearMeters = activeItems.reduce((sum, item) => sum + (((item.length + item.width) * 2) / 100) * item.qty, 0);
                                estimatedAmount = totalLinearMeters * btn.value;
                            } else if (btn.type === 'fee_per_piece') {
                                const totalQty = activeItems.reduce((sum, item) => sum + item.qty, 0);
                                estimatedAmount = totalQty * btn.value;
                            }
                            
                            const amountSign = estimatedAmount >= 0 ? '+' : '';
                            const isDiscount = btn.type.startsWith('discount');

                            return (
                                <button
                                    key={btn.id}
                                    type="button"
                                    onClick={() => {
                                        if (isActive) {
                                            setActiveButtons(activeButtons.filter(id => id !== btn.id));
                                        } else {
                                            setActiveButtons([...activeButtons, btn.id]);
                                        }
                                    }}
                                    className={`btn-adjustment ${isActive ? 'active' : ''} ${isDiscount ? 'discount' : 'fee'}`}
                                >
                                    <span className="adjustment-name">{btn.name}</span>
                                    <span className="adjustment-value">
                                        ({amountSign}{Math.round(Math.abs(estimatedAmount))} ج.م)
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bottom Actions */}
            <div className="calculator-footer no-print">
                <button onClick={addGroup} className="btn-add-row">
                    <Plus size={16} />
                    إضافة مجموعة جديدة
                </button>

                <div className="calculator-totals">
                    <div className="total-item">
                        <span className="total-label">إجمالي المساحة:</span>
                        <span className="total-value">{totals.area.toFixed(2)} م²</span>
                    </div>
                    {adjustments.length > 0 && (
                        <div className="total-item base-cost-item">
                            <span className="total-label">الحساب الأساسي:</span>
                            <span className="total-value-small">{baseCost.toFixed(2)} ج.م</span>
                        </div>
                    )}
                    <div className="total-item final-cost-item">
                        <span className="total-label">الحساب الإجمالي:</span>
                        <span className="total-value">{totalCostWithAdjustments.toFixed(2)} ج.م</span>
                    </div>
                    <div className="total-item deposit-item">
                        <span className="total-label">العربون / المقدم:</span>
                        <span className="total-value text-green" style={{ color: '#2e7d32', fontWeight: 'bold' }}>{(Number(deposit || 0)).toFixed(2)} ج.م</span>
                    </div>
                    <div className="total-item remaining-item">
                        <span className="total-label font-bold" style={{ fontWeight: 'bold' }}>المتبقي للاستلام:</span>
                        <span className="total-value font-bold text-red" style={{ color: '#c62828', fontWeight: 'bold' }}>{(totalCostWithAdjustments - Number(deposit || 0)).toFixed(2)} ج.م</span>
                    </div>
                </div>
            </div>

            {/* Printable Sheet Overlay Modal */}
            {showPrintSheet && (
                <div className="printable-sheet-overlay">
                    <div className="printable-sheet-modal print-area">
                        <div className="sheet-header no-print">
                            <h3>شيت معاينة كشف المقاسات والطباعة</h3>
                            <div className="sheet-header-buttons">
                                <button onClick={() => window.print()} className="btn-print-modal">
                                    <Printer size={16} />
                                    طباعة الكشف
                                </button>
                                <button onClick={() => setShowPrintSheet(false)} className="btn-close-modal">
                                    إغلاق
                                </button>
                            </div>
                        </div>

                        <div className="sheet-content">
                            <div className="sheet-print-title">
                                <h2>{printSettings?.workshop_name || 'ورشة العمل الحديثة'}</h2>
                                <p>{printSettings?.tax_number ? `الرقم الضريبي: ${printSettings.tax_number}` : 'كشف تفصيلي بالقياسات وحسابات العميل'}</p>
                            </div>

                            <div className="sheet-info-grid">
                                <div>
                                    <strong>اسم العميل:</strong> {customerName || 'عميل نقدي'}
                                </div>
                                <div>
                                    <strong>رقم الهاتف:</strong> {phoneNumber || printSettings?.phone || '-'}
                                </div>
                                <div>
                                    <strong>التاريخ:</strong> {new Date(orderDate).toLocaleDateString('ar-EG')}
                                </div>
                                {printSettings?.address && (
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <strong>العنوان:</strong> {printSettings.address}
                                    </div>
                                )}
                                {printSettings?.owner_name && (
                                    <div>
                                        <strong>صاحب العمل:</strong> {printSettings.owner_name}
                                    </div>
                                )}
                            </div>

                            {/* Desktop Wide Landscape Sheet (Excel style) */}
                            <div className="sheet-table-wrapper">
                                <table className="sheet-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>الصنف / الخامة</th>
                                            <th>الطول (سم)</th>
                                            <th>العرض (سم)</th>
                                            <th>العدد</th>
                                            <th>المساحة / الوصف</th>
                                            <th>السعر (ج.م)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeItems.map((item, idx) => (
                                            <tr key={item.id}>
                                                <td>{idx + 1}</td>
                                                <td>{item.typeName}</td>
                                                <td>{item.isPiece ? '-' : item.length}</td>
                                                <td>{item.isPiece ? '-' : item.width}</td>
                                                <td>{item.qty}</td>
                                                <td>
                                                    {item.isPiece ? (item.description || 'بالقطعة') : 
                                                     item.isAddLinear ? `${item.area.toFixed(2)} م² + ${((item.length + item.width) * 2 / 100 * item.qty).toFixed(2)} م.ط` : 
                                                     `${item.area.toFixed(2)}`}
                                                </td>
                                                <td>{item.cost.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Portrait Sheet (List/Card style) */}
                            <div className="sheet-mobile-list no-print">
                                {activeItems.map((item, idx) => (
                                    <div key={item.id} className="sheet-mobile-item">
                                        <div className="item-header">
                                            <span className="item-index">#{idx + 1}</span>
                                            <span className="item-type">{item.typeName}</span>
                                        </div>
                                        <div className="item-details">
                                            {item.isPiece ? (
                                                <>
                                                    {item.description && <div><span>البيان:</span> <span>{item.description}</span></div>}
                                                    <div><span>الكمية:</span> <span>{item.qty} قطعة</span></div>
                                                </>
                                            ) : (
                                                <>
                                                    <div><span>الطول:</span> <span>{item.length} سم</span></div>
                                                    <div><span>العرض:</span> <span>{item.width} سم</span></div>
                                                    <div><span>العدد:</span> <span>{item.qty}</span></div>
                                                    <div>
                                                        <span>المساحة:</span> 
                                                        <span>
                                                            {item.isAddLinear ? `${item.area.toFixed(2)} م² + ${((item.length + item.width) * 2 / 100 * item.qty).toFixed(2)} م.ط` : `${item.area.toFixed(2)}`}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                            <div><span>السعر:</span> <span>{item.cost.toFixed(2)} ج.م</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="sheet-totals">
                                <div className="totals-row">
                                    <span>إجمالي المساحة:</span>
                                    <strong>{totals.area.toFixed(2)} م²</strong>
                                </div>
                                <div className="totals-row">
                                    <span>الحساب الأساسي:</span>
                                    <strong>{baseCost.toFixed(2)} ج.م</strong>
                                </div>
                                {adjustments.map(adj => (
                                    <div key={adj.id} className="totals-row sheet-adjustment-row">
                                        <span>{adj.name}:</span>
                                        <strong>{adj.amount >= 0 ? '+' : ''}{adj.amount.toFixed(2)} ج.م</strong>
                                    </div>
                                ))}
                                <div className="totals-row total-price-row">
                                    <span>الحساب الإجمالي المطلوب:</span>
                                    <strong>{totalCostWithAdjustments.toFixed(2)} ج.م</strong>
                                </div>
                                <div className="totals-row sheet-deposit-row" style={{ borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
                                    <span>العربون / المقدم:</span>
                                    <strong>{(Number(deposit || 0)).toFixed(2)} ج.م</strong>
                                </div>
                                <div className="totals-row sheet-remaining-row" style={{ fontWeight: 'bold' }}>
                                    <span>المتبقي للاستلام:</span>
                                    <strong style={{ color: '#c62828' }}>{(totalCostWithAdjustments - Number(deposit || 0)).toFixed(2)} ج.م</strong>
                                </div>
                            </div>

                            <div className="sheet-footer-note">
                                <p>{printSettings?.footer_note || `نشكركم لتعاملكم معنا - ${printSettings?.workshop_name || 'ورشة العمل الحديثة'}`}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
