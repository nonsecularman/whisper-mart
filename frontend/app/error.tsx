"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <p className="text-5xl font-display font-extrabold text-rose-500 mb-4">Oops</p>
      <h1 className="text-xl font-bold text-ink-900 mb-2">Something went wrong</h1>
      <p className="text-sm text-ink-600 mb-6">Please try again in a moment.</p>
      <button onClick={() => reset()} className="bg-whisper-700 text-white px-5 py-2.5 rounded-full font-semibold">
        Try Again
      </button>
    </div>
  );
}
