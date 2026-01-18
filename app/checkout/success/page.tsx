import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isValidApp, getAppConfig } from '@/lib/stripe';
import { SuccessClient } from './SuccessClient';

interface SuccessPageProps {
  searchParams: { app?: string; session_id?: string; redirect?: string };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { app, session_id, redirect: returnRedirect } = searchParams;

  // Validate app
  if (!app || !isValidApp(app)) {
    redirect('/');
  }

  const appConfig = getAppConfig(app);
  if (!appConfig) {
    redirect('/');
  }

  // Check authentication (only for web flow without redirect)
  // For mobile deep link flow, user may not have session cookie
  let needsAuth = false;
  if (!returnRedirect) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      needsAuth = true;
    }
  }

  if (needsAuth) {
    redirect('/login');
  }

  // Get return URL - prefer explicit redirect parameter over config
  const returnUrl = returnRedirect || appConfig.successUrl;

  // Check if it's a mobile deep link
  const isMobileApp = returnUrl.startsWith('onsiteclub://') ||
                      returnUrl.startsWith('onsitecalculator://') ||
                      returnUrl.startsWith('onsitetimekeeper://');

  return (
    <SuccessClient
      appDisplayName={appConfig.displayName}
      returnUrl={returnUrl}
      isMobileApp={isMobileApp}
      sessionId={session_id}
    />
  );
}
