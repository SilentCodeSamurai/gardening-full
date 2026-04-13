import { describe, expect, it } from "vitest";

import {
  WorkspaceKeyValidationError,
  WorkspaceVO,
  type WorkspaceKey,
} from "@backend/core/domain/access/workspace.vo";

describe("WorkspaceVO", () => {
  it("round-trips user and org keys", () => {
    const user = WorkspaceVO.user("u-1");
    const org = WorkspaceVO.org("o-1");

    expect(WorkspaceVO.fromKey(user.toKey()).equals(user)).toBe(true);
    expect(WorkspaceVO.fromKey(org.toKey()).equals(org)).toBe(true);
  });

  it("recognizes global shared workspace helpers", () => {
    const global = WorkspaceVO.globalShared();
    expect(WorkspaceVO.isGlobalShared(global)).toBe(true);
    expect(WorkspaceVO.isGlobalSharedKey(global.toKey())).toBe(true);
  });

  it("throws on malformed key", () => {
    expect(() => WorkspaceVO.fromKey("bad-key" as WorkspaceKey)).toThrow(WorkspaceKeyValidationError);
  });

  it("throws on invalid key version", () => {
    expect(() => WorkspaceVO.fromKey("v2:user:abc" as WorkspaceKey)).toThrow(WorkspaceKeyValidationError);
  });

  it("throws on invalid workspace type", () => {
    expect(() => WorkspaceVO.fromKey("v1:team:abc" as WorkspaceKey)).toThrow(WorkspaceKeyValidationError);
  });

  it("equals compares all value object fields", () => {
    expect(WorkspaceVO.user("u1").equals(WorkspaceVO.user("u1"))).toBe(true);
    expect(WorkspaceVO.user("u1").equals(WorkspaceVO.user("u2"))).toBe(false);
    expect(WorkspaceVO.user("u1").equals(WorkspaceVO.org("u1"))).toBe(false);
  });
});
