import { describe, expect, it } from "vitest";

import { accessRoleAllows, accessRoleOrder } from "@backend/core/domain/access/types";

describe("access types helpers", () => {
  it("accessRoleAllows matches role permissions", () => {
    expect(accessRoleAllows("viewer", "read")).toBe(true);
    expect(accessRoleAllows("viewer", "update")).toBe(false);
    expect(accessRoleAllows("editor", "create")).toBe(true);
    expect(accessRoleAllows("editor", "delete")).toBe(false);
    expect(accessRoleAllows("admin", "grantPermission")).toBe(true);
  });

  it("accessRoleOrder sorts roles by strength", () => {
    expect(accessRoleOrder("viewer")).toBe(0);
    expect(accessRoleOrder("editor")).toBe(1);
    expect(accessRoleOrder("admin")).toBe(2);
  });
});
