import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Home page - This auth hub has no human interface.
 * All access should be via API or direct checkout URLs from apps.
 * If someone lands here, redirect to manage page if logged in,
 * or show a simple message.
 */
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Logged in - redirect to manage subscriptions
    redirect('/manage');
  }

  // Not logged in - show simple message
  return (
    <div className="min-h-screen bg-onsite-bg flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-onsite-text mb-2">OnSite Auth Hub</h1>
        <p className="text-onsite-text-muted">
          This service handles authentication for OnSite apps.
        </p>
        <p className="text-onsite-text-muted mt-4 text-sm">
          Please use the app to access checkout.
        </p>
      </div>
    </div>
  );
}
