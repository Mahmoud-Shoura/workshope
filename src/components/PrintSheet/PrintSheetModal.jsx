import React, { useEffect, useRef, useState } from 'react';
import { Printer, MessageCircle, X, Loader2 } from 'lucide-react';
import { shareInvoicePdf } from '../../utils/pdfShare';
import './PrintSheetModal.css';

const unitLabel = (unit) => {
    if (unit === 'm2') return 'م²';
    if (unit === 'piece') return 'قطعة';
    return 'متر طولي';
};

const extrasText = (item) => {
    if (item.extras && item.extras.length > 0) {
        return item.extras.map(e => `${Number(e.measure).toFixed(2)} ${e.name || e.unit}`).join(' + ');
    }
    return '';
};

// مساحة البند بالمتر المربع (القطعة والمتر الطولي مالهمش مساحة)
const m2AreaOf = (item) => {
    if (item.isPiece || item.unit === 'piece') return 0;
    const isPureLinear = item.unit && item.unit !== 'm2' && !item.isAddLinear && !(item.extras && item.extras.length);
    return isPureLinear ? 0 : Number(item.area || 0);
};

// سعر الوحدة: الحقل الجاهز لو موجود، وإلا بيتحسب (قطعة = الإجمالي ÷ العدد، متر = الإجمالي ÷ المساحة)
const unitPriceOf = (item) => {
    const direct = item.unitPrice ?? item.price ?? item.pricePerUnit;
    if (direct !== undefined && direct !== null && direct !== '') return Number(direct);
    if ((item.isPiece || item.unit === 'piece') && Number(item.qty) > 0) return Number(item.cost || 0) / Number(item.qty);
    const area = m2AreaOf(item);
    if (area > 0 && !(item.extras && item.extras.length) && !item.isAddLinear) return Number(item.cost || 0) / area;
    return null;
};

