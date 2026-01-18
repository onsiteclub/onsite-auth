import { redirect } from 'next/navigation';
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
