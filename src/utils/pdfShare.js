/**
 * Utility to generate PDF from an HTML element and share it directly to WhatsApp
 * using the Web Share API (Level 2 with files support), with seamless fallback.
 */

export async function loadHtml2Pdf() {
    if (window.html2pdf) return window.html2pdf;
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src*="html2pdf"]');
        if (existing) {
            // If it's already loading, wait for it
            const checkReady = setInterval(() => {
                if (window.html2pdf) {
                    clearInterval(checkReady);
                    resolve(window.html2pdf);
                }
            }, 100);
            existing.addEventListener('error', () => {
                clearInterval(checkReady);
                reject(new Error('فشل تحميل محرك الـ PDF'));
            });
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve(window.html2pdf);
        script.onerror = () => reject(new Error('فشل تحميل محرك الـ PDF من الإنترنت'));
        document.head.appendChild(script);
    });
}

export async function shareInvoicePdf({
    element,
    customerName,
    phoneNumber,
    serialNumber,
    workshopName
}) {
    if (!element) {
        throw new Error('عنصر الفاتورة غير موجود');
    }

    const html2pdf = await loadHtml2Pdf();
    if (!html2pdf) {
        throw new Error('محرك إنشاء ملفات الـ PDF غير متاح حالياً');
    }

    // Safe ASCII filename (avoid Arabic encoding issues in download)
    const cleanSerial = (serialNumber || 'INV-1001').replace(/[#\s]/g, '');
    const fileName = `Invoice_${cleanSerial}.pdf`;

    // Clone the element so we can apply print-safe styles without modifying the DOM
    const clone = element.cloneNode(true);

    // Apply forced print-safe styles to the clone
    clone.style.cssText = `
        width: 794px;
        padding: 24px 28px;
        background: #fff;
        color: #111;
        font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        font-size: 13px;
        direction: rtl;
        box-sizing: border-box;
    `;

    // Force 2-column grid on info grid and totals inside clone
    const infoGrid = clone.querySelector('.ps-info-grid');
    if (infoGrid) {
        infoGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;';
    }
    const totalsGrid = clone.querySelector('.ps-totals');
    if (totalsGrid) {
        totalsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;align-items:start;';
    }

    // Make sure items table is visible
    const itemsTable = clone.querySelector('.ps-items-table');
    if (itemsTable) itemsTable.style.display = 'table';

    // Temporarily append to body (off-screen) for rendering
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    document.body.appendChild(clone);

    const opt = {
        margin: [8, 10, 8, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
            width: 794,
            windowWidth: 794
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    let pdfBlob;
    try {
        pdfBlob = await html2pdf().set(opt).from(clone).outputPdf('blob');
    } finally {
        document.body.removeChild(clone);
    }

    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // Clean phone number for WhatsApp (Egypt format)
    let cleanPhone = (phoneNumber || '').replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('0') && !cleanPhone.startsWith('00')) {
        cleanPhone = '20' + cleanPhone.slice(1);
    }
    cleanPhone = cleanPhone.replace(/^\+/, '');

    const shareTitle = `فاتورة ${serialNumber || ''} - ${customerName || 'عميل'}`;
    const shareText = `مرفق كشف حساب فاتورة ${serialNumber || ''} (${workshopName || 'الورشة'})`;

    // 1. Try Native Web Share API with files (Android Chrome, iOS Safari)
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
            await navigator.share({
                files: [pdfFile],
                title: shareTitle,
                text: shareText
            });
            return { success: true, method: 'native_share' };
        } catch (shareErr) {
            if (shareErr.name === 'AbortError') {
                return { success: false, aborted: true };
            }
            console.warn('Native file share failed, falling back:', shareErr);
        }
    }

    // 2. Fallback: Download + open WhatsApp
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

    const waText = encodeURIComponent(`${shareText}\n(تم تحميل ملف الفاتورة PDF على جهازك لمشاركته)`);
    const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${waText}`
        : `https://wa.me/?text=${waText}`;
    window.open(waUrl, '_blank');

    return { success: true, method: 'download_and_whatsapp' };
}
