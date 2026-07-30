import { PremiumShell } from "@/components/premium";

/** Every public page gets the premium layer: Lenis smooth scrolling, the
 *  custom gold cursor (fine pointers only) and the scroll progress hairline.
 *  The portal keeps native scrolling — data consoles favour precision. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PremiumShell>{children}</PremiumShell>;
}
