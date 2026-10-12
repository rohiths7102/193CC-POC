"use client";

import Link from "next/link";
import { Crest } from "@/components/logo";
import { Button } from "@/components/ui";

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
        {/* Use the shared Button: this was hand-rolled, so it bypassed btnSizes
            and stayed a 40px target — on the one control that recovers the page. */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
          <Button onClick={reset}>Try again</Button>
          <Link href="/" className="inline-flex min-h-11 items-center text-sm text-mist transition-colors hover:text-ivory-100 lg:min-h-0">Back to site</Link>
        </div>
      </main>
    </div>
  );
}
