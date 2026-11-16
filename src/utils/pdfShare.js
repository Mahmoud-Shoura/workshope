/**
 * Utility to generate PDF from an HTML element and share it directly to WhatsApp
 * using the Web Share API (Level 2 with files support), with seamless fallback.
 */

export async function loadHtml2Pdf() {
    if (window.html2pdf) return window.html2pdf;
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src*="html2pdf"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.html2pdf));
            existing.addEventListener('error', () => reject(new Error('فشل تحميل محرك الـ PDF')));
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

    const cleanSerial = (serialNumber || 'INV-1001').replace(/[#\s]/g, '');
    const cleanCustomer = (customerName || 'عميل').replace(/[^\w\u0600-\u06FF]/g, '_');
    const fileName = `فاتورة_${cleanSerial}_${cleanCustomer}.pdf`;

    const opt = {
        margin: [8, 8, 8, 8],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
            windowWidth: 800 // Consistent layout regardless of screen width
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Generate PDF as Blob
    const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // Clean phone number for WhatsApp
    let cleanPhone = (phoneNumber || '').replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('0') && !cleanPhone.startsWith('00')) {
        cleanPhone = '20' + cleanPhone.slice(1);
    }
    cleanPhone = cleanPhone.replace(/^\+/, '');

    const shareTitle = `فاتورة ${serialNumber || ''} - ${customerName || 'عميل'}`;
    const shareText = `مرفق كشف حساب فاتورة ${serialNumber || ''} (${workshopName || 'الورشة'})`;

    // 1. Try Native Web Share API with files (Android Chrome, iOS Safari, etc.)
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
            await navigator.share({
                files: [pdfFile],
                title: shareTitle,
                text: shareText
            });
            return { success: true, method: 'native_share' };
        } catch (shareErr) {
            // If user closed the share dialog without sharing, don't trigger download
            if (shareErr.name === 'AbortError') {
                return { success: false, aborted: true };
            }
            console.warn('Native file share failed, falling back:', shareErr);
        }
    }

    // 2. Fallback: Download file and open WhatsApp chat
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    const waText = encodeURIComponent(`${shareText}\n(تم تحميل ملف الفاتورة PDF على جهازك لمشاركته)`);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waText}` : `https://wa.me/?text=${waText}`;
    window.open(waUrl, '_blank');

    return { success: true, method: 'download_and_whatsapp' };
}

