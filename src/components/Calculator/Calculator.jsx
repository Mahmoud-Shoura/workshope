import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash, Save, Printer, MessageCircle, FilePlus, Edit2 } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './Calculator.css';

const DRAFT_KEY = 'calculator_draft';
const EDIT_ORDER_KEY = 'edit_order_pending';  // written by History, read here on mount

// وحدات الحساب اللي يقدر البرنامج يعملها (تقدر تضيف أي وحدة منهم فوق وحدة الصنف الأساسية)
const EXTRA_UNITS = [
    { unit: 'm2', name: 'متر مربع (م²)', short: 'م²' },
    { unit: 'linear_x2', name: 'متر طولي (محيط × 2)', short: 'م.ط' },
    { unit: 'linear_x4', name: 'متر طولي (محيط × 4)', short: 'م.ط×4' },
    { unit: 'piece', name: 'قطعة (بالعدد)', short: 'قطعة' },
];
const extraUnitInfo = (unit) => EXTRA_UNITS.find(u => u.unit === unit);

// ───────── Helpers ─────────
const unitLabel = (unit) => {
    if (unit === 'm2') return 'م²';
    if (unit === 'piece') return 'قطعة';
    return 'م.ط';
};

// يحوّل المجموعة القديمة (isAddLinear/linearPrice) للشكل الجديد (extras = [{ unit, price }])
function normalizeGroup(g) {
    let extras = Array.isArray(g.extras) ? g.extras.filter(e => e && extraUnitInfo(e.unit)) : [];
    if (!extras.length && g.isAddLinear && Number(g.linearPrice) > 0) {
        extras = [{ unit: 'linear_x2', price: String(g.linearPrice) }];
    }
    const rest = { ...g };
    delete rest.isAddLinear;
    delete rest.linearPrice;
    rest.extras = extras;
    return rest;
}

function loadDraft() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return null;
        const draft = JSON.parse(raw);
        if (Array.isArray(draft?.groups)) {
            draft.groups = draft.groups.map(normalizeGroup);
        }
        return draft;
    } catch { return null; }
}

