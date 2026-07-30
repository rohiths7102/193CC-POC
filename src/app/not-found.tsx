import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { Crest } from "@/components/logo";
import { PublicHeader, PublicFooter } from "@/components/public-chrome";

export const metadata = { title: "Page not found" };

/** Branded 404 — mistyped tier codes, stale membership links and unknown
 *  profile slugs previously fell through to Next's unstyled default. */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Crest size={56} className="opacity-80" />
        <h1 className="mt-8 font-display text-4xl text-ivory-50">This door isn&rsquo;t one of ours.</h1>
        <p className="mt-4 text-sm leading-7 text-mist">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
          <LinkButton href="/join">Become a member</LinkButton>
          <Link href="/" className="text-sm text-mist transition-colors hover:text-ivory-100">Back to site</Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
