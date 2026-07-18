import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { db } from "@/server/db";
import { storagePath } from "@/server/storage";

/** Unauthenticated asset serving, strictly limited to the logo/photo of
 *  profiles their owner has made PUBLIC. Everything else in storage stays
 *  behind the authenticated /api/files route. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const fileKey = key.join("/");

  const owner = await db.user.findFirst({
    where: {
      profilePublic: true,
      OR: [{ logoPath: fileKey }, { photoPath: fileKey }],
    },
    select: { id: true },
  });
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const buf = await readFile(storagePath(fileKey));
    return new NextResponse(buf, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Disposition": `inline; filename="${key[key.length - 1]}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
