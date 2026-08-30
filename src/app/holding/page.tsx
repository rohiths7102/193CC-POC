import type { Metadata } from "next";
import { Roundel } from "@/components/logo";

/**
 * Holding page — shown in place of every public marketing route while the
 * site is under development (see the gate in src/middleware.ts).
 *
 * Deliberately shows nothing of the design: identity, one sentence, and the
 * registration. `noindex` keeps it out of search results, and because the
 * middleware REWRITES rather than redirects, that noindex applies to every
 * gated URL too — so nothing is indexed while the gate is up.
 */

export const metadata: Metadata = {
  title: "Under development — 193 Countries Consortium",
  description: "The 193 Countries Consortium website is currently under development.",
  robots: { index: false, follow: false },
};

export default function Holding() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-navy-deep px-6 text-center">
      <Roundel size={76} />
      <h1 className="mt-8 font-display text-[26px] font-thin uppercase tracking-[0.08em] text-white sm:text-[34px]">
        193 Countries Consortium
      </h1>
      <p className="mt-5 max-w-md text-[15px] leading-[1.75] text-white/65 sm:text-base">
        Our website is currently under development. Please check back shortly.
      </p>
      <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
        Companies House 14499310 · London
      </p>
    </main>
  );
}
