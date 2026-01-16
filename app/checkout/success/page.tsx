import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isValidApp, getAppConfig } from '@/lib/stripe';
import { SuccessClient } from './SuccessClient';

interface SuccessPageProps {
  searchParams: Promise<{ app?: string; session_id?: string }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { app, session_id } = await searchParams;

  // Validate app
  if (!app || !isValidApp(app)) {
    redirect('/');
  }

  const appConfig = getAppConfig(app);
  if (!appConfig) {
    redirect('/');
  }

  // Check authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get return URL for the app
  const returnUrl = appConfig.successUrl;

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
