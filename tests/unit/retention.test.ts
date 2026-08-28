import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canPurgeAnalytics,
  canPurgeDeletedAccount,
  canPurgeGenerationArtifact,
  isExpiredSession,
  isHoldStatus,
  isOlderThan,
  parseRetentionPolicy,
  RETENTION_PROTECTED,
} from "@/lib/privacy/retention-policy";

const now = new Date("2026-08-27T12:00:00.000Z");

describe("retention policy parsing", () => {
  it("reads nested periods and falls back to retentionDays", () => {
    expect(parseRetentionPolicy({ retentionDays: 400 }).analyticsDays).toBe(400);
    expect(parseRetentionPolicy({ retention: { analyticsDays: 90, searchesDays: 14 } }).searchesDays).toBe(14);
    expect(parseRetentionPolicy({}).sessionsDays).toBe(0);
  });
});

describe("eligibility", () => {
  it("purges sessions after expiry plus grace", () => {
    expect(isExpiredSession(new Date("2026-08-26T12:00:00.000Z"), now, 0)).toBe(true);
    expect(isExpiredSession(new Date("2026-08-28T12:00:00.000Z"), now, 0)).toBe(false);
    expect(isExpiredSession(new Date("2026-08-26T12:00:00.000Z"), now, 7)).toBe(false);
  });

  it("does not purge analytics or remnants under legal holds", () => {
    const heldContent = new Set(["item-held"]);
    const heldUsers = new Set(["user-held"]);
    expect(
      canPurgeAnalytics({
        createdAt: new Date("2020-01-01"),
        now,
        analyticsDays: 30,
        contentItemId: "item-held",
        userId: "other",
        heldContentIds: heldContent,
        heldUserIds: heldUsers,
      }),
    ).toBe(false);
    expect(
      canPurgeDeletedAccount({
        status: "deleted",
        deletedAt: new Date("2020-01-01"),
        now,
        deletedAccountDays: 1,
        hasOpenAppeal: true,
      }),
    ).toBe(false);
    expect(
      canPurgeDeletedAccount({
        status: "deleted",
        deletedAt: new Date("2020-01-01"),
        now,
        deletedAccountDays: 1,
        hasOpenAppeal: false,
      }),
    ).toBe(true);
  });

  it("keeps published compiled artifacts and held content", () => {
    expect(
      canPurgeGenerationArtifact({
        createdAt: new Date("2020-01-01"),
        now,
        generationArtifactsDays: 1,
        compileState: "compiled",
        contentHeld: false,
        published: true,
      }),
    ).toBe(false);
    expect(
      canPurgeGenerationArtifact({
        createdAt: new Date("2020-01-01"),
        now,
        generationArtifactsDays: 1,
        compileState: "failed",
        contentHeld: true,
        published: false,
      }),
    ).toBe(false);
    expect(
      canPurgeGenerationArtifact({
        createdAt: new Date("2020-01-01"),
        now,
        generationArtifactsDays: 1,
        compileState: "failed",
        contentHeld: false,
        published: false,
      }),
    ).toBe(true);
  });

  it("treats reviewing appeals and triaging reports as holds", () => {
    expect(isHoldStatus("appeal", "reviewing")).toBe(true);
    expect(isHoldStatus("appeal", "denied")).toBe(false);
    expect(isHoldStatus("report", "triaging")).toBe(true);
    expect(isHoldStatus("case", "held")).toBe(true);
    expect(isOlderThan(new Date("2026-08-01"), 90, now)).toBe(false);
  });
});

describe("audit tables stay protected", () => {
  it("never issues deletes against hold/audit tables", () => {
    const src = readFileSync(resolve("lib/privacy/purge.ts"), "utf8");
    for (const table of RETENTION_PROTECTED) {
      expect(RETENTION_PROTECTED).toContain(table);
    }
    expect(src).not.toMatch(/db\.delete\(appeals\)/);
    expect(src).not.toMatch(/db\.delete\(moderationCases\)/);
    expect(src).not.toMatch(/db\.delete\(reports\)/);
    expect(src).not.toMatch(/db\.delete\(takedownRequests\)/);
    expect(src).not.toMatch(/db\.delete\(auditEvents\)/);
    expect(src).not.toMatch(/db\.delete\(administratorActions\)/);
    expect(src).not.toMatch(/db\.delete\(moderationFindings\)/);
  });
});
