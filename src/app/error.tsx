"use client";

import Link from "next/link";
import { Crest } from "@/components/logo";

/** Branded error boundary — a thrown server error previously rendered Next's
 *  unstyled default over the luxury shell. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Crest size={56} className="opacity-80" />
        <h1 className="mt-8 font-display text-4xl text-ivory-50">Something went wrong.</h1>
        <p className="mt-4 text-sm leading-7 text-mist">
          The fault is on our side. Try again — if it persists, the membership office can help.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
          <button
            onClick={reset}
            className="rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-2.5 text-sm font-medium text-ink-950 hover:shadow-glow"
          >
            Try again
          </button>
          <Link href="/" className="text-sm text-mist transition-colors hover:text-ivory-100">Back to site</Link>
        </div>
      </main>
    </div>
  );
}
