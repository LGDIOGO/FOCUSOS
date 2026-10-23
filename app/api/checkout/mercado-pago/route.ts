import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { authWithFirebaseToken } from '@/app/api/v1/_auth';
import { buildReference, getPlanPrice, isPlanName } from '@/lib/server/payments';
import { checkRateLimit } from '@/lib/server/rateLimit';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || ''
});

export async function POST(request: Request) {
  // O usuário vem do token verificado, nunca do corpo. O preço vem da tabela do servidor.
  const uid = await authWithFirebaseToken(request);
  if (!uid) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  if (!checkRateLimit(`checkout:${uid}`, 10, 60_000).ok) {
    return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
  }

  try {
    const { planType } = await request.json();

    if (!isPlanName(planType)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const price = getPlanPrice(planType);
    if (price === null) {
      console.error(`Checkout: preço do plano ${planType} não configurado (PLAN_PRICE_*)`);
      return NextResponse.json({ error: 'Pagamento indisponível no momento' }, { status: 503 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: [
          {
            id: `plan-${planType.toLowerCase()}`,
            title: `FocusOS - Plano ${planType}`,
            unit_price: price,
            quantity: 1,
            currency_id: 'BRL',
          }
        ],
        external_reference: buildReference(uid, planType),
        back_urls: {
          success: `${appUrl}/dashboard?payment=success`,
          failure: `${appUrl}/dashboard?payment=failure`,
          pending: `${appUrl}/dashboard?payment=pending`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.WEBHOOK_URL}/api/webhooks/mercadopago`,
      }
    });

    return NextResponse.json({
      id: response.id,
      init_point: response.init_point
    });

  } catch (error: any) {
    console.error('MP Checkout Error:', error);
    return NextResponse.json({ error: 'Falha ao iniciar o pagamento' }, { status: 500 });
  }
}