export function Calculator() {
    const { glassTypes, customButtons, saveOrder, updateOrder, printSettings, orders } = useGlassStore();

    const makeGroup = (id = Date.now()) => ({
        id,
        typeId: glassTypes[0]?.id || '',
        inputText: '',
        extras: []
    });

    const getDefaultGroup = () => ([makeGroup()]);

    // Initialize from localStorage draft if available
    const [groups, setGroups] = useState(() => {
        const draft = loadDraft();
        return draft?.groups?.length ? draft.groups : [makeGroup(1)];
    });
    const [customerName, setCustomerName] = useState(() => loadDraft()?.customerName || '');
    const [phoneNumber, setPhoneNumber] = useState(() => loadDraft()?.phoneNumber || '');
    const [deposit, setDeposit] = useState(() => loadDraft()?.deposit || '');
    const [orderDate, setOrderDate] = useState(() => loadDraft()?.orderDate || new Date().toISOString().split('T')[0]);
    const [showPrintSheet, setShowPrintSheet] = useState(false);
    const [activeButtons, setActiveButtons] = useState(() => loadDraft()?.activeButtons || []);
    const [editingOrderId, setEditingOrderId] = useState(() => loadDraft()?.editingOrderId || null);

    // Persist draft to localStorage whenever state changes
    useEffect(() => {
        const draft = { groups, customerName, phoneNumber, deposit, orderDate, activeButtons, editingOrderId };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, [groups, customerName, phoneNumber, deposit, orderDate, activeButtons, editingOrderId]);

    // ── On mount: check if History left an order for editing ──
    useEffect(() => {
        const raw = localStorage.getItem(EDIT_ORDER_KEY);
        if (!raw) return;
        try {
            const order = JSON.parse(raw);
            localStorage.removeItem(EDIT_ORDER_KEY);
            // Rebuild groups from order items
            const groupMap = {};
            (order.items || []).forEach(item => {
                const key = item.typeId;
                if (!groupMap[key]) {
                    let extras = [];
                    if (Array.isArray(item.extras) && item.extras.length) {
                        extras = item.extras
                            .filter(e => extraUnitInfo(e.unit))
                            .map(e => ({ unit: e.unit, price: String(e.price ?? '') }));
                    } else if (item.isAddLinear && Number(item.linearPrice) > 0) {
                        extras = [{ unit: 'linear_x2', price: String(item.linearPrice) }];
                    }
                    groupMap[key] = {
                        id: Date.now() + Math.random(),
                        typeId: item.typeId,
                        inputText: '',
                        extras
                    };
                }
                if (item.isPiece) {
                    let rows = [];
                    try { rows = JSON.parse(groupMap[key].inputText); } catch { rows = []; }
                    rows.push({ id: item.id || (Date.now() + Math.random()), desc: item.description || '', qty: item.qty });
                    groupMap[key].inputText = JSON.stringify(rows);
                } else {
                    const line = `${item.length}*${item.width}*${item.qty}`;
                    groupMap[key].inputText = groupMap[key].inputText
                        ? groupMap[key].inputText + '\n' + line
                        : line;
                }
            });
            const rebuiltGroups = Object.values(groupMap);
            setGroups(rebuiltGroups.length ? rebuiltGroups : getDefaultGroup());
            setCustomerName(order.customer_name || order.customerName || '');
            setPhoneNumber(order.customer_phone || order.phoneNumber || '');
            setDeposit(String(order.deposit || ''));
            setOrderDate(order.date ? order.date.split('T')[0] : new Date().toISOString().split('T')[0]);
            setActiveButtons([]);
            setEditingOrderId(order.id);
        } catch (err) {
            console.error('Failed to load edit order', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once on mount only

    // ── Build unique customer list for autocomplete ──
    const knownCustomers = React.useMemo(() => {
        if (!orders) return [];
        const map = {};
        orders.forEach(o => {
            const name = (o.customer_name || o.customerName || '').trim();
            const phone = (o.customer_phone || o.phoneNumber || '').trim();
            if (name && !map[name]) map[name] = phone;
        });
        return Object.entries(map).map(([name, phone]) => ({ name, phone }));
    }, [orders]);

    const [nameSuggestions, setNameSuggestions] = useState([]);
    const [showNameSuggestions, setShowNameSuggestions] = useState(false);
    const nameInputRef = useRef(null);

    const handleNameChange = (val) => {
        setCustomerName(val);
        if (!val.trim()) { setNameSuggestions([]); setShowNameSuggestions(false); return; }
        const filtered = knownCustomers.filter(c =>
            c.name.toLowerCase().includes(val.toLowerCase())
        );
        setNameSuggestions(filtered);
        setShowNameSuggestions(filtered.length > 0);
    };

    const handleSelectSuggestion = (customer) => {
        setCustomerName(customer.name);
        if (customer.phone) setPhoneNumber(customer.phone);
        setNameSuggestions([]);
        setShowNameSuggestions(false);
    };

    const handleNewInvoice = () => {
        if (window.confirm('هل تريد مسح الفاتورة الحالية وبدء فاتورة جديدة؟')) {
            setGroups(getDefaultGroup());
            setCustomerName('');
            setPhoneNumber('');
            setDeposit('');
            setOrderDate(new Date().toISOString().split('T')[0]);
            setActiveButtons([]);
            setEditingOrderId(null);
            localStorage.removeItem(DRAFT_KEY);
        }
    };

    // Compute groups with fallback typeIds if they are deleted from inventory
    const adjustedGroups = groups.map(group => {
        let typeId = group.typeId;
        if (!glassTypes.find(t => t.id === typeId) && glassTypes.length > 0) {
            typeId = glassTypes[0].id;
        }
        return { ...group, typeId, extras: group.extras || [] };
    });

    const addGroup = () => {
        setGroups([...groups, makeGroup()]);
    };

    const updateGroup = (id, field, value) => {
        setGroups(groups.map(group => group.id === id ? { ...group, [field]: value } : group));
    };

    const deleteGroup = (id) => {
        if (groups.length > 1) {
            setGroups(groups.filter(group => group.id !== id));
        }
    };

    // ── وحدات حساب إضافية (تختار من وحدات البرنامج) ──
    const addExtraUnit = (groupId, unit) => {
        if (!unit) return;
        // سعر مبدئي من أول صنف في المخزن بنفس الوحدة (لو موجود) وتقدر تعدله
        const suggested = glassTypes.find(t => t.unit === unit)?.price;
        setGroups(groups.map(group => {
            if (group.id !== groupId) return group;
            const current = group.extras || [];
            if (current.some(e => e.unit === unit)) return group;
            return { ...group, extras: [...current, { unit, price: suggested != null ? String(suggested) : '' }] };
        }));
    };

    const removeExtraUnit = (groupId, unit) => {
        setGroups(groups.map(group => group.id === groupId
            ? { ...group, extras: (group.extras || []).filter(e => e.unit !== unit) }
            : group));
    };

    const setExtraPrice = (groupId, unit, price) => {
        setGroups(groups.map(group => {
            if (group.id !== groupId) return group;
            return {
                ...group,
                extras: (group.extras || []).map(e => e.unit === unit ? { ...e, price } : e)
            };
        }));
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

    const handlePieceQtyStep = (groupId, index, delta) => {
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
            const cur = Number(currentRows[index].qty) || 0;
            const next = Math.max(0, cur + delta);
            currentRows[index].qty = next;
        }
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
                        qty: item.qty === '' ? '' : (isNaN(Number(item.qty)) ? '' : Number(item.qty)),
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

    // يحسب الوحدات الإضافية لمقاس واحد
    const calculateExtras = (length, width, qty, extras) => {
        const safeQty = (qty === '' || isNaN(Number(qty))) ? 0 : Number(qty);
        const details = [];
        (extras || []).forEach(ex => {
            const info = extraUnitInfo(ex.unit);
            if (!info) return;
            const price = Number(ex.price) || 0;
            let measure = 0;
            if (ex.unit === 'm2') {
                measure = ((length * width) / 10000) * safeQty;
            } else if (ex.unit === 'linear_x2') {
                measure = (((length + width) * 2) / 100) * safeQty;
            } else if (ex.unit === 'linear_x4') {
                measure = (((length + width) * 4) / 100) * safeQty;
            } else if (ex.unit === 'piece') {
                measure = safeQty;
            }
            details.push({
                unit: ex.unit,
                name: info.name,
                price,
                measure,
                cost: measure * price
            });
        });
        return details;
    };

    const calculateRow = (length, width, qty, typeId, extras) => {
        const type = glassTypes.find(t => t.id === typeId);
        if (!type) return { area: 0, cost: 0, extraCost: 0, extrasDetail: [] };
        const safeQty = (qty === '' || isNaN(Number(qty))) ? 0 : Number(qty);

        let area = 0;
        let cost = 0;

        if (type.unit === 'm2') {
            const areaM2 = (length * width) / 10000;
            area = areaM2 * safeQty;
            cost = area * type.price;
        } else if (type.unit === 'piece') {
            area = 0;
            cost = safeQty * type.price;
        } else if (type.unit === 'linear_x2') {
            const linearMeters = ((length + width) * 2) / 100;
            area = linearMeters * safeQty;
            cost = area * type.price;
        } else if (type.unit === 'linear_x4') {
            const linearMeters = ((length + width) * 4) / 100;
            area = linearMeters * safeQty;
            cost = area * type.price;
        }

        let extrasDetail = [];
        let extraCost = 0;
        if (type.unit !== 'piece') {
            extrasDetail = calculateExtras(length, width, qty, extras);
            extraCost = extrasDetail.reduce((sum, e) => sum + e.cost, 0);
            cost += extraCost;
        }

        return { area, cost, extraCost, extrasDetail };
    };

    const getActiveItems = () => {
        const allItems = [];
        adjustedGroups.forEach(group => {
            const type = glassTypes.find(t => t.id === group.typeId);
            const isPiece = type?.unit === 'piece';
            const parsed = parseMeasurementsText(group.inputText, isPiece);
            parsed.forEach(item => {
                if (item.isValid) {
                    const { area, cost, extraCost, extrasDetail } = calculateRow(
                        item.length,
                        item.width,
                        item.qty,
                        group.typeId,
                        group.extras
                    );
                    allItems.push({
                        id: item.id,
                        length: item.length,
                        width: item.width,
                        qty: item.qty,
                        typeId: group.typeId,
                        typeName: type?.name || '',
                        unit: type?.unit || '',
                        description: item.description || '',
                        isPiece,
                        // حقول قديمة محفوظة للتوافق مع باقي الشاشات
                        isAddLinear: false,
                        linearPrice: 0,
                        extraLinearCost: extraCost,
                        // الإضافات الجديدة
                        extras: extrasDetail,
                        area,
                        cost
                    });
                }
            });
        });
        return allItems;
    };

    // نص وصف الإضافات لعنصر (للواتساب والطباعة)
    const extrasText = (item) =>
        (item.extras || [])
            .map(e => `${e.measure.toFixed(2)} ${extraUnitInfo(e.unit)?.short || unitLabel(e.unit)}`)
            .join(' + ');

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
                const label = unitLabel(item.unit);
                message += `   المساحة/الطول: ${item.area.toFixed(2)} ${label}\n`;
                if (item.extras && item.extras.length > 0) {
                    message += `   إضافات: ${extrasText(item)}\n`;
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

    const handleSave = async () => {
        if (!customerName) return alert('برجاء إدخال اسم العميل');
        if (activeItems.length === 0) return alert('برجاء إدخال أصناف أو مقاسات صحيحة أولاً');

        const now = new Date();
        const selectedDate = new Date(orderDate);
        selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

        if (editingOrderId) {
            // Update existing order
            await updateOrder(editingOrderId, {
                customerName,
                customerPhone: phoneNumber,
                items: activeItems,
                baseCost,
                totalCost: totalCostWithAdjustments,
                totalArea: totals.area,
                adjustments,
                deposit: Number(deposit || 0),
                remainingBalance: totalCostWithAdjustments - Number(deposit || 0),
            });
            alert('تم تحديث الفاتورة بنجاح!');
            setEditingOrderId(null);
        } else {
            // Save new order
            await saveOrder({
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
            alert('تم حفظ الطلب بنجاح! ✅ الفاتورة لا تزال موجودة في الشاشة.');
        }
        // Do NOT clear the form - user can clear manually via "فاتورة جديدة"
    };

    return (
        <div className="calculator-container">
            {/* Header */}
            <div className="calculator-header no-print">
                {editingOrderId && (
                    <div className="edit-mode-banner">
                        <Edit2 size={16} />
                        <span>وضع التعديل — أنت تعدّل على فاتورة محفوظة</span>
                    </div>
                )}
                <div className="calculator-inputs">
                    {/* Customer Name with Autocomplete */}
                    <div className="autocomplete-wrapper" style={{ flex: 1, minWidth: 180, position: 'relative' }}>
                        <input
                            ref={nameInputRef}
                            type="text"
                            placeholder="اسم العميل"
                            value={customerName}
                            onChange={e => handleNameChange(e.target.value)}
                            onBlur={() => setTimeout(() => setShowNameSuggestions(false), 150)}
                            onFocus={() => customerName && nameSuggestions.length > 0 && setShowNameSuggestions(true)}
                            autoComplete="off"
                        />
                        {showNameSuggestions && (
                            <ul className="autocomplete-list">
                                {nameSuggestions.map((c, i) => (
                                    <li key={i} onMouseDown={() => handleSelectSuggestion(c)} className="autocomplete-item">
                                        <span className="ac-name">{c.name}</span>
                                        {c.phone && <span className="ac-phone">{c.phone}</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <input
                        type="tel"
                        placeholder="رقم الهاتف (واتساب)"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        dir="ltr"
                        style={{ flex: 1, minWidth: 150 }}
                    />
                    <input
                        type="number"
                        placeholder="العربون / المقدم المدفوع (ج.م)"
                        value={deposit}
                        onChange={e => setDeposit(e.target.value)}
                        min="0"
                        style={{ flex: 1, minWidth: 150 }}
                    />
                    <input
                        type="date"
                        value={orderDate}
                        onChange={e => setOrderDate(e.target.value)}
                        title="تاريخ المعاملة"
                        style={{ flex: 1, minWidth: 150 }}
                    />
                </div>
                <div className="calculator-buttons">
                    <button onClick={handleSave} className={`btn-save${editingOrderId ? ' btn-update' : ''}`} disabled={activeItems.length === 0}>
                        <Save size={16} />
                        {editingOrderId ? 'تحديث الفاتورة' : 'حفظ'}
                    </button>
                    <button onClick={handleNewInvoice} className="btn-new-invoice">
                        <FilePlus size={16} />
                        فاتورة جديدة
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

                    // الوحدات الإضافية المختارة لهذه المجموعة
                    const activeExtras = (group.extras || []).filter(e => extraUnitInfo(e.unit));
                    const remainingUnits = EXTRA_UNITS.filter(u => !activeExtras.some(e => e.unit === u.unit));

                    const groupSubtotal = parsedRows.reduce((acc, r) => {
                        if (!r.isValid) return acc;
                        const { area, cost } = calculateRow(r.length, r.width, r.qty, group.typeId, group.extras);
                        return {
                            area: acc.area + area,
                            cost: acc.cost + cost,
                            totalQty: acc.totalQty + (Number(r.qty) || 0)
                        };
                    }, { area: 0, cost: 0, totalQty: 0 });

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
                                            <option key={t.id} value={t.id}>{t.name} ({t.price} ج.م / {unitLabel(t.unit)})</option>
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
                                    <div className="pieces-editor-container">
                                        <div className="pieces-editor-header-bar">
                                            <label className="group-input-label">إدخال بنود القطع:</label>
                                            <span className="pieces-count-hint">
                                                {parsedRows.length > 0 ? `${parsedRows.length} بند` : 'لا توجد بنود'}
                                            </span>
                                        </div>

                                        {/* Desktop Table View */}
                                        <div className="pieces-table-wrapper">
                                            <table className="pieces-editor-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '40px' }}>#</th>
                                                        <th>البيان / الوصف (اختياري)</th>
                                                        <th style={{ width: '120px' }}>العدد (قطع)</th>
                                                        <th style={{ width: '120px' }}>سعر القطعة</th>
                                                        <th style={{ width: '120px' }}>الإجمالي</th>
                                                        <th style={{ width: '50px' }}>إجراء</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parsedRows.map((row, idx) => {
                                                        const itemPrice = type?.price || 0;
                                                        const totalItemCost = (Number(row.qty) || 0) * itemPrice;
                                                        return (
                                                            <tr key={row.id}>
                                                                <td className="piece-col-idx">{idx + 1}</td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.description || ''}
                                                                        onChange={(e) => handlePieceRowChange(group.id, idx, 'desc', e.target.value)}
                                                                        placeholder="مثال: مقبض، رف، برواز، شطف..."
                                                                        className="piece-table-input"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        inputMode="numeric"
                                                                        value={row.qty}
                                                                        onChange={(e) => handlePieceRowChange(group.id, idx, 'qty', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
                                                                        min="0"
                                                                        className="piece-table-qty-input"
                                                                    />
                                                                </td>
                                                                <td className="piece-table-price">{itemPrice.toLocaleString()} ج.م</td>
                                                                <td className="piece-table-total">{totalItemCost.toLocaleString()} ج.م</td>
                                                                <td>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemovePieceRow(group.id, idx)}
                                                                        className="btn-delete-small"
                                                                        title="حذف البند"
                                                                    >
                                                                        <Trash size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Cards View */}
                                        <div className="pieces-mobile-cards">
                                            {parsedRows.map((row, idx) => {
                                                const itemPrice = type?.price || 0;
                                                const totalItemCost = (Number(row.qty) || 0) * itemPrice;
                                                return (
                                                    <div key={row.id} className="piece-card-item">
                                                        <div className="piece-card-header">
                                                            <div className="piece-card-title">
                                                                <span className="piece-card-index">#{idx + 1}</span>
                                                                <span className="piece-card-type">{type?.name || 'قطعة'}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemovePieceRow(group.id, idx)}
                                                                className="piece-card-btn-delete"
                                                                title="حذف البند"
                                                            >
                                                                <Trash size={14} />
                                                                <span>حذف</span>
                                                            </button>
                                                        </div>

                                                        <div className="piece-card-body">
                                                            <div className="piece-card-field">
                                                                <label className="piece-card-label">البيان / الوصف (اختياري)</label>
                                                                <input
                                                                    type="text"
                                                                    value={row.description || ''}
                                                                    onChange={(e) => handlePieceRowChange(group.id, idx, 'desc', e.target.value)}
                                                                    placeholder="مثال: مقبض، رف، برواز، شطف..."
                                                                    className="piece-card-input"
                                                                />
                                                            </div>

                                                            <div className="piece-card-bottom-row">
                                                                <div className="piece-card-qty-field">
                                                                    <label className="piece-card-label">العدد (قطع)</label>
                                                                    <div className="piece-qty-stepper">
                                                                        <button
                                                                            type="button"
                                                                            className="piece-stepper-btn"
                                                                            onClick={() => handlePieceQtyStep(group.id, idx, -1)}
                                                                            aria-label="إنقاص العدد"
                                                                        >
                                                                            -
                                                                        </button>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            value={row.qty}
                                                                            onChange={(e) => handlePieceRowChange(group.id, idx, 'qty', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
                                                                            min="0"
                                                                            className="piece-stepper-input"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            className="piece-stepper-btn"
                                                                            onClick={() => handlePieceQtyStep(group.id, idx, 1)}
                                                                            aria-label="زيادة العدد"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="piece-card-pricing">
                                                                    <div className="piece-price-item">
                                                                        <span className="piece-price-label">سعر القطعة:</span>
                                                                        <span className="piece-price-val">{itemPrice.toLocaleString()} ج.م</span>
                                                                    </div>
                                                                    <div className="piece-price-item piece-price-total">
                                                                        <span className="piece-price-label">الإجمالي:</span>
                                                                        <span className="piece-price-val-total">{totalItemCost.toLocaleString()} ج.م</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {parsedRows.length === 0 && (
                                            <div className="pieces-empty-state">
                                                <p>لا توجد بنود مدخلة بعد في هذه المجموعة.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddPieceRow(group.id)}
                                                    className="btn-add-piece-first"
                                                >
                                                    <Plus size={16} /> إضافة أول بند قطعة
                                                </button>
                                            </div>
                                        )}

                                        {parsedRows.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => handleAddPieceRow(group.id)}
                                                className="btn-add-piece-row-action"
                                            >
                                                <Plus size={16} /> إضافة بند قطعة جديد
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="group-input-section" style={{ width: '100%' }}>
                                            <div className="dual-calc-toggle-row" style={{ marginBottom: '8px' }}>
                                                <label className="group-input-label">أدخل المقاسات:</label>
                                            </div>

                                            {/* ── إضافة وحدة حساب فوق الوحدة الأساسية ── */}
                                            <div
                                                className="extras-box"
                                                style={{
                                                    border: '1px dashed #bbb',
                                                    borderRadius: '8px',
                                                    padding: '10px',
                                                    marginBottom: '10px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>إضافة وحدة حساب لهذا المقاس:</span>
                                                    <select
                                                        value=""
                                                        onChange={(e) => addExtraUnit(group.id, e.target.value)}
                                                        disabled={remainingUnits.length === 0}
                                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                                                    >
                                                        <option value="">
                                                            {remainingUnits.length === 0 ? 'تمت إضافة كل الوحدات' : '+ اختر وحدة'}
                                                        </option>
                                                        {remainingUnits.map(u => (
                                                            <option key={u.unit} value={u.unit}>{u.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {activeExtras.length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                                                        {activeExtras.map(e => {
                                                            const info = extraUnitInfo(e.unit);
                                                            return (
                                                                <div key={e.unit} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                                    <span style={{ minWidth: '150px' }}>{info.name}</span>
                                                                    <span style={{ fontSize: '14px' }}>السعر:</span>
                                                                    <input
                                                                        type="number"
                                                                        value={e.price}
                                                                        onChange={(ev) => setExtraPrice(group.id, e.unit, ev.target.value)}
                                                                        placeholder="ج.م"
                                                                        className="linear-price-input"
                                                                        style={{ width: '90px', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '4px' }}
                                                                        min="0"
                                                                    />
                                                                    <span style={{ fontSize: '13px', color: '#666' }}>ج.م / {info.short}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeExtraUnit(group.id, e.unit)}
                                                                        title="إزالة الوحدة"
                                                                        style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer' }}
                                                                    >
                                                                        <Trash size={16} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
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
                                                                <th>المساحة ({unitLabel(type?.unit)})</th>
                                                                {activeExtras.map(e => (
                                                                    <th key={e.unit}>{extraUnitInfo(e.unit).short} إضافي</th>
                                                                ))}
                                                                <th>السعر (ج.م)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {parsedRows.map((r, rIdx) => {
                                                                if (!r.isValid) {
                                                                    return (
                                                                        <tr key={r.id} className="preview-row-invalid">
                                                                            <td>{rIdx + 1}</td>
                                                                            <td colSpan={4 + activeExtras.length} className="error-text">
                                                                                تنسيق غير مدعوم: "{r.raw}"
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                }
                                                                const { area, cost, extrasDetail } = calculateRow(r.length, r.width, r.qty, group.typeId, group.extras);
                                                                return (
                                                                    <tr key={r.id} className="preview-row-valid">
                                                                        <td>{rIdx + 1}</td>
                                                                        <td>{r.length} × {r.width}</td>
                                                                        <td>{r.qty}</td>
                                                                        <td>{area.toFixed(2)}</td>
                                                                        {activeExtras.map(e => {
                                                                            const d = extrasDetail.find(x => x.unit === e.unit);
                                                                            return <td key={e.unit}>{d ? d.measure.toFixed(2) : '-'}</td>;
                                                                        })}
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
                                    {isPiece ? (
                                        <>
                                            <span className="subtotal-item">
                                                إجمالي القطع: <strong>{groupSubtotal.totalQty || 0} قطعة</strong>
                                            </span>
                                            <span className="subtotal-item">
                                                السعر: <strong>{groupSubtotal.cost.toFixed(2)} ج.م</strong>
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="subtotal-item">
                                                المساحة: <strong>{groupSubtotal.area.toFixed(2)} م²</strong>
                                            </span>
                                            <span className="subtotal-item">
                                                السعر: <strong>{groupSubtotal.cost.toFixed(2)} ج.م</strong>
                                            </span>
                                        </>
                                    )}
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
                                                    {item.isPiece
                                                        ? (item.description || 'بالقطعة')
                                                        : (item.extras && item.extras.length > 0)
                                                            ? `${item.area.toFixed(2)} ${unitLabel(item.unit)} + ${extrasText(item)}`
                                                            : `${item.area.toFixed(2)}`}
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
                                                            {(item.extras && item.extras.length > 0)
                                                                ? `${item.area.toFixed(2)} ${unitLabel(item.unit)} + ${extrasText(item)}`
                                                                : `${item.area.toFixed(2)}`}
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