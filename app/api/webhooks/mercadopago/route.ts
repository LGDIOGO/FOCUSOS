import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { adminDb } from '@/lib/firebase/admin';
import { evaluatePayment, verifyMpSignature } from '@/lib/server/payments';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || ''
});

export async function POST(request: Request) {
  // Fail closed: sem segredo configurado, ninguém consegue liberar plano.
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Webhook MP: MP_WEBHOOK_SECRET não configurado');
    return NextResponse.json({ error: 'Webhook indisponível' }, { status: 503 });
  }

  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({} as any));
    const dataId = url.searchParams.get('data.id') || (body?.data?.id != null ? String(body.data.id) : null);

    const valid = verifyMpSignature({
      xSignature: request.headers.get('x-signature'),
      xRequestId: request.headers.get('x-request-id'),
      dataId,
      secret,
    });
    if (!valid) {
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }

    // Mercado Pago notifica vários eventos. Só interessa pagamento.
    if (body?.type !== 'payment' || !dataId) {
      return NextResponse.json({ received: true });
    }

    // Consulta o pagamento na API do MP (fonte da verdade), não confia no corpo.
    const result = await new Payment(client).get({ id: dataId });
    const decision = evaluatePayment({
      status: result.status,
      external_reference: result.external_reference,
      transaction_amount: result.transaction_amount,
      currency_id: result.currency_id,
    });

    if (!decision.ok) {
      if (decision.reason !== 'not_approved') {
        console.error(`Webhook MP: pagamento ${dataId} recusado (${decision.reason})`);
      }
      return NextResponse.json({ received: true });
    }

    // Idempotente: o mesmo pagamento nunca estende a assinatura duas vezes.
    const markerRef = adminDb.collection('mp_payments').doc(String(dataId));
    const profileRef = adminDb.collection('profiles').doc(decision.uid);
    const applied = await adminDb.runTransaction(async (tx) => {
      if ((await tx.get(markerRef)).exists) return false;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + decision.days);
      tx.set(markerRef, { user_id: decision.uid, plan: decision.plan, processed_at: new Date().toISOString() });
      tx.set(profileRef, {
        is_paid: true,
        subscription_plan: decision.plan,
        subscription_expires_at: expiresAt.toISOString(),
      }, { merge: true });
      return true;
    });

    if (applied) console.log(`Webhook MP: ${decision.uid} → ${decision.plan}`);
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('MP Webhook Error:', error);
    return NextResponse.json({ error: 'Falha ao processar webhook' }, { status: 500 });
  }
}
