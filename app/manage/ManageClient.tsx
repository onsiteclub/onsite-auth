'use client';

import { useState } from 'react';
import { AuthCard, Button, Alert } from '@/components';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Settings,
} from 'lucide-react';

interface Subscription {
  id: string;
  app: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface ManageClientProps {
  subscriptions: Subscription[];
  userEmail: string;
  filterApp?: string;
}

const appDisplayNames: Record<string, string> = {
  calculator: 'OnSite Calculator Pro',
  timekeeper: 'OnSite Timekeeper Pro',
  dashboard: 'OnSite Dashboard Pro',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: {
    label: 'Ativa',
    color: 'text-green-600 bg-green-100',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  trialing: {
    label: 'Teste',
    color: 'text-blue-600 bg-blue-100',
    icon: <Clock className="w-4 h-4" />,
  },
  canceled: {
    label: 'Cancelada',
    color: 'text-gray-600 bg-gray-100',
    icon: <XCircle className="w-4 h-4" />,
  },
  past_due: {
    label: 'Pagamento Pendente',
    color: 'text-red-600 bg-red-100',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  inactive: {
    label: 'Inativa',
    color: 'text-gray-600 bg-gray-100',
    icon: <XCircle className="w-4 h-4" />,
  },
};

export function ManageClient({ subscriptions, userEmail, filterApp }: ManageClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleManagePortal = async (customerId: string) => {
    setLoading(customerId);
    setError(null);

    try {
      const response = await fetch('/api/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao abrir portal');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setLoading(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === 'active' || sub.status === 'trialing'
  );

  return (
    <AuthCard
      title="Minhas Assinaturas"
      subtitle="Gerencie suas assinaturas do OnSite Club"
    >
      {error && (
        <Alert type="error" message={error} className="mb-4" />
      )}

      {/* User Info */}
      <div className="text-sm text-onsite-text-muted mb-4">
        <p>
          Logado como: <span className="font-medium text-onsite-dark">{userEmail}</span>
        </p>
      </div>

      {/* Filter indicator */}
      {filterApp && (
        <div className="bg-onsite-gray rounded-lg px-3 py-2 mb-4 flex items-center justify-between">
          <span className="text-sm text-onsite-text-secondary">
            Mostrando: {appDisplayNames[filterApp] || filterApp}
          </span>
          <a href="/manage" className="text-xs text-onsite-accent hover:underline">
            Ver todas
          </a>
        </div>
      )}

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-onsite-text-muted mx-auto mb-4" />
          <p className="text-onsite-text-secondary mb-2">Nenhuma assinatura encontrada</p>
          <p className="text-sm text-onsite-text-muted mb-4">
            Você ainda não possui assinaturas ativas.
          </p>
          <Button variant="accent" onClick={() => (window.location.href = '/')}>
            Ver planos disponíveis
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => {
            const status = statusConfig[subscription.status] || statusConfig.inactive;
            const isActive = subscription.status === 'active' || subscription.status === 'trialing';

            return (
              <div
                key={subscription.id}
                className="border border-onsite-gray rounded-lg p-4 hover:border-onsite-accent transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-onsite-dark">
                      {appDisplayNames[subscription.app] || subscription.app}
                    </h3>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${status.color} mt-1`}>
                      {status.icon}
                      {status.label}
                      {subscription.cancel_at_period_end && isActive && (
                        <span className="ml-1">(cancela em breve)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details */}
                {subscription.current_period_end && isActive && (
                  <div className="flex items-center gap-2 text-sm text-onsite-text-secondary mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {subscription.cancel_at_period_end
                        ? `Acesso até: ${formatDate(subscription.current_period_end)}`
                        : `Próxima cobrança: ${formatDate(subscription.current_period_end)}`}
                    </span>
                  </div>
                )}

                {/* Actions */}
                {subscription.stripe_customer_id && (
                  <Button
                    variant="secondary"
                    onClick={() => handleManagePortal(subscription.stripe_customer_id!)}
                    loading={loading === subscription.stripe_customer_id}
                    className="w-full"
                  >
                    <Settings className="w-4 h-4" />
                    Gerenciar no Stripe
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {activeSubscriptions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-onsite-gray">
          <p className="text-sm text-onsite-text-muted text-center">
            Você tem {activeSubscriptions.length} assinatura
            {activeSubscriptions.length > 1 ? 's' : ''} ativa
            {activeSubscriptions.length > 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* Help */}
      <div className="mt-4 text-center">
        <p className="text-xs text-onsite-text-muted">
          Precisa de ajuda?{' '}
          <a href="mailto:suporte@onsiteclub.ca" className="text-onsite-accent hover:underline">
            Entre em contato
          </a>
        </p>
      </div>
    </AuthCard>
  );
}
