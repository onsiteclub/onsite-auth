import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Stripe Webhook Handler
 * Processes subscription events from Stripe
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Safely convert Unix timestamp to ISO string
 * Returns null if timestamp is invalid
 */
function safeTimestampToISO(timestamp: number | null | undefined): string | null {
  if (!timestamp || timestamp <= 0) return null;
  try {
    return new Date(timestamp * 1000).toISOString();
  } catch {
    return null;
  }
}

/**
 * Handle checkout.session.completed
 * Creates or updates subscription record when payment is successful
 * Also saves customer billing information
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const app = session.metadata?.app;
  let userId = session.metadata?.user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!app) {
    console.error('Missing app in session metadata');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Get customer details (includes address and phone)
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

  // If user_id not in metadata, resolve from Supabase Auth by email
  if (!userId && customer.email) {
    console.log(`[Webhook] No user_id in metadata, looking up by email: ${customer.email}`);
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUser = authData?.users?.find(u => u.email === customer.email);

    if (authUser) {
      userId = authUser.id;
      console.log(`[Webhook] Found user_id from Supabase Auth: ${userId}`);
    } else {
      console.error(`[Webhook] No user found in Supabase Auth for email: ${customer.email}`);
      throw new Error(`User not found in Supabase Auth for email: ${customer.email}`);
    }
  }

  // user_id is required at this point
  if (!userId) {
    console.error('[Webhook] No user_id available and no email to lookup');
    throw new Error('Cannot process subscription without user_id');
  }

  // Full subscription data with customer billing information
  const subscriptionData: Record<string, unknown> = {
    user_id: userId,
    app_name: app,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: subscription.items.data[0]?.price.id,
    status: subscription.status,
    current_period_start: safeTimestampToISO(subscription.current_period_start),
    current_period_end: safeTimestampToISO(subscription.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    // Customer contact info
    customer_email: customer.email,
    customer_name: customer.name,
    customer_phone: customer.phone,
    // Billing address
    billing_address_line1: customer.address?.line1,
    billing_address_line2: customer.address?.line2,
    billing_address_city: customer.address?.city,
    billing_address_state: customer.address?.state,
    billing_address_postal_code: customer.address?.postal_code,
    billing_address_country: customer.address?.country,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('billing_subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'user_id,app_name',
    });

  if (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }

  console.log(`Subscription created/updated for user ${userId}, app ${app}`);
  console.log(`Customer: ${customer.name}, ${customer.email}, ${customer.phone}`);
}

/**
 * Handle customer.subscription.updated
 * Updates subscription status when it changes
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const app = subscription.metadata?.app;
  const userId = subscription.metadata?.user_id;

  if (!app || !userId) {
    // Try to find by subscription ID
    const { data: existingSub } = await supabase
      .from('billing_subscriptions')
      .select('user_id, app_name')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!existingSub) {
      console.error('Could not find subscription record for:', subscription.id);
      return;
    }

    // Update using found record
    const { error } = await supabase
      .from('billing_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: safeTimestampToISO(subscription.current_period_start),
        current_period_end: safeTimestampToISO(subscription.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }

    console.log(`Subscription updated for subscription ${subscription.id}`);
    return;
  }

  const { error } = await supabase
    .from('billing_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: safeTimestampToISO(subscription.current_period_start),
      current_period_end: safeTimestampToISO(subscription.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('app_name', app);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  console.log(`Subscription updated for user ${userId}, app ${app}: ${subscription.status}`);
}

/**
 * Handle customer.subscription.deleted
 * Marks subscription as canceled when deleted
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const { error } = await supabase
    .from('billing_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error marking subscription as canceled:', error);
    throw error;
  }

  console.log(`Subscription canceled: ${subscription.id}`);
}

/**
 * Handle invoice.payment_failed
 * Updates subscription status to past_due
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  const { error } = await supabase
    .from('billing_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating subscription to past_due:', error);
    throw error;
  }

  console.log(`Payment failed for subscription: ${subscriptionId}`);
}
