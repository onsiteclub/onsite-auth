import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ManageClient } from './ManageClient';

interface ManagePageProps {
  searchParams: Promise<{ app?: string }>;
}

interface Subscription {
  id: string;
  app: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export default async function ManagePage({ searchParams }: ManagePageProps) {
  const { app: filterApp } = await searchParams;

  // Check authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/manage');
  }

  // Get user's subscriptions
  let query = supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Filter by app if specified
  if (filterApp) {
    query = query.eq('app', filterApp);
  }

  const { data: subscriptions } = await query;

  return (
    <ManageClient
      subscriptions={(subscriptions || []) as Subscription[]}
      userEmail={user.email || ''}
      filterApp={filterApp}
    />
  );
}
