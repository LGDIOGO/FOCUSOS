import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const { userId, planType, price } = await request.json();

    if (!userId || !planType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const preference = new Preference(client);
    
    const response = await preference.create({
      body: {
        items: [
          {
            id: `plan-${planType.toLowerCase()}`,
            title: `FocusOS - Plano ${planType}`,
            unit_price: Number(price),
            quantity: 1,
            currency_id: 'BRL',
          }
        ],
        external_reference: userId,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=success`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=failure`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=pending`,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
