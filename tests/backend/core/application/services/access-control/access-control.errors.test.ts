import { describe, expect, it } from "vitest";

import {
  AccessForbiddenApplicationError,
  AccessScopeMismatchApplicationError,
  AccessSubjectNotResolvedApplicationError,
} from "@backend/core/application/services/access-control/access-control.errors";

describe("access-control errors", () => {
  it("AccessForbiddenApplicationError captures reason and context", () => {
    const err = new AccessForbiddenApplicationError({
      reason: "DENY_ROLE_MISSING_ACTION",
      context: { action: "update" },
    });

    expect(err.code).toBe("ACCESS_DENIED");
    expect(err.useCaseName).toBe("AccessControlApplicationService");
    expect(err.accessReason).toBe("DENY_ROLE_MISSING_ACTION");
    expect(err.context).toMatchObject({
      action: "update",
      reason: "DENY_ROLE_MISSING_ACTION",
    });
  });

  it("AccessScopeMismatchApplicationError is BAD_REQUEST", () => {
    const err = new AccessScopeMismatchApplicationError({ context: { workspace: "w1" } });
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.message).toBe("Tenant or scope mismatch");
    expect(err.context).toMatchObject({ workspace: "w1" });
  });

  it("AccessSubjectNotResolvedApplicationError is BAD_REQUEST", () => {
    const err = new AccessSubjectNotResolvedApplicationError({ context: { subject: "s1" } });
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.message).toBe("Subject expansion could not be resolved");
    expect(err.context).toMatchObject({ subject: "s1" });
  });
});
