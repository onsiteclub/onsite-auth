import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidApp } from '@/lib/stripe';

/**
 * GET /api/subscription/status?app=calculator
 *
 * Returns the subscription status for the authenticated user and specified app.
 * Used by client apps to check if user has access to premium features.
 *
 * Response:
 * - hasAccess: boolean - true if user has active subscription
 * - status: string - subscription status (active, trialing, canceled, etc.)
 * - expiresAt: string | null - when the current period ends
 * - cancelAtPeriodEnd: boolean - if subscription will cancel at period end
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const app = searchParams.get('app');

    // Validate app parameter
    if (!app || !isValidApp(app)) {
      return NextResponse.json(
        { error: 'App inválido', hasAccess: false },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado', hasAccess: false },
        { status: 401 }
      );
    }

    // Get subscription for this user and app
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .eq('app', app)
      .single();

    // No subscription found
    if (!subscription) {
      return NextResponse.json({
        hasAccess: false,
        status: 'none',
        expiresAt: null,
        cancelAtPeriodEnd: false,
      });
    }

    // Check if subscription grants access
    const hasAccess =
      (subscription.status === 'active' || subscription.status === 'trialing') &&
      (!subscription.current_period_end ||
        new Date(subscription.current_period_end) > new Date());

    return NextResponse.json({
      hasAccess,
      status: subscription.status,
      expiresAt: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar assinatura', hasAccess: false },
      { status: 500 }
    );
  }
}
