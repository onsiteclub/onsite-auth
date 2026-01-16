import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HomeClient } from './HomeClient';

interface Subscription {
  app: string;
  status: string;
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in, redirect to login
    redirect('/login');
  }

  // Get user's subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('app, status')
    .eq('user_id', user.id);

  return (
    <HomeClient
      userEmail={user.email || ''}
      subscriptions={(subscriptions || []) as Subscription[]}
    />
  );
}
