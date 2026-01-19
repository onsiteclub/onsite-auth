import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /r/:code - Short code redirect for checkout
 *
 * Workaround for Capacitor bug where URLs with query params are truncated.
 * Calculator app generates short code, opens /r/code, and this route
 * validates and redirects to checkout with prefilled email.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createAdminClient();

  // 1. Busca código no Supabase
  const { data, error } = await supabase
    .from('checkout_codes')
    .select('*')
    .eq('code', code)
    .single();

  // 2. Código não existe
  if (error || !data) {
    console.error(`[/r/${code}] Invalid code:`, error?.message || 'not found');
    return NextResponse.redirect(
      new URL('/checkout/calculator?error=invalid_code', request.url)
    );
  }

  // 3. Código expirado (TTL 60s)
  if (new Date(data.expires_at) < new Date()) {
    console.log(`[/r/${code}] Expired code for ${data.email}`);
    return NextResponse.redirect(
      new URL('/checkout/calculator?error=expired_code', request.url)
    );
  }

  // 4. Código já usado (one-time)
  if (data.used) {
    console.log(`[/r/${code}] Already used code for ${data.email}`);
    return NextResponse.redirect(
      new URL('/checkout/calculator?error=used_code', request.url)
    );
  }

  // 5. Marca como usado (IMPORTANTE: fazer antes do redirect)
  const { error: updateError } = await supabase
    .from('checkout_codes')
    .update({ used: true })
    .eq('code', code);

  if (updateError) {
    console.error(`[/r/${code}] Failed to mark as used:`, updateError.message);
    // Continue anyway - better to let user checkout than block
  }

  // 6. Redirect para checkout com user_id e email
  const checkoutUrl = new URL(`/checkout/${data.app}`, request.url);
  checkoutUrl.searchParams.set('user_id', data.user_id);
  checkoutUrl.searchParams.set('prefilled_email', data.email);

  console.log(`[/r/${code}] Redirecting user ${data.user_id} (${data.email}) to ${data.app} checkout`);
  return NextResponse.redirect(checkoutUrl);
}
