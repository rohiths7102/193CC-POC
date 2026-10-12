import { HomeView } from "@/views/home";

// Reads products and the next Summit live from the database on each request.
export const dynamic = "force-dynamic";

export const metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return <HomeView />;
}
