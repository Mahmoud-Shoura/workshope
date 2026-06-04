import React, { useState, useEffect } from 'react';
import { Plus, Trash, Save, Printer, MessageCircle } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './Calculator.css';

export function Calculator() {
    const { glassTypes, customButtons, saveOrder } = useGlassStore();
    const [groups, setGroups] = useState([
        { id: 1, typeId: glassTypes[0]?.id || '', inputText: '' }
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
        setGroups([...groups, { id: Date.now(), typeId: glassTypes[0]?.id || '', inputText: '' }]);
    };

    const updateGroup = (id, field, value) => {
        setGroups(groups.map(group => group.id === id ? { ...group, [field]: value } : group));
    };

    const deleteGroup = (id) => {
        if (groups.length > 1) {
            setGroups(groups.filter(group => group.id !== id));
        }
    };

    const parseMeasurementsText = (text) => {
        if (!text) return [];
        // Split by newline, comma, semicolon, or plus
        const lines = text.split(/[\n,;+]+/);
        const parsed = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Find all numeric values (including decimals) in the line
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

    const calculateRow = (length, width, qty, typeId) => {
        const type = glassTypes.find(t => t.id === typeId);
        if (!type) return { area: 0, cost: 0 };

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

    // Flatten all valid items from all groups for global actions
    const getActiveItems = () => {
        const allItems = [];
        adjustedGroups.forEach(group => {
            const parsed = parseMeasurementsText(group.inputText);
            parsed.forEach(item => {
                if (item.isValid) {
                    const { area, cost } = calculateRow(item.length, item.width, item.qty, group.typeId);
                    allItems.push({
                        id: item.id,
                        length: item.length,
                        width: item.width,
                        qty: item.qty,
                        typeId: group.typeId,
                        typeName: glassTypes.find(t => t.id === group.typeId)?.name || '',
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
        let message = `*فاتورة زجاج - ${customerName || 'عميل'}*\n\n`;

        activeItems.forEach((item, index) => {
            const type = glassTypes.find(t => t.id === item.typeId);
            const unitLabel = type?.unit === 'm2' ? 'م²' :
                type?.unit === 'piece' ? 'قطعة' :
                    type?.unit === 'linear_x2' ? 'م.ط' :
                        'م.ط';

            message += `${index + 1}. *${item.typeName}*\n`;
            message += `   الأبعاد: ${item.length} × ${item.width} سم\n`;
            message += `   الكمية: ${item.qty}\n`;
            message += `   ${type?.unit === 'piece' ? 'المساحة' : 'الطول'}: ${item.area.toFixed(2)} ${unitLabel}\n`;
            message += `   السعر: ${item.cost.toFixed(2)} ج.م\n\n`;
        });

        message += `━━━━━━━━━━━━━━━━\n`;
        message += `*المساحة الكلية:* ${totals.area.toFixed(2)} م²\n`;
        message += `*إجمالي سعر الزجاج:* ${baseCost.toFixed(2)} ج.م\n`;

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
        message += `_شكراً لتعاملكم معنا ورشة الزجاج الحديثة_`;

        return message;
    };

    const handleSendWhatsApp = () => {
        if (!phoneNumber) return alert('برجاء إدخال رقم الهاتف');
        if (activeItems.length === 0) return alert('برجاء إدخال مقاسات صحيحة أولاً');

        const message = formatWhatsAppMessage();
        const phone = phoneNumber.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    };

    const handleSave = () => {
        if (!customerName) return alert('برجاء إدخال اسم العميل');
        if (activeItems.length === 0) return alert('برجاء إدخال مقاسات صحيحة أولاً');

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
        setGroups([{ id: Date.now(), typeId: glassTypes[0]?.id || '', inputText: '' }]);
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
                    const parsedRows = parseMeasurementsText(group.inputText);
                    
                    const groupSubtotal = parsedRows.reduce((acc, r) => {
                        if (!r.isValid) return acc;
                        const { area, cost } = calculateRow(r.length, r.width, r.qty, group.typeId);
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
                                            <option key={t.id} value={t.id}>{t.name} ({t.price} ج.م / {t.unit === 'm2' ? 'م²' : 'قطعة'})</option>
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
                                <div className="group-input-section">
                                    <label className="group-input-label">أدخل المقاسات:</label>
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

                                <div className="group-preview-section">
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
                                                        <th>المساحة</th>
                                                        <th>السعر (ج.م)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parsedRows.map((r, rIdx) => {
                                                        if (!r.isValid) {
                                                            return (
                                                                <tr key={r.id} className="preview-row-invalid">
                                                                    <td>{rIdx + 1}</td>
                                                                    <td colSpan={4} className="error-text">
                                                                        تنسيق غير مدعوم: "{r.raw}"
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }
                                                        const { area, cost } = calculateRow(r.length, r.width, r.qty, group.typeId);
                                                        return (
                                                            <tr key={r.id} className="preview-row-valid">
                                                                <td>{rIdx + 1}</td>
                                                                <td>{r.length} × {r.width}</td>
                                                                <td>{r.qty}</td>
                                                                <td>{area.toFixed(2)}</td>
                                                                <td>{cost.toFixed(2)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="calculator-group-footer">
                                <div className="group-subtotals">
                                    <span className="subtotal-item">
                                        المساحة: <strong>{groupSubtotal.area.toFixed(2)} م²</strong>
                                    </span>
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
                    إضافة مجموعة زجاج
                </button>

                <div className="calculator-totals">
                    <div className="total-item">
                        <span className="total-label">إجمالي المساحة:</span>
                        <span className="total-value">{totals.area.toFixed(2)} م²</span>
                    </div>
                    {adjustments.length > 0 && (
                        <div className="total-item base-cost-item">
                            <span className="total-label">سعر الزجاج:</span>
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
                                <h2>ورشة الزجاج الحديثة</h2>
                                <p>كشف تفصيلي بمقاسات وحسابات زجاج للعميل</p>
                            </div>

                            <div className="sheet-info-grid">
                                <div>
                                    <strong>اسم العميل:</strong> {customerName || 'عميل نقدي'}
                                </div>
                                <div>
                                    <strong>رقم الهاتف:</strong> {phoneNumber || '-'}
                                </div>
                                <div>
                                    <strong>التاريخ:</strong> {new Date(orderDate).toLocaleDateString('ar-EG')}
                                </div>
                            </div>

                            {/* Desktop Wide Landscape Sheet (Excel style) */}
                            <div className="sheet-table-wrapper">
                                <table className="sheet-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>نوع الزجاج (الصنف)</th>
                                            <th>الطول (سم)</th>
                                            <th>العرض (سم)</th>
                                            <th>العدد</th>
                                            <th>المساحة (م² / طولي)</th>
                                            <th>السعر (ج.م)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeItems.map((item, idx) => (
                                            <tr key={item.id}>
                                                <td>{idx + 1}</td>
                                                <td>{item.typeName}</td>
                                                <td>{item.length}</td>
                                                <td>{item.width}</td>
                                                <td>{item.qty}</td>
                                                <td>{item.area.toFixed(2)}</td>
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
                                            <div><span>الطول:</span> <span>{item.length} سم</span></div>
                                            <div><span>العرض:</span> <span>{item.width} سم</span></div>
                                            <div><span>العدد:</span> <span>{item.qty}</span></div>
                                            <div><span>المساحة:</span> <span>{item.area.toFixed(2)} م²</span></div>
                                            <div><span>السعر:</span> <span>{item.cost.toFixed(2)} ج.م</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="sheet-totals">
                                <div className="totals-row">
                                    <span>إجمالي المساحة الكلية:</span>
                                    <strong>{totals.area.toFixed(2)} م²</strong>
                                </div>
                                <div className="totals-row">
                                    <span>إجمالي سعر الزجاج:</span>
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
                                    <strong style={{ color: '#c62828' }}>{(totalCostWithAdjustments - Number(deposit || 0)).toFixed(2)} ج.m</strong>
                                </div>
                            </div>

                            <div className="sheet-footer-note">
                                <p>نشكركم لتعاملكم معنا - ورشة الزجاج الحديثة للخدمات الفنية</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
