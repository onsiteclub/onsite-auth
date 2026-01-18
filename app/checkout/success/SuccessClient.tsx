interface SuccessClientProps {
  appDisplayName: string;
  returnUrl: string;
  isMobileApp: boolean;
  sessionId?: string;
}

export function SuccessClient({
  appDisplayName,
  returnUrl,
  isMobileApp,
}: SuccessClientProps) {
  return (
    <div className="min-h-screen bg-onsite-bg flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-onsite-dark rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-onsite-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div>
          <span className="font-bold text-onsite-text">OnSite</span>
          <span className="text-onsite-accent text-xs block">CLUB</span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Payment Confirmed!
        </h1>
        <p className="text-gray-500 text-center mb-6">
          Your {appDisplayName} subscription is now active
        </p>

        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <p className="text-gray-600 text-center mb-2">
          Thank you for subscribing! All premium features are now available.
        </p>
        <p className="text-gray-400 text-sm text-center mb-6">
          A receipt has been sent to your email.
        </p>

        {/* Return to App Box */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-gray-400 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Return to App</p>
              <p className="text-gray-500 text-sm">
                You can now return to the app and enjoy all premium features.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-400">
              You may close this window and return to the application.
            </span>
          </div>
        </div>

        {/* Manage Subscription Link */}
        <p className="text-center text-sm text-gray-500">
          Need to manage your subscription?{' '}
          <a href="/manage" className="text-onsite-accent hover:underline">
            Click here
          </a>
        </p>
      </div>

      {/* Footer */}
      <p className="text-gray-400 text-sm mt-8">
        © 2026 OnSite Club. Todos os direitos reservados.
      </p>
    </div>
  );
}
