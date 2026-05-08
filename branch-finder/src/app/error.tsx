"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Branch Finder error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-midnight mb-3">
          Something went wrong
        </h1>
        <p className="text-slate mb-6">
          We hit an unexpected error while loading the page. You can try again, and
          we&apos;ll keep things running.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-6 py-2 bg-midnight text-warm-white rounded-full hover:bg-navy transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-2 border border-midnight text-midnight rounded-full hover:bg-cream transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
