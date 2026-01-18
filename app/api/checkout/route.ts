import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, isValidApp, AppName } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { app, redirectUrl } = body;

    // Validate app
    if (!app || !isValidApp(app)) {
      return NextResponse.json(
        { error: 'App inválido' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from('billing_subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', user.id)
      .eq('app_name', app)
      .single();

    // If already active, don't allow new checkout
    if (existingSubscription?.status === 'active' || existingSubscription?.status === 'trialing') {
      return NextResponse.json(
        { error: 'Você já possui uma assinatura ativa para este app' },
        { status: 400 }
      );
    }

    // Create checkout session
    const session = await createCheckoutSession({
      app: app as AppName,
      userId: user.id,
      userEmail: user.email || '',
      customerId: existingSubscription?.stripe_customer_id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar sessão de checkout' },
      { status: 500 }
    );
  }
}
