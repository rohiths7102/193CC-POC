import { ImageResponse } from "next/og";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Member of the 193 Countries Consortium";

/** Branded OG card: what LinkedIn/WhatsApp/X show when a member shares
 *  their public profile link. */
export default async function OgImage({ params }: { params: { slug: string } }) {
  const member = await db.user.findFirst({
    where: { profileSlug: params.slug.toLowerCase(), profilePublic: true, role: "MEMBER" },
    include: { memberships: { where: { status: "ACTIVE" }, include: { product: true } } },
  });

  const award = member
    ? await db.slotApplication.findFirst({
        where: { userId: member.id, category: { kind: "AWARD" }, status: { notIn: ["CANCELLED", "EXPIRED"] } },
      })
    : null;

  const name = member?.company ?? member?.name ?? "193 Countries Consortium";
  const tier = member?.memberships[0]?.product.name;

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        backgroundColor: "#FFFFFF", padding: 64, justifyContent: "space-between",
        fontFamily: "Arial, sans-serif",
      }}>
        <div style={{ display: "flex", height: 10, width: "100%", borderRadius: 5,
          backgroundImage: "linear-gradient(90deg, #BA60A4, #9878B6, #0F9BD7)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", color: "#EF463B", fontSize: 26, letterSpacing: 8, textTransform: "uppercase" }}>
            193 Countries Consortium
          </div>
          <div style={{ display: "flex", color: "#2C3550", fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>
            {name}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {tier && (
              <div style={{ display: "flex", color: "#EF463B", fontSize: 26, border: "2px solid rgba(239,70,59,0.45)",
                borderRadius: 3, padding: "10px 26px" }}>{tier}</div>
            )}
            {award && (
              <div style={{ display: "flex", color: "#FFFFFF", fontSize: 26, backgroundColor: "#EF463B",
                borderRadius: 3, padding: "10px 26px" }}>
                Business Award {award.status === "CONFIRMED" ? "— Confirmed" : "— Nominated"}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", color: "#7B8397", fontSize: 24 }}>
          Summits at the House of Lords, UK Parliament · London
        </div>
      </div>
    ),
    size
  );
}
