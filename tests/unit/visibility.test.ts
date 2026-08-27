import { describe, expect, it } from "vitest";
import { canPublish, isPubliclyVisible } from "@/lib/content/visibility";

describe("content visibility", () => {
  it("hides drafts and rejected items from the public feed", () => {
    expect(
      isPubliclyVisible({
        publicationState: "draft",
        visibility: "public",
        moderationState: "auto_approved",
        deletedAt: null,
      }),
    ).toBe(false);
    expect(
      isPubliclyVisible({
        publicationState: "published",
        visibility: "public",
        moderationState: "auto_approved",
        deletedAt: null,
      }),
    ).toBe(true);
  });

  it("requires sources before publishing sensitive classes", () => {
    expect(
      canPublish({
        moderationState: "auto_approved",
        publicationState: "draft",
        hasSources: false,
        safetyClass: "health",
        schemaValid: true,
      }).ok,
    ).toBe(false);
    expect(
      canPublish({
        moderationState: "auto_approved",
        publicationState: "draft",
        hasSources: true,
        safetyClass: "health",
        schemaValid: true,
      }).ok,
    ).toBe(true);
  });
});
