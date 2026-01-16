'use client';

import { useState } from 'react';
import { AuthCard, Button, Alert } from '@/components';
import { CreditCard, Shield, CheckCircle } from 'lucide-react';

interface CheckoutClientProps {
  app: string;
  appDisplayName: string;
  userEmail: string;
  canceled: boolean;
  redirectUrl?: string;
}

export function CheckoutClient({
  app,
  appDisplayName,
  userEmail,
  canceled,
  redirectUrl,
}: CheckoutClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app,
          redirectUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar sessão de checkout');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setLoading(false);
    }
  };

  const features = getFeatures(app);

  return (
    <AuthCard
      title={`Assinar ${appDisplayName}`}
      subtitle="Desbloqueie todos os recursos premium"
    >
      {canceled && (
        <Alert type="warning" message="Checkout cancelado. Você pode tentar novamente quando quiser." className="mb-4" />
      )}

      {error && (
        <Alert type="error" message={error} className="mb-4" />
      )}

      {/* Features List */}
      <div className="bg-onsite-gray rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-onsite-dark mb-3">O que está incluso:</h3>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-onsite-text-secondary">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* User Info */}
      <div className="text-sm text-onsite-text-muted mb-4">
        <p>Assinando como: <span className="font-medium text-onsite-dark">{userEmail}</span></p>
      </div>

      {/* Checkout Button */}
      <Button
        onClick={handleCheckout}
        loading={loading}
        fullWidth
        variant="accent"
        className="mb-4"
      >
        <CreditCard className="w-5 h-5" />
        Continuar para Pagamento
      </Button>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-onsite-text-muted">
        <Shield className="w-4 h-4" />
        <span>Pagamento seguro via Stripe</span>
      </div>

      {/* Terms */}
      <p className="text-xs text-center text-onsite-text-muted mt-4">
        Ao continuar, você concorda com nossos{' '}
        <a href="/terms" className="text-onsite-accent hover:underline">
          Termos de Uso
        </a>{' '}
        e{' '}
        <a href="/privacy" className="text-onsite-accent hover:underline">
          Política de Privacidade
        </a>
        . Você pode cancelar sua assinatura a qualquer momento.
      </p>
    </AuthCard>
  );
}

function getFeatures(app: string): string[] {
  const featureMap: Record<string, string[]> = {
    calculator: [
      'Reconhecimento de voz para cálculos',
      'Cálculos avançados de construção',
      'Histórico ilimitado de operações',
      'Exportação de relatórios',
      'Suporte prioritário',
    ],
    timekeeper: [
      'Registro de ponto por voz',
      'Relatórios detalhados de horas',
      'Exportação para PDF e Excel',
      'Múltiplos projetos simultâneos',
      'Suporte prioritário',
    ],
    dashboard: [
      'Analytics avançados',
      'Relatórios customizados',
      'Acesso à API',
      'Integração com outros apps',
      'Suporte prioritário',
    ],
  };

  return featureMap[app] || ['Acesso a recursos premium', 'Suporte prioritário'];
}
