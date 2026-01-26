/**
 * تحويل الأرقام العربية النصية إلى أرقام
 * مثال: "مائة" → 100, "خمسين" → 50
 */
const arabicNumberWords = {
    'صفر': 0, 'واحد': 1, 'اتنين': 2, 'اثنين': 2, 'ثلاثة': 3, 'تلاتة': 3, 'أربعة': 4, 'اربعة': 4,
    'خمسة': 5, 'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
    'عشر': 10, 'عشرين': 20, 'ثلاثين': 30, 'أربعين': 40, 'اربعين': 40,
    'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'ثمانين': 80, 'تسعين': 90,
    'مية': 100, 'مائة': 100, 'مئة': 100, 'ميتين': 200, 'مائتين': 200,
    'تلاتمية': 300, 'ثلاثمائة': 300, 'اربعمية': 400, 'أربعمائة': 400,
    'خمسمية': 500, 'خمسمائة': 500, 'ستمية': 600, 'ستمائة': 600,
    'سبعمية': 700, 'سبعمائة': 700, 'تمانمية': 800, 'ثمانمائة': 800,
    'تسعمية': 900, 'تسعمائة': 900, 'ألف': 1000, 'الف': 1000
};

const quantityWords = {
    'واحد': 1, 'قطعة': 1, 'حتة': 1, 'حته': 1,
    'اتنين': 2, 'اثنين': 2, 'قطعتين': 2, 'حتتين': 2,
    'تلاتة': 3, 'ثلاثة': 3, 'تلت': 3,
    'اربعة': 4, 'أربعة': 4, 'اربع': 4, 'أربع': 4,
    'خمسة': 5, 'خمس': 5,
    'ستة': 6, 'ست': 6,
    'سبعة': 7, 'سبع': 7,
    'ثمانية': 8, 'تمانية': 8, 'ثمان': 8, 'تمان': 8,
    'تسعة': 9, 'تسع': 9,
    'عشرة': 10, 'عشر': 10
};

/**
 * تحويل الأرقام الهندية إلى إنجليزية
 */
function convertArabicNumerals(text) {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    let result = text;
    arabicNumerals.forEach((arabic, index) => {
        result = result.replace(new RegExp(arabic, 'g'), westernNumerals[index]);
    });
    
    return result;
}

/**
 * استخراج رقم من نص (يدعم الأرقام المكتوبة والهندية والإنجليزية)
 */
function extractNumber(text) {
    // تحويل الأرقام الهندية
    text = convertArabicNumerals(text);
    
    // البحث عن رقم مباشر
    const directNumber = text.match(/\d+(\.\d+)?/);
    if (directNumber) {
        return parseFloat(directNumber[0]);
    }
    
    // البحث عن كلمات عربية
    const words = text.split(/\s+/);
    let total = 0;
    let current = 0;
    
    for (const word of words) {
        const cleanWord = word.trim();
        if (arabicNumberWords[cleanWord] !== undefined) {
            const value = arabicNumberWords[cleanWord];
            if (value >= 100) {
                if (current === 0) current = 1;
                total += current * value;
                current = 0;
            } else {
                current += value;
            }
        }
    }
    
    total += current;
    return total > 0 ? total : null;
}

/**
 * استخراج الكمية من النص
 */
function extractQuantity(text) {
    // البحث عن كلمات الكمية
    const words = text.split(/\s+/);
    for (const word of words) {
        const cleanWord = word.trim();
        if (quantityWords[cleanWord] !== undefined) {
            return quantityWords[cleanWord];
        }
    }
    
    // البحث عن أرقام بعد كلمات مثل "عدد" أو "قطعة" أو "حتة"
    const qtyPatterns = [
        /(?:عدد|قطعة|قطع|حتة|حتت|حته)\s+(\w+)/,
        /(\w+)\s+(?:قطعة|قطع|حتة|حتت|حته)/
    ];
    
    for (const pattern of qtyPatterns) {
        const match = text.match(pattern);
        if (match) {
            const num = extractNumber(match[1]);
            if (num) return num;
        }
    }
    
    return 1; // القيمة الافتراضية
}

/**
 * تحليل المقاسات من النص الصوتي
 * يدعم أنماط مثل:
 * - "طول مائة عرض خمسين قطعتين"
 * - "مية في ستين عدد تلاتة"
 * - "خمسين في ستين تلت حتت" (النمط المباشر)
 * - "طول ٨٠ عرض ٦٠"
 */
export function parseVoiceMeasurements(transcript) {
    if (!transcript || typeof transcript !== 'string') {
        return null;
    }
    
    const text = transcript.trim().toLowerCase();
    
    // النمط 1: النمط المباشر "رقم في رقم [كمية]"
    // مثال: "خمسين في ستين تلت حتت" أو "50 في 60 تلاتة"
    const directPattern = /(\w+)\s+(?:في|×|x)\s+(\w+)(?:\s+(\w+(?:\s+\w+)?))?/;
    const directMatch = text.match(directPattern);
    
    if (directMatch) {
        const length = extractNumber(directMatch[1]);
        const width = extractNumber(directMatch[2]);
        const qty = directMatch[3] ? extractQuantity(directMatch[3]) : 1;
        
        if (length && width) {
            return {
                length,
                width,
                qty: qty || 1
            };
        }
    }
    
    // النمط 2: النمط التقليدي "طول ... عرض ..."
    // مثال: "طول مائة عرض خمسين قطعتين"
    const lengthPattern = /طول\s+(\w+(?:\s+\w+)?)/;
    const widthPattern = /عرض\s+(\w+(?:\s+\w+)?)/;
    
    const lengthMatch = text.match(lengthPattern);
    const widthMatch = text.match(widthPattern);
    
    let length = null;
    let width = null;
    let qty = extractQuantity(text);
    
    if (lengthMatch) {
        length = extractNumber(lengthMatch[1]);
    }
    
    if (widthMatch) {
        width = extractNumber(widthMatch[1]);
    }
    
    // إذا لم يتم العثور على طول وعرض، نحاول استخراج أول رقمين
    if (!length || !width) {
        const numbers = [];
        const numberMatches = text.matchAll(/\d+/g);
        for (const match of numberMatches) {
            numbers.push(parseFloat(match[0]));
        }
        
        if (numbers.length >= 2) {
            length = length || numbers[0];
            width = width || numbers[1];
        }
    }
    
    if (length && width) {
        return {
            length,
            width,
            qty: qty || 1
        };
    }
    
    return null;
}
