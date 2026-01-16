'use client';

import { AuthCard, Button } from '@/components';
import {
  Calculator,
  Clock,
  LayoutDashboard,
  CheckCircle,
  ArrowRight,
  Settings,
  LogOut,
} from 'lucide-react';

interface Subscription {
  app: string;
  status: string;
}

interface HomeClientProps {
  userEmail: string;
  subscriptions: Subscription[];
}

const apps = [
  {
    id: 'calculator',
    name: 'OnSite Calculator',
    description: 'Calculadora profissional com reconhecimento de voz',
    icon: Calculator,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'timekeeper',
    name: 'OnSite Timekeeper',
    description: 'Controle de ponto e horas trabalhadas',
    icon: Clock,
    color: 'bg-green-100 text-green-600',
  },
  {
    id: 'dashboard',
    name: 'OnSite Dashboard',
    description: 'Dashboard completo com analytics',
    icon: LayoutDashboard,
    color: 'bg-purple-100 text-purple-600',
  },
];

export function HomeClient({ userEmail, subscriptions }: HomeClientProps) {
  const getSubscriptionStatus = (appId: string) => {
    const sub = subscriptions.find((s) => s.app === appId);
    return sub?.status || 'none';
  };

  const isActive = (status: string) => status === 'active' || status === 'trialing';

  return (
    <AuthCard title="OnSite Club" subtitle="Central de Assinaturas">
      {/* User Info */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-onsite-gray">
        <div className="text-sm text-onsite-text-secondary">
          Olá, <span className="font-medium text-onsite-dark">{userEmail}</span>
        </div>
        <a
          href="/logout"
          className="text-sm text-onsite-text-muted hover:text-onsite-dark flex items-center gap-1"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </a>
      </div>

      {/* Apps List */}
      <div className="space-y-4 mb-6">
        {apps.map((app) => {
          const status = getSubscriptionStatus(app.id);
          const hasAccess = isActive(status);
          const Icon = app.icon;

          return (
            <div
              key={app.id}
              className="border border-onsite-gray rounded-lg p-4 hover:border-onsite-accent transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${app.color}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-onsite-dark">{app.name}</h3>
                    {hasAccess && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-onsite-text-secondary mt-0.5">
                    {app.description}
                  </p>
                </div>

                {/* Action */}
                <div>
                  {hasAccess ? (
                    <a
                      href={`/manage?app=${app.id}`}
                      className="text-onsite-accent hover:underline text-sm flex items-center gap-1"
                    >
                      <Settings className="w-4 h-4" />
                      Gerenciar
                    </a>
                  ) : (
                    <a
                      href={`/checkout/${app.id}`}
                      className="text-onsite-accent hover:underline text-sm flex items-center gap-1"
                    >
                      Assinar
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="flex justify-center gap-4 text-sm">
        <a
          href="/manage"
          className="text-onsite-text-muted hover:text-onsite-accent flex items-center gap-1"
        >
          <Settings className="w-4 h-4" />
          Todas as assinaturas
        </a>
      </div>

      {/* Help */}
      <div className="mt-6 pt-4 border-t border-onsite-gray text-center">
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
