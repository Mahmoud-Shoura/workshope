import React, { useRef, useState } from 'react';
import { Printer, MessageCircle, X, Loader2 } from 'lucide-react';
import { shareInvoicePdf } from '../../utils/pdfShare';
import './PrintSheetModal.css';

const unitLabel = (unit) => {
    if (unit === 'm2') return 'م²';
    if (unit === 'piece') return 'قطعة';
    return 'م.ط';
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

    const handlePrint = () => {
        window.print();
    };

    const handleSharePdf = async () => {
        if (!printContentRef.current) return;
        setIsSharingPdf(true);
        try {
            await shareInvoicePdf({
                element: printContentRef.current,
                customerName: customerName || 'عميل',
                phoneNumber: phoneNumber || '',
                serialNumber: serialNumber || '#INV-1001',
                workshopName: printSettings?.workshop_name || 'الورشة'
            });
        } catch (err) {
            console.error('Share PDF error:', err);
            alert('حدث خطأ أثناء مشاركة الفاتورة PDF: ' + err.message);
        } finally {
            setIsSharingPdf(false);
        }
    };

    return (
        <div className="printable-sheet-overlay">
            <div className="printable-sheet-modal print-area">
                {/* Header Actions (hidden on print) */}
                <div className="sheet-header no-print">
                    <div className="sheet-header-title-row">
                        <h3>معاينة وطباعة الفاتورة</h3>
                        <span className="sheet-modal-serial-badge">{serialNumber}</span>
                    </div>
                    <div className="sheet-header-buttons">
                        <button
                            type="button"
                            onClick={handleSharePdf}
                            disabled={isSharingPdf}
                            className="btn-share-pdf-modal"
                            title="إرسال الفاتورة كملف PDF على الواتساب مباشرة"
                        >
                            {isSharingPdf ? (
                                <>
                                    <Loader2 size={16} className="spin-icon" />
                                    <span>جاري تجهيز PDF...</span>
                                </>
                            ) : (
                                <>
                                    <MessageCircle size={16} />
                                    <span>إرسال PDF على واتساب</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="btn-print-modal"
                            title="طباعة الفاتورة"
                        >
                            <Printer size={16} />
                            <span>طباعة الكشف</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-close-modal"
                            title="إغلاق"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable Document Area */}
                <div className="sheet-content" ref={printContentRef}>
                    {/* Brand Banner */}
                    <div className="sheet-print-title">
                        <h2>{printSettings?.workshop_name || 'ورشة العمل الحديثة'}</h2>
                        <p>{printSettings?.tax_number ? `الرقم الضريبي: ${printSettings.tax_number}` : 'كشف تفصيلي بالقياسات وحسابات العميل'}</p>
                    </div>

                    {/* Opposite 2-Box Grid: Customer info vs Workshop info */}
                    <div className="sheet-opposite-grid">
                        {/* Right Box: Customer & Invoice Details */}
                        <div className="sheet-card-box customer-box">
                            <div className="box-title">
                                <span>بيانات العميل والفاتورة</span>
                                <span className="box-serial-pill">{serialNumber}</span>
                            </div>
                            <div className="box-content">
                                <div className="box-row">
                                    <span className="b-label">اسم العميل:</span>
                                    <strong className="b-val">{customerName || 'عميل نقدي'}</strong>
                                </div>
                                <div className="box-row">
                                    <span className="b-label">رقم الهاتف:</span>
                                    <span className="b-val phone-text" dir="ltr">{phoneNumber || '-'}</span>
                                </div>
                                <div className="box-row">
                                    <span className="b-label">رقم الفاتورة:</span>
                                    <strong className="b-val highlight-serial">{serialNumber}</strong>
                                </div>
                                <div className="box-row">
                                    <span className="b-label">تاريخ الفاتورة:</span>
                                    <span className="b-val">{orderDate ? new Date(orderDate).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Left Box (Opposite): Workshop Details */}
                        <div className="sheet-card-box workshop-box">
                            <div className="box-title">
                                <span>بيانات الورشة</span>
                            </div>
                            <div className="box-content">
                                <div className="box-row">
                                    <span className="b-label">اسم الورشة:</span>
                                    <strong className="b-val">{printSettings?.workshop_name || 'ورشة العمل الحديثة'}</strong>
                                </div>
                                {printSettings?.owner_name && (
                                    <div className="box-row">
                                        <span className="b-label">صاحب العمل:</span>
                                        <span className="b-val">{printSettings.owner_name}</span>
                                    </div>
                                )}
                                {printSettings?.phone && (
                                    <div className="box-row">
                                        <span className="b-label">هاتف الورشة:</span>
                                        <span className="b-val phone-text" dir="ltr">{printSettings.phone}</span>
                                    </div>
                                )}
                                {printSettings?.address && (
                                    <div className="box-row">
                                        <span className="b-label">العنوان:</span>
                                        <span className="b-val">{printSettings.address}</span>
                                    </div>
                                )}
                                {printSettings?.tax_number && (
                                    <div className="box-row">
                                        <span className="b-label">الرقم الضريبي:</span>
                                        <span className="b-val">{printSettings.tax_number}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table View (for Desktop, Print, and PDF) */}
                    <div className="sheet-table-wrapper">
                        <table className="sheet-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '35px' }}>#</th>
                                    <th>الصنف / الخامة</th>
                                    <th>الطول (سم)</th>
                                    <th>العرض (سم)</th>
                                    <th>العدد</th>
                                    <th>المساحة / الوصف</th>
                                    <th>السعر (ج.م)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={item.id || idx}>
                                        <td>{idx + 1}</td>
                                        <td className="item-type-cell">{item.typeName}</td>
                                        <td>{item.isPiece ? '-' : (item.length || '-')}</td>
                                        <td>{item.isPiece ? '-' : (item.width || '-')}</td>
                                        <td className="font-bold">{item.qty}</td>
                                        <td>
                                            {item.isPiece
                                                ? (item.description || 'بالقطعة')
                                                : (item.extras && item.extras.length > 0)
                                                    ? `${Number(item.area || 0).toFixed(2)} ${unitLabel(item.unit)} + ${extrasText(item)}`
                                                    : (item.isAddLinear
                                                        ? `${Number(item.area || 0).toFixed(2)} م² + ${(((Number(item.length || 0) + Number(item.width || 0)) * 2 / 100) * Number(item.qty || 1)).toFixed(2)} م.ط إضافي`
                                                        : `${Number(item.area || 0).toFixed(2)} ${unitLabel(item.unit)}`)}
                                        </td>
                                        <td className="font-bold">{Number(item.cost || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Portrait Sheet List (screen only, hidden on print/pdf) */}
                    <div className="sheet-mobile-list no-print">
                        {items.map((item, idx) => (
                            <div key={item.id || idx} className="sheet-mobile-item">
                                <div className="item-header">
                                    <span className="item-index">#{idx + 1}</span>
                                    <span className="item-type">{item.typeName}</span>
                                </div>
                                <div className="item-details">
                                    {item.isPiece ? (
                                        <>
                                            {item.description && <div><span>البيان:</span> <span>{item.description}</span></div>}
                                            <div><span>الكمية:</span> <strong>{item.qty} قطعة</strong></div>
                                        </>
                                    ) : (
                                        <>
                                            <div><span>الأبعاد:</span> <span>{item.length} × {item.width} سم</span></div>
                                            <div><span>العدد:</span> <strong>{item.qty}</strong></div>
                                            <div>
                                                <span>المساحة:</span>
                                                <span>
                                                    {(item.extras && item.extras.length > 0)
                                                        ? `${Number(item.area || 0).toFixed(2)} ${unitLabel(item.unit)} + ${extrasText(item)}`
                                                        : `${Number(item.area || 0).toFixed(2)} ${unitLabel(item.unit)}`}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                    <div><span>السعر:</span> <strong>{Number(item.cost || 0).toFixed(2)} ج.م</strong></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Totals and Adjustments Box */}
                    <div className="sheet-totals">
                        {Number(totalArea || 0) > 0 && (
                            <div className="totals-row">
                                <span>إجمالي المساحة:</span>
                                <strong>{Number(totalArea).toFixed(2)} م²</strong>
                            </div>
                        )}
                        <div className="totals-row">
                            <span>الحساب الأساسي:</span>
                            <strong>{Number(baseCost || 0).toFixed(2)} ج.م</strong>
                        </div>

                        {/* Adjustments (Buttons: discounts & fees) */}
                        {adjustments && adjustments.length > 0 && adjustments.map((adj, idx) => (
                            <div key={adj.id || idx} className="totals-row sheet-adjustment-row">
                                <span>{adj.name}:</span>
                                <strong className={adj.amount < 0 ? 'text-discount' : 'text-fee'}>
                                    {adj.amount >= 0 ? '+' : ''}{Number(adj.amount || 0).toFixed(2)} ج.م
                                </strong>
                            </div>
                        ))}

                        <div className="totals-row total-price-row">
                            <span>الحساب الإجمالي المطلوب:</span>
                            <strong>{safeTotalCost.toFixed(2)} ج.م</strong>
                        </div>
                        <div className="totals-row sheet-deposit-row">
                            <span>العربون / المقدم:</span>
                            <strong className="text-green">{safeDeposit.toFixed(2)} ج.م</strong>
                        </div>
                        <div className="totals-row sheet-remaining-row">
                            <span>المتبقي للاستلام:</span>
                            <strong className="text-red">{safeRemaining.toFixed(2)} ج.م</strong>
                        </div>
                    </div>

                    {/* Footer Note */}
                    <div className="sheet-footer-note">
                        <p>{printSettings?.footer_note || `نشكركم لتعاملكم معنا - ${printSettings?.workshop_name || 'ورشة العمل الحديثة'}`}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

