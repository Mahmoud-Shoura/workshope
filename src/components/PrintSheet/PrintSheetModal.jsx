import React, { useRef, useState } from 'react';
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
    printSettings = {}
}) {
    const printContentRef = useRef(null);
    const [isSharingPdf, setIsSharingPdf] = useState(false);

    if (!isOpen) return null;

    const safeTotalCost = Number(totalCost || 0);
    const safeDeposit = Number(deposit || 0);
    const safeRemaining = remainingBalance !== undefined
        ? Number(remainingBalance)
        : Math.max(0, safeTotalCost - safeDeposit);

    const workshopName = printSettings?.workshop_name || 'ورشة العمل الحديثة';
    const formattedDate = orderDate
        ? new Date(orderDate).toLocaleDateString('ar-EG')
        : new Date().toLocaleDateString('ar-EG');

    const handlePrint = () => {
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
                    </div>
                    <div className="ps-header-actions">
                        <button
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
                        </button>
                        <button type="button" onClick={handlePrint} className="ps-btn ps-btn-print" title="طباعة">
                            <Printer size={15} /><span>طباعة</span>
                        </button>
                        <button type="button" onClick={onClose} className="ps-btn-close" title="إغلاق">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Printable / PDF document ── */}
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
                                    <th className="ps-col-price">السعر<span className="ps-unit">جنيه</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: '14px' }}>
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
                                            <td className="ps-col-price ps-bold">{Number(item.cost || 0).toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

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
                {/* end ps-doc */}

            </div>
        </div>
    );
}