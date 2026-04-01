import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { adminDb } from '@/lib/firebase/admin';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const { type, data } = await request.json();

    // Mercado Pago notifies diverse events. We only care about payments.
    if (type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = data.id;
    const payment = new Payment(client);
    const result = await payment.get({ id: paymentId });

    if (result.status === 'approved') {
      const userId = result.external_reference;
      
      if (!userId) {
        console.error('Webhook: Missing userId in external_reference');
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
      }

      const planTitle = result.additional_info?.items?.[0]?.title || 'Pro';
      const planName = planTitle.split(' ').pop() || 'Mensal'; // "FocusOS - Plano Mensal" -> "Mensal"

      // Update Firestore securely with Admin SDK
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Default to 30 days

      await adminDb.collection('profiles').doc(userId).update({
        is_paid: true,
        subscription_plan: planName,
        subscription_expires_at: expiresAt.toISOString(),
      });

      console.log(`Webhook Success: User ${userId} upgraded to ${planName}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('MP Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
