import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isValidApp, getAppConfig } from '@/lib/stripe';
import { CheckoutClient } from './CheckoutClient';

interface CheckoutPageProps {
  params: Promise<{ app: string }>;
  searchParams: Promise<{ canceled?: string; redirect?: string }>;
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { app } = await params;
  const { canceled, redirect: redirectUrl } = await searchParams;

  // Validate app name
  if (!isValidApp(app)) {
    redirect('/');
  }

  const appConfig = getAppConfig(app);
  if (!appConfig) {
    redirect('/');
  }

  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(`/checkout/${app}`);
    redirect(`/login?redirect=${returnUrl}`);
  }

  // Check if user already has an active subscription for this app
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('app', app)
    .in('status', ['active', 'trialing'])
    .single();

  if (existingSubscription) {
    // User already has subscription, redirect to manage page
    redirect(`/manage?app=${app}`);
  }

  return (
    <CheckoutClient
      app={app}
      appDisplayName={appConfig.displayName}
      userEmail={user.email || ''}
      canceled={canceled === 'true'}
      redirectUrl={redirectUrl}
    />
  );
}
