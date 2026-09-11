import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <p className="text-6xl font-display font-extrabold text-whisper-700 mb-4">404</p>
      <h1 className="text-xl font-bold text-ink-900 mb-2">Page not found</h1>
      <p className="text-sm text-ink-600 mb-6">The page you're looking for doesn't exist or has been moved.</p>
      <Link href="/" className="bg-whisper-700 text-white px-5 py-2.5 rounded-full font-semibold">
        Back to Home
      </Link>
    </div>
  );
}
