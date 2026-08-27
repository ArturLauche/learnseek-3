import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { contentItems } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ShareOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [item] = await db
    .select({
      title: contentItems.title,
      learningObjective: contentItems.learningObjective,
      visibility: contentItems.visibility,
      publicationState: contentItems.publicationState,
      deletedAt: contentItems.deletedAt,
    })
    .from(contentItems)
    .where(and(eq(contentItems.slug, slug), eq(contentItems.publicationState, "published"), eq(contentItems.visibility, "public"), isNull(contentItems.deletedAt)))
    .limit(1);
  if (!item) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", background: "#f4efe4", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
          Oriel
        </div>
      ),
      size,
    );
  }
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#f4efe4",
          color: "#2a2418",
          padding: 72,
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, textTransform: "uppercase" }}>Oriel</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 56, lineHeight: 1.15 }}>{item.title.slice(0, 90)}</div>
          <div style={{ fontSize: 28, color: "#5c5346" }}>{item.learningObjective.slice(0, 160)}</div>
        </div>
      </div>
    ),
    size,
  );
}
