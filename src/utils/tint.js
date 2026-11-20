// ألوان الفواتير والمجموعات: درجات هادية (hue) بترتيب بيبعّد كل لون عن اللي جنبه
export const TINT_HUES = [210, 30, 270, 170, 330, 50, 130, 245];

export const hueAt = (index) => {
    const n = Number.isFinite(Number(index)) ? Math.abs(Math.trunc(Number(index))) : 0;
    return TINT_HUES[n % TINT_HUES.length];
};

// لون الفاتورة بيتحدد من رقمها (#INV-1006 → نفس اللون دايماً في أي شاشة)
export const hueForSerial = (serial, fallback = '') => {
    const m = String(serial || '').match(/\d+/);
    if (m) return hueAt(parseInt(m[0], 10));
    let h = 0;
    for (const ch of String(fallback)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return hueAt(h);
};

// رقم لون المجموعة الجديدة = اللي بعد آخر لون مستخدم (عشان الألوان ماتتغيرش لو مسحت مجموعة)
export const nextColorIdx = (groups = []) =>
    groups.reduce((max, g, i) => Math.max(max, g.colorIdx ?? i), -1) + 1;