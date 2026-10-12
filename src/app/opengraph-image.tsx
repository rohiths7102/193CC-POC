import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "193 Countries Consortium — UK business membership · House of Lords events · UK Investors Summit";

/** Site-wide OG card: what LinkedIn/WhatsApp/X show when anyone shares the
 *  homepage, /join or a tier page. Static brand card — no DB required. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          backgroundColor: "#FFFFFF", padding: 64, justifyContent: "space-between",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* The rule keeps the consortium's own brand gradient — that mark is the
            client's identity, not part of the LSI language being adopted. */}
        <div style={{ display: "flex", height: 10, width: "100%", borderRadius: 5,
          backgroundImage: "linear-gradient(90deg, #BA60A4, #9878B6, #0F9BD7)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", color: "#EF463B", fontSize: 26, letterSpacing: 8, textTransform: "uppercase" }}>
            Membership · London
          </div>
          <div style={{ display: "flex", color: "#2C3550", fontSize: 84, fontWeight: 700, lineHeight: 1.04 }}>
            193 Countries Consortium
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
            <div style={{ display: "flex", color: "#FFFFFF", backgroundColor: "#EF463B", fontSize: 25,
              borderRadius: 3, padding: "10px 26px" }}>House of Lords Events</div>
            <div style={{ display: "flex", color: "#EF463B", fontSize: 25, border: "2px solid rgba(239,70,59,0.45)",
              borderRadius: 3, padding: "10px 26px" }}>UK Investors Summit</div>
          </div>
        </div>
        <div style={{ display: "flex", color: "#7B8397", fontSize: 24 }}>
          Enterprises from 193 countries · Est. London 2022 · Companies House 14499310
        </div>
      </div>
    ),
    size
  );
}
