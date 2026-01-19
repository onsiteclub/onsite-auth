import { redirect } from 'next/navigation';
import { isValidApp, getAppConfig, createCheckoutSession, AppName } from '@/lib/stripe';
import { CheckoutMessage } from './CheckoutMessage';
import { validateCheckoutToken } from '@/lib/checkout-token';

interface CheckoutPageProps {
  params: { app: string };
  searchParams: {
    canceled?: string;
    token?: string;
    user_id?: string; // From /r/[code] redirect (short code flow)
    prefilled_email?: string;
    redirect?: string;
    error?: string; // From /r/[code] redirect
  };
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { app } = params;
  const { canceled, token, user_id, prefilled_email, redirect: returnRedirect, error } = searchParams;

  // Validate app name
  if (!isValidApp(app)) {
    redirect('/');
  }

  const appConfig = getAppConfig(app);
  if (!appConfig) {
    redirect('/');
  }

  // Handle errors from /r/[code] redirect
  if (error) {
    const errorMessages: Record<string, { title: string; message: string }> = {
      invalid_code: {
        title: 'Invalid Link',
        message: 'This checkout link is invalid. Please try again from the app.',
      },
      expired_code: {
        title: 'Link Expired',
        message: 'This checkout link has expired. Please generate a new one from the app.',
      },
      used_code: {
        title: 'Link Already Used',
        message: 'This checkout link has already been used. Please generate a new one from the app.',
      },
    };
    const errorInfo = errorMessages[error] || {
      title: 'Error',
      message: 'An error occurred. Please try again from the app.',
    };
    return (
      <div className="min-h-screen bg-onsite-bg flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-500 mb-2">{errorInfo.title}</h1>
          <p className="text-onsite-text-muted">{errorInfo.message}</p>
        </div>
      </div>
    );
  }

  // Three valid flows:
  // 1. Email-only flow: prefilled_email from app (webhook resolves user_id via Supabase Auth)
  // 2. Short code flow: /r/[code] redirects with user_id + prefilled_email
  // 3. Token flow: Direct access with JWT token (legacy)

  let userId: string | undefined;
  let userEmail: string;

  if (prefilled_email) {
    // Email-only or short code flow
    // user_id is optional - webhook will resolve it from Supabase Auth if not provided
    console.log('[Checkout] Email flow for:', prefilled_email, 'user_id:', user_id || 'will be resolved by webhook');
    userId = user_id; // May be undefined, and that's OK
    userEmail = prefilled_email;
  } else if (token) {
    // Token flow - validate JWT (legacy support)
    console.log('[Checkout] Token flow, validating for app:', app);
    const tokenResult = await validateCheckoutToken(token);
    console.log('[Checkout] Token validation result:', JSON.stringify(tokenResult));

    if (!tokenResult.valid) {
      console.error('[Checkout] Invalid checkout token:', tokenResult.error);
      return <CheckoutMessage type="error" appDisplayName={appConfig.displayName} />;
    }

    // Validate that token app matches URL app
    if (tokenResult.app !== app) {
      console.error('Token app mismatch:', tokenResult.app, 'vs', app);
      return <CheckoutMessage type="error" appDisplayName={appConfig.displayName} />;
    }

    userId = tokenResult.userId;
    userEmail = tokenResult.email;
  } else {
    // No valid authentication - need at least an email
    return (
      <div className="min-h-screen bg-onsite-bg flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-500 mb-2">Invalid Access</h1>
          <p className="text-onsite-text-muted">Please use the app to access checkout.</p>
        </div>
      </div>
    );
  }

  // If user canceled
  if (canceled === 'true') {
    return <CheckoutMessage type="canceled" appDisplayName={appConfig.displayName} />;
  }

  // Create Stripe checkout session
  let stripeUrl: string | null = null;

  try {
    console.log('[Checkout] Creating Stripe session for:', { app, userId, userEmail, returnRedirect });
    const session = await createCheckoutSession({
      app: app as AppName,
      userId: userId,
      userEmail: userEmail,
      returnRedirect: returnRedirect,
    });
    console.log('[Checkout] Stripe session created:', session.id);
    stripeUrl = session.url;
  } catch (error) {
    console.error('[Checkout] Stripe error:', error);
    return <CheckoutMessage type="error" appDisplayName={appConfig.displayName} />;
  }

  if (stripeUrl) {
    redirect(stripeUrl);
  }

  return <CheckoutMessage type="error" appDisplayName={appConfig.displayName} />;
}
