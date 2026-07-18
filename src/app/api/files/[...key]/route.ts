import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { currentUser } from "@/server/auth";
import { storagePath } from "@/server/storage";

/** Authenticated file serving for uploads (intent letters, images). */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { key } = await params;
  try {
    const buf = await readFile(storagePath(key.join("/")));
    return new NextResponse(buf, {
      headers: { "Content-Disposition": `inline; filename="${key[key.length - 1]}"` },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
