"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="max-w-lg mx-auto px-4 py-24 text-center font-sans">
          <p className="text-6xl font-extrabold text-rose-500 mb-4">500</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-600 mb-6">
            We hit an unexpected error. Please try again — if the problem persists, contact support.
          </p>
          <button onClick={() => reset()} className="bg-purple-700 text-white px-5 py-2.5 rounded-full font-semibold">
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
