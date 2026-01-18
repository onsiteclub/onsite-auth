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
    <div className="min-h-screen bg-onsite-bg flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold text-green-500 mb-2">Payment Successful!</h1>
        <p className="text-onsite-text-muted mb-4">
          Thank you for subscribing to {appDisplayName}.
        </p>
        {isMobileApp ? (
          <p className="text-onsite-text-muted text-sm">
            You can now return to the app.
          </p>
        ) : (
          <a href={returnUrl} className="text-onsite-accent hover:underline">
            Return to {appDisplayName}
          </a>
        )}
      </div>
    </div>
  );
}
