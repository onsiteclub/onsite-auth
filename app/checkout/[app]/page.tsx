import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  // Determine user identity - prefer JWT token from app over session cookie
  let userId: string;
  let userEmail: string;

  if (token) {
    // App sent a JWT token - validate it
    const tokenResult = await validateCheckoutToken(token);

    if (!tokenResult.valid) {
      console.error('Invalid checkout token:', tokenResult.error);
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

    userId = tokenResult.userId;
    userEmail = prefilled_email || tokenResult.email;

  } else {
    // No token - fall back to session cookie (legacy flow)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(`/checkout/${app}`);
      redirect(`/login?redirect=${returnUrl}`);
    }

    userId = user.id;
    userEmail = user.email || '';
  }

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
    const session = await createCheckoutSession({
      app: app as AppName,
      userId: userId,
      userEmail: userEmail,
      returnRedirect: returnRedirect,
    });
    checkoutUrl = session.url;
  } catch (error) {
    console.error('Checkout error:', error);
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
