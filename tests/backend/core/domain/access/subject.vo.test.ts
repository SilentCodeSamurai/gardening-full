import { describe, expect, it } from "vitest";

import { SubjectKeyValidationError, SubjectVO, type SubjectKey } from "@backend/core/domain/access/subject.vo";

describe("SubjectVO", () => {
  it("round-trips user, organization and serviceAccount keys", () => {
    const user = SubjectVO.user("u-1");
    const organization = SubjectVO.organization("o-1");
    const serviceAccount = SubjectVO.serviceAccount("sa-1");

    expect(SubjectVO.fromKey(user.toKey()).equals(user)).toBe(true);
    expect(SubjectVO.fromKey(organization.toKey()).equals(organization)).toBe(true);
    expect(SubjectVO.fromKey(serviceAccount.toKey()).equals(serviceAccount)).toBe(true);
  });

  it("throws on malformed subject key", () => {
    expect(() => SubjectVO.fromKey("bad-key" as SubjectKey)).toThrow(SubjectKeyValidationError);
  });

  it("throws on invalid key version", () => {
    expect(() => SubjectVO.fromKey("v2:user:abc" as SubjectKey)).toThrow(SubjectKeyValidationError);
  });

  it("throws on invalid subject type", () => {
    expect(() => SubjectVO.fromKey("v1:bot:abc" as SubjectKey)).toThrow(SubjectKeyValidationError);
  });

  it("equals compares subject values", () => {
    expect(SubjectVO.user("u1").equals(SubjectVO.user("u1"))).toBe(true);
    expect(SubjectVO.user("u1").equals(SubjectVO.user("u2"))).toBe(false);
    expect(SubjectVO.user("u1").equals(SubjectVO.organization("u1"))).toBe(false);
  });
});