export function PrintSheetModal({
    isOpen,
    onClose,
    customerName,
    phoneNumber,
    orderDate,
    serialNumber,
    items = [],
    baseCost = 0,
    totalArea = 0,
    adjustments = [],
    totalCost = 0,
    deposit = 0,
    remainingBalance,
    payments = [],
    printSettings = {}
}) {
    const printContentRef = useRef(null);
    const [isSharingPdf, setIsSharingPdf] = useState(false);
    const [view, setView] = useState('invoice'); // 'invoice' | 'receipt'

    // نرجع لعرض الفاتورة الكاملة كل ما المودال يتقفل
    useEffect(() => {
        if (!isOpen) setView('invoice');
    }, [isOpen]);

    // الخروج بزرار Esc
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const safeTotalCost = Number(totalCost || 0);
    const safeDeposit = Number(deposit || 0);
    const safeRemaining = remainingBalance !== undefined
        ? Number(remainingBalance)
        : Math.max(0, safeTotalCost - safeDeposit);

    // دفعات مستلمة غير العربون (الفرق بين الإجمالي والعربون والمتبقي)
    const rawPaid = remainingBalance !== undefined ? safeTotalCost - safeDeposit - safeRemaining : 0;
    const safePaid = rawPaid > 0.005 ? rawPaid : 0;

    // إجماليات الجدول
    const sumQty = items.reduce((t, i) => t + Number(i.qty || 0), 0);
    const sumArea = items.reduce((t, i) => t + m2AreaOf(i), 0);
    const sumCost = items.reduce((t, i) => t + Number(i.cost || 0), 0);

    // تجميع الأصناف المتشابهة (نفس اسم الصنف/الخامة)
    const groups = Object.values(items.reduce((acc, i) => {
        const key = i.typeName || '—';
        if (!acc[key]) acc[key] = { name: key, qty: 0, area: 0, cost: 0 };
        acc[key].qty += Number(i.qty || 0);
        acc[key].area += m2AreaOf(i);
        acc[key].cost += Number(i.cost || 0);
        return acc;
    }, {}));

    const workshopName = printSettings?.workshop_name || 'ورشة العمل الحديثة';
    const formattedDate = orderDate
        ? new Date(orderDate).toLocaleDateString('ar-EG')
        : new Date().toLocaleDateString('ar-EG');

    const payDate = (d) => (d ? new Date(d).toLocaleDateString('ar-EG') : '');

    const handlePrint = () => {
        // الريسيد بيتطبع على ورق حراري 80mm، والفاتورة على A4
        let styleEl = null;
        if (view === 'receipt') {
            styleEl = document.createElement('style');
            styleEl.textContent = '@page { size: 80mm auto; margin: 2mm; }';
            document.head.appendChild(styleEl);
        }
        const cleanup = () => {
            if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.print();
    };

    const handleSharePdf = async () => {
        if (!printContentRef.current) return;
        setIsSharingPdf(true);

        // نسخة ثابتة العرض برا المودال عشان html2canvas
        // (من غير overflow ولا max-height ولا media queries بتاعة الموبايل)
        const clone = printContentRef.current.cloneNode(true);
        clone.classList.add('ps-pdf-capture');

        const wrapper = document.createElement('div');
        wrapper.style.cssText =
            'position:fixed;top:0;left:0;width:794px;background:#fff;z-index:-1;pointer-events:none;';
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        try {
            // استنى المتصفح يرسم النسخة قبل التصوير
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            await shareInvoicePdf({
                element: clone,
                customerName: customerName || 'عميل',
                phoneNumber: phoneNumber || '',
                serialNumber: serialNumber || '#INV-1001',
                workshopName: workshopName
            });
        } catch (err) {
            console.error('Share PDF error:', err);
            alert('حدث خطأ أثناء مشاركة الفاتورة PDF: ' + err.message);
        } finally {
            if (wrapper.parentNode) document.body.removeChild(wrapper);
            setIsSharingPdf(false);
        }
    };

    return (
        <div className="ps-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="ps-modal">

                {/* ── Header bar (hidden on print) ── */}
                <div className="ps-header no-print">
                    <div className="ps-header-left">
                        <span className="ps-title">معاينة الفاتورة</span>
                        <span className="ps-serial-badge">{serialNumber}</span>
                        <div className="ps-view-tabs">
                            <button type="button" className={view === 'invoice' ? 'active' : ''} onClick={() => setView('invoice')}>فاتورة كاملة</button>
                            <button type="button" className={view === 'receipt' ? 'active' : ''} onClick={() => setView('receipt')}>ريسيد</button>
                        </div>
                    </div>
                    <div className="ps-header-actions">
                        {view === 'invoice' && (<button
                            type="button"
                            onClick={handleSharePdf}
                            disabled={isSharingPdf}
                            className="ps-btn ps-btn-wa"
                            title="إرسال PDF على واتساب"
                        >
                            {isSharingPdf
                                ? <><Loader2 size={15} className="spin-icon" /><span>جاري تجهيز PDF...</span></>
                                : <><MessageCircle size={15} /><span>PDF على واتساب</span></>
                            }
                        </button>)}
                        <button type="button" onClick={handlePrint} className="ps-btn ps-btn-print" title="طباعة">
                            <Printer size={15} /><span>{view === 'receipt' ? 'طباعة الريسيد' : 'طباعة الفاتورة'}</span>
                        </button>
                        <button type="button" onClick={onClose} className="ps-btn-close" title="إغلاق" aria-label="إغلاق">
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* ── Printable / PDF document ── */}
                {view === 'invoice' ? (
                    <div className="ps-doc" ref={printContentRef}>

                        {/* اسم الورشة + التاريخ + تليفون الورشة */}
                        <div className="ps-doc-title">
                            <h2>{workshopName}</h2>
                            <div className="ps-meta-line">
                                <span><span className="ps-lbl">التاريخ</span> <bdi dir="ltr">{formattedDate}</bdi></span>
                                {printSettings?.phone && (
                                    <span className="ps-meta-phone">
                                        <span className="ps-lbl">تليفون</span> <bdi dir="ltr">{printSettings.phone}</bdi>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* سطر واحد: العميل + رقم الفاتورة + تليفون العميل */}
                        <div className="ps-customer-line">
                            <div className="ps-cl-item">
                                <span className="ps-lbl">العميل</span>
                                <strong>{customerName || 'عميل نقدي'}</strong>
                            </div>
                            <div className="ps-cl-item">
                                <span className="ps-lbl">فاتورة رقم</span>
                                <strong>{serialNumber}</strong>
                            </div>
                            <div className="ps-cl-item">
                                <span className="ps-lbl">تليفون العميل</span>
                                <strong><bdi dir="ltr">{phoneNumber || '—'}</bdi></strong>
                            </div>
                        </div>

                        {/* ── Items table ── */}
                        <div className="ps-items-section">
                            <div className="ps-section-label">تفاصيل البنود والقياسات</div>
                            <table className="ps-items-table">
                                <thead>
                                    <tr>
                                        <th className="ps-col-num">#</th>
                                        <th className="ps-col-type">الصنف والخامة</th>
                                        <th className="ps-col-dim">الطول<span className="ps-unit">سم</span></th>
                                        <th className="ps-col-dim">العرض<span className="ps-unit">سم</span></th>
                                        <th className="ps-col-qty">العدد</th>
                                        <th className="ps-col-area">المساحة والوصف</th>
                                        <th className="ps-col-uprice">سعر الوحدة<span className="ps-unit">جنيه</span></th>
                                        <th className="ps-col-price">الإجمالي<span className="ps-unit">جنيه</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: '14px' }}>
                                                لا توجد بنود مدخلة
                                            </td>
                                        </tr>
                                    )}
                                    {items.map((item, idx) => {
                                        let areaDesc = '';
                                        if (item.isPiece) {
                                            areaDesc = item.description || 'بالقطعة';
                                        } else if (item.extras && item.extras.length > 0) {
                                            areaDesc = `${Number(item.area || 0).toFixed(2)} ${unitLabel(item.unit)} + ${extrasText(item)}`;
                                        } else if (item.isAddLinear) {
                                            const linM = (((Number(item.length || 0) + Number(item.width || 0)) * 2 / 100) * Number(item.qty || 1)).toFixed(2);
                                            areaDesc = `${Number(item.area || 0).toFixed(2)} م² + ${linM} متر طولي`;
                                        } else {
                                            areaDesc = `${Number(item.area || 0).toFixed(2)} ${unitLabel(item.unit)}`;
                                        }

                                        return (
                                            <tr key={item.id || idx} className={idx % 2 === 0 ? 'ps-row-even' : 'ps-row-odd'}>
                                                <td className="ps-col-num">{idx + 1}</td>
                                                <td className="ps-col-type ps-item-name">{item.typeName}</td>
                                                <td className="ps-col-dim">{item.isPiece ? '—' : (item.length || '—')}</td>
                                                <td className="ps-col-dim">{item.isPiece ? '—' : (item.width || '—')}</td>
                                                <td className="ps-col-qty ps-bold">{item.qty}</td>
                                                <td className="ps-col-area">{areaDesc}</td>
                                                <td className="ps-col-uprice">{unitPriceOf(item) !== null ? unitPriceOf(item).toFixed(2) : '—'}</td>
                                                <td className="ps-col-price ps-bold">{Number(item.cost || 0).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {items.length > 0 && (
                                    <tfoot>
                                        <tr className="ps-foot-row">
                                            <td colSpan={4} className="ps-foot-label">الإجمالي</td>
                                            <td className="ps-col-qty">{sumQty}</td>
                                            <td className="ps-col-area">{sumArea > 0 ? `${sumArea.toFixed(2)} م²` : '—'}</td>
                                            <td className="ps-col-uprice">—</td>
                                            <td className="ps-col-price">{sumCost.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {/* ── إجمالي الأصناف المتشابهة ── */}
                        {items.length > 0 && (
                            <div className="ps-items-section ps-group-section">
                                <div className="ps-section-label">إجمالي الأصناف المتشابهة</div>
                                <table className="ps-items-table ps-group-table">
                                    <thead>
                                        <tr>
                                            <th className="ps-col-type">الصنف والخامة</th>
                                            <th className="ps-col-qty">العدد</th>
                                            <th className="ps-col-area">إجمالي المساحة</th>
                                            <th className="ps-col-price">الإجمالي<span className="ps-unit">جنيه</span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups.map((g, idx) => (
                                            <tr key={g.name} className={idx % 2 === 0 ? 'ps-row-even' : 'ps-row-odd'}>
                                                <td className="ps-col-type ps-item-name">{g.name}</td>
                                                <td className="ps-col-qty ps-bold">{g.qty}</td>
                                                <td className="ps-col-area">{g.area > 0 ? `${g.area.toFixed(2)} م²` : '—'}</td>
                                                <td className="ps-col-price ps-bold">{g.cost.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── Totals ── */}
                        <div className="ps-totals">
                            <div className="ps-totals-col">
                                {Number(totalArea || 0) > 0 && (
                                    <div className="ps-tot-row">
                                        <span className="ps-lbl">إجمالي المساحة</span>
                                        <strong>{Number(totalArea).toFixed(2)} م²</strong>
                                    </div>
                                )}
                                <div className="ps-tot-row">
                                    <span className="ps-lbl">الحساب الأساسي</span>
                                    <strong>{Number(baseCost || 0).toFixed(2)} جنيه</strong>
                                </div>
                                {adjustments && adjustments.length > 0 && adjustments.map((adj, idx) => (
                                    <div key={adj.id || idx} className="ps-tot-row ps-adj-row">
                                        <span className="ps-lbl">{adj.name}</span>
                                        <strong className={adj.amount < 0 ? 'ps-discount' : 'ps-fee'}>
                                            {adj.amount >= 0 ? '+' : ''}{Number(adj.amount || 0).toFixed(2)} جنيه
                                        </strong>
                                    </div>
                                ))}
                            </div>

                            <div className="ps-totals-summary">
                                <div className="ps-tot-row ps-tot-total">
                                    <span className="ps-lbl">الإجمالي المطلوب</span>
                                    <strong>{safeTotalCost.toFixed(2)} جنيه</strong>
                                </div>
                                <div className="ps-tot-row ps-tot-deposit">
                                    <span className="ps-lbl">العربون المقدم</span>
                                    <strong className="ps-green">{safeDeposit.toFixed(2)} جنيه</strong>
                                </div>
                                {payments.length > 0 ? payments.map((pay, idx) => (
                                    <div key={pay.id || idx} className="ps-tot-row ps-tot-deposit">
                                        <span className="ps-lbl">دفعة بتاريخ <bdi dir="ltr">{payDate(pay.date)}</bdi></span>
                                        <strong className="ps-green">{Number(pay.amount || 0).toFixed(2)} جنيه</strong>
                                    </div>
                                )) : safePaid > 0 && (
                                    <div className="ps-tot-row ps-tot-deposit">
                                        <span className="ps-lbl">دفعة مستلمة</span>
                                        <strong className="ps-green">{safePaid.toFixed(2)} جنيه</strong>
                                    </div>
                                )}
                                <div className="ps-tot-row ps-tot-remaining">
                                    <span className="ps-lbl">المتبقي للاستلام</span>
                                    <strong className="ps-red">{safeRemaining.toFixed(2)} جنيه</strong>
                                </div>
                            </div>
                        </div>

                        {/* Footer + الرقم الضريبي في آخر الفاتورة */}
                        <div className="ps-footer">
                            <p>{printSettings?.footer_note || `نشكركم لتعاملكم معنا — ${workshopName}`}</p>
                            {printSettings?.tax_number && (
                                <p className="ps-tax"><span className="ps-lbl">الرقم الضريبي</span> <bdi dir="ltr">{printSettings.tax_number}</bdi></p>
                            )}
                        </div>

                    </div>
                ) : (
                    /* ── Receipt (ورق حراري 80mm): بالقطعة من غير مقاسات ── */
                    <div className="ps-receipt">
                        <div className="ps-rc-center">
                            <div className="ps-rc-name">{workshopName}</div>
                            {printSettings?.phone && (
                                <div className="ps-rc-sub">
                                    <span className="ps-lbl">تليفون</span> <bdi dir="ltr">{printSettings.phone}</bdi>
                                </div>
                            )}
                            {printSettings?.address && <div className="ps-rc-sub">{printSettings.address}</div>}
                        </div>

                        <div className="ps-rc-sep" />

                        <div className="ps-rc-row"><span className="ps-lbl">فاتورة رقم</span><strong>{serialNumber}</strong></div>
                        <div className="ps-rc-row"><span className="ps-lbl">التاريخ</span><bdi dir="ltr">{formattedDate}</bdi></div>
                        <div className="ps-rc-row"><span className="ps-lbl">العميل</span><strong>{customerName || 'عميل نقدي'}</strong></div>

                        <div className="ps-rc-sep" />

                        {items.length === 0 && <div className="ps-rc-center">لا توجد بنود</div>}
                        {items.map((item, idx) => {
                            const qty = Number(item.qty || 0);
                            const total = Number(item.cost || 0);
                            const perPiece = qty > 0 ? total / qty : total;
                            return (
                                <div key={item.id || idx} className="ps-rc-item">
                                    <div className="ps-rc-item-top">
                                        <span>{item.typeName}</span>
                                        <span>{total.toFixed(2)}</span>
                                    </div>
                                    <div className="ps-rc-item-sub">
                                        <bdi dir="ltr">{qty} × {perPiece.toFixed(2)}</bdi> جنيه
                                    </div>
                                </div>
                            );
                        })}

                        <div className="ps-rc-sep" />

                        {adjustments && adjustments.map((adj, idx) => (
                            <div key={adj.id || idx} className="ps-rc-row">
                                <span className="ps-lbl">{adj.name}</span>
                                <span>{adj.amount >= 0 ? '+' : ''}{Number(adj.amount || 0).toFixed(2)} جنيه</span>
                            </div>
                        ))}
                        <div className="ps-rc-row ps-rc-total"><span className="ps-lbl">الإجمالي</span><strong>{safeTotalCost.toFixed(2)} جنيه</strong></div>
                        <div className="ps-rc-row"><span className="ps-lbl">العربون</span><span>{safeDeposit.toFixed(2)} جنيه</span></div>
                        {payments.length > 0 ? payments.map((pay, idx) => (
                            <div key={pay.id || idx} className="ps-rc-row">
                                <span className="ps-lbl">دفعة <bdi dir="ltr">{payDate(pay.date)}</bdi></span>
                                <span>{Number(pay.amount || 0).toFixed(2)} جنيه</span>
                            </div>
                        )) : safePaid > 0 && (
                            <div className="ps-rc-row"><span className="ps-lbl">دفعة مستلمة</span><span>{safePaid.toFixed(2)} جنيه</span></div>
                        )}
                        <div className="ps-rc-row ps-rc-total"><span className="ps-lbl">المتبقي</span><strong>{safeRemaining.toFixed(2)} جنيه</strong></div>

                        <div className="ps-rc-sep" />
                        <div className="ps-rc-center ps-rc-sub">
                            {printSettings?.footer_note || `نشكركم لتعاملكم معنا — ${workshopName}`}
                        </div>
                        {printSettings?.tax_number && (
                            <div className="ps-rc-center ps-rc-sub">
                                <span className="ps-lbl">الرقم الضريبي</span> <bdi dir="ltr">{printSettings.tax_number}</bdi>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}