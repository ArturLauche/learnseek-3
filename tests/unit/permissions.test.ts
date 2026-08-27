import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";

describe("rbac map", () => {
  it("gives learners create but not admin access", () => {
    expect(ROLE_PERMISSIONS.learner).toContain("content:create");
    expect(ROLE_PERMISSIONS.learner).not.toContain("admin:access");
  });
  it("gives superadmin destructive permission", () => {
    expect(ROLE_PERMISSIONS.superadmin).toContain("admin:destructive");
    expect(ROLE_PERMISSIONS.admin).not.toContain("admin:destructive");
  });
});
