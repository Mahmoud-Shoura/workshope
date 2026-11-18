// @ts-nocheck
// supabase/functions/payment-webhook/index.ts
// بتستقبل نص SMS تحويل (فودافون كاش / انستا باي) وتفعّل الاشتراك المطابق تلقائياً.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// المبلغ ← الخطة والمدة (لازم تطابق الأسعار في SubscriptionBlock)
const PLANS: Record<number, { plan_id: string; days: number }> = {
    500: { plan_id: 'weekly', days: 7 },
    1000: { plan_id: 'monthly', days: 30 },
    9500: { plan_id: 'yearly', days: 365 },
};

const digits = (s: string) => (s || '').replace(/\D/g, '');

Deno.serve(async (req) => {
    // 1) سر مشترك: الموبايل بتاعك بس هو اللي يقدر يكلم الـ endpoint
    if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
        return new Response('unauthorized', { status: 401 });
    }

    const { message } = await req.json();
    if (!message) return new Response('no message', { status: 400 });

    // 2) استخراج المبلغ من الرسالة (عدّل الـ regex على شكل رسالتك الحقيقية)
    const amountMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(?:جنيه|ج\.م|EGP|LE)/i);
    const amount = amountMatch ? Math.round(Number(amountMatch[1].replace(',', '.'))) : NaN;
    const plan = PLANS[amount];
    if (!plan) return new Response('amount not matching any plan', { status: 200 });

    const sb = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 3) هات الدفعات المعلّقة بنفس المبلغ
    const { data: pendings, error } = await sb
        .from('payments')
        .select('id, subscription_id, transaction_ref')
        .eq('status', 'pending_review')
        .eq('amount', amount);
    if (error) return new Response(error.message, { status: 500 });

    // 4) طابق: رقم العملية (أو رقم تليفون المحوِّل) لازم يكون موجود في نص الرسالة
    const msgDigits = digits(message);
    const match = (pendings || []).find((p) => {
        const r = digits(p.transaction_ref);
        if (r.length < 6) return false;
        const key = r.length >= 10 ? r.slice(-10) : r; // تجاهل 0 / 20 في أول الرقم
        return msgDigits.includes(key);
    });
    if (!match) return new Response('no matching pending payment', { status: 200 });

    // 5) اقفل الدفعة الأول (الشرط status=pending_review يمنع التفعيل مرتين)
    const { data: claimed } = await sb
        .from('payments')
        .update({ status: 'confirmed' })
        .eq('id', match.id)
        .eq('status', 'pending_review')
        .select('id');
    if (!claimed?.length) return new Response('already processed', { status: 200 });

    // 6) فعّل الاشتراك (لو لسه ساري، كمّل من تاريخ نهايته)
    const { data: sub } = await sb
        .from('subscriptions')
        .select('status, end_date')
        .eq('id', match.subscription_id)
        .single();

    const now = Date.now();
    const currentEnd = sub?.status === 'active' && sub?.end_date ? new Date(sub.end_date).getTime() : 0;
    const base = Math.max(now, currentEnd);

    await sb
        .from('subscriptions')
        .update({
            status: 'active',
            plan_id: plan.plan_id,
            start_date: new Date(now).toISOString(),
            end_date: new Date(base + plan.days * 86400000).toISOString(),
        })
        .eq('id', match.subscription_id);

    return new Response('ok');
});