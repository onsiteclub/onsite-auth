'use client';

import { useEffect } from 'react';
import { AuthCard } from '@/components';
import { CheckCircle, Smartphone } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SuccessClientProps {
  appDisplayName: string;
  returnUrl: string;
  isMobileApp: boolean;
  sessionId?: string;
}

export function SuccessClient({
  appDisplayName,
}: SuccessClientProps) {

  // Confetti effect on mount
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F6C343', '#1B2B27', '#10B981'],
    });
  }, []);

  return (
    <AuthCard
      title="Payment Confirmed!"
      subtitle={`Your ${appDisplayName} subscription is now active`}
    >
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center mb-6">
        <p className="text-onsite-text-secondary mb-2">
          Thank you for subscribing! All premium features are now available.
        </p>
        <p className="text-sm text-onsite-text-muted">
          A receipt has been sent to your email.
        </p>
      </div>

      {/* Return Instructions */}
      <div className="bg-onsite-gray rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Smartphone className="w-5 h-5 text-onsite-accent" />
          <span className="font-medium text-onsite-dark">
            Return to App
          </span>
        </div>
        <p className="text-sm text-onsite-text-secondary">
          You can now return to the app and enjoy all premium features.
        </p>
      </div>

      {/* Info Text */}
      <p className="text-sm text-center text-onsite-text-muted mb-4">
        You may close this window and return to the application.
      </p>

      {/* Manage Subscription Link */}
      <div className="mt-6 pt-4 border-t border-onsite-gray">
        <p className="text-xs text-center text-onsite-text-muted">
          Need to manage your subscription?{' '}
          <a href="/manage" className="text-onsite-accent hover:underline">
            Click here
          </a>
        </p>
      </div>
    </AuthCard>
  );
}
