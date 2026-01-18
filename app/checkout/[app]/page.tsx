import { redirect } from 'next/navigation';
import { isValidApp, getAppConfig, createCheckoutSession, AppName } from '@/lib/stripe';
import { CheckoutMessage } from './CheckoutMessage';
import { validateCheckoutToken } from '@/lib/checkout-token';

interface CheckoutPageProps {
  params: { app: string };
  searchParams: {
    canceled?: string;
    token?: string;           // JWT token from app
    prefilled_email?: string; // Email for Stripe prefill
    redirect?: string;        // Return URL after checkout
  };
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { app } = params;
  const { canceled, token, prefilled_email, redirect: returnRedirect } = searchParams;

  // Validate app name
  if (!isValidApp(app)) {
    redirect('/');
  }

  const appConfig = getAppConfig(app);
  if (!appConfig) {
    redirect('/');
  }

  // Token is required - no fallback to session
  if (!token) {
    return (
      <div className="min-h-screen bg-onsite-bg flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-500 mb-2">Invalid Access</h1>
          <p className="text-onsite-text-muted">
            Please use the app to access checkout.
          </p>
        </div>
      </div>
    );
  }

  // Validate JWT token
  console.log('[Checkout] Validating token for app:', app);
  const tokenResult = await validateCheckoutToken(token);
  console.log('[Checkout] Token validation result:', JSON.stringify(tokenResult));

  if (!tokenResult.valid) {
    console.error('[Checkout] Invalid checkout token:', tokenResult.error);
    return (
      <CheckoutMessage
        type="error"
        appDisplayName={appConfig.displayName}
        retryUrl={`/checkout/${app}`}
      />
    );
  }

  // Validate that token app matches URL app
  if (tokenResult.app !== app) {
    console.error('Token app mismatch:', tokenResult.app, 'vs', app);
    return (
      <CheckoutMessage
        type="error"
        appDisplayName={appConfig.displayName}
        retryUrl={`/checkout/${app}`}
      />
    );
  }

  const userId = tokenResult.userId;
  const userEmail = prefilled_email || tokenResult.email;

  // If user canceled, show message with retry option
  if (canceled === 'true') {
    return (
      <CheckoutMessage
        type="canceled"
        appDisplayName={appConfig.displayName}
        retryUrl={`/checkout/${app}${token ? `?token=${token}` : ''}`}
      />
    );
  }

  // Create Stripe checkout session and redirect directly to Stripe
  let checkoutUrl: string | null = null;
  let checkoutError: Error | null = null;

  try {
    console.log('[Checkout] Creating Stripe session for:', { app, userId, userEmail, returnRedirect });
    const session = await createCheckoutSession({
      app: app as AppName,
      userId: userId,
      userEmail: userEmail,
      returnRedirect: returnRedirect,
    });
    console.log('[Checkout] Stripe session created:', session.id);
    checkoutUrl = session.url;
  } catch (error) {
    console.error('[Checkout] Stripe error:', error);
    checkoutError = error as Error;
  }

  // Handle error
  if (checkoutError || !checkoutUrl) {
    return (
      <CheckoutMessage
        type="error"
        appDisplayName={appConfig.displayName}
        retryUrl={`/checkout/${app}${token ? `?token=${token}` : ''}`}
      />
    );
  }

  // Redirect to Stripe (outside try/catch)
  redirect(checkoutUrl);
}
