import Stripe from 'stripe';

/**
 * Stripe client instance
 * Uses the secret key for server-side operations
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

/**
 * App configuration with Stripe price IDs
 */
export type AppName = 'calculator' | 'timekeeper';

export interface AppConfig {
  name: string;
  displayName: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Get app configuration by name
 */
export function getAppConfig(app: AppName): AppConfig | null {
  const configs: Record<AppName, AppConfig> = {
    calculator: {
      name: 'calculator',
      displayName: 'OnSite Calculator Pro',
      priceId: process.env.STRIPE_PRICE_CALCULATOR || '',
      successUrl: process.env.NEXT_PUBLIC_CALCULATOR_URL || 'https://calc.onsiteclub.ca',
      cancelUrl: process.env.NEXT_PUBLIC_CALCULATOR_URL || 'https://calc.onsiteclub.ca',
    },
    timekeeper: {
      name: 'timekeeper',
      displayName: 'OnSite Timekeeper Pro',
      priceId: process.env.STRIPE_PRICE_TIMEKEEPER || '',
      successUrl: process.env.NEXT_PUBLIC_TIMEKEEPER_SCHEME || 'onsiteclub://timekeeper',
      cancelUrl: process.env.NEXT_PUBLIC_TIMEKEEPER_SCHEME || 'onsiteclub://timekeeper',
    },
  };

  return configs[app] || null;
}

/**
 * Validate if app name is valid
 */
export function isValidApp(app: string): app is AppName {
  return ['calculator', 'timekeeper'].includes(app);
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession({
  app,
  userId,
  userEmail,
  customerId,
}: {
  app: AppName;
  userId: string;
  userEmail: string;
  customerId?: string;
}): Promise<Stripe.Checkout.Session> {
  const appConfig = getAppConfig(app);

  if (!appConfig || !appConfig.priceId) {
    throw new Error(`Invalid app configuration for: ${app}`);
  }

  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'https://auth.onsiteclub.ca';

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: appConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: `${authUrl}/checkout/success?app=${app}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${authUrl}/checkout/${app}?canceled=true`,
    metadata: {
      app,
      user_id: userId,
    },
    subscription_data: {
      metadata: {
        app,
        user_id: userId,
      },
    },
    allow_promotion_codes: true,
    // Collect customer information
    billing_address_collection: 'required',
    phone_number_collection: {
      enabled: true,
    },
    // Note: customer_creation is not needed in subscription mode
    // Stripe automatically creates a customer for subscriptions
  };

  // If customer already exists, use their ID
  if (customerId) {
    sessionConfig.customer = customerId;
  } else {
    // Create new customer with user email
    sessionConfig.customer_email = userEmail;
  }

  return stripe.checkout.sessions.create(sessionConfig);
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Get subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}
