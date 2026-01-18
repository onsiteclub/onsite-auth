interface CheckoutMessageProps {
  type: 'error' | 'canceled';
  appDisplayName: string;
  retryUrl: string;
}

export function CheckoutMessage({ type, appDisplayName, retryUrl }: CheckoutMessageProps) {
  return (
    <div className="min-h-screen bg-onsite-bg flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {type === 'error' ? (
          <>
            <h1 className="text-xl font-bold text-red-500 mb-2">Checkout Error</h1>
            <p className="text-onsite-text-muted mb-4">
              An error occurred while starting the payment for {appDisplayName}.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-yellow-500 mb-2">Checkout Canceled</h1>
            <p className="text-onsite-text-muted mb-4">
              You canceled the checkout for {appDisplayName}.
            </p>
          </>
        )}
        <a href={retryUrl} className="text-onsite-accent hover:underline">
          Try again
        </a>
      </div>
    </div>
  );
}
