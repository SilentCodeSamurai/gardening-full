import { IdentityRef, ResourceRef } from "@backend/core/domain/resource-access";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { resolveResourceAccessRepositoryPorts } from "./resolve-resource-access-repository-ports";

export function registerResoursePermissionRepositoryContract(
  adapterLabel: string,
  createContainer: () => DependencyContainer,
): void {
  describe(`ResoursePermissionRepository (${adapterLabel})`, () => {
    let repository: ReturnType<
      typeof resolveResourceAccessRepositoryPorts
    >["resoursePermission"];

    beforeEach(() => {
      const ports = resolveResourceAccessRepositoryPorts(createContainer());
      repository = ports.resoursePermission;
    });

    it("upsertRoleAssignment persists and listAssignmentsForSubject returns it", async () => {
      const subjectRef = IdentityRef.user("u1");
      const resource = ResourceRef.create({ type: "gardening.plant", id: "p1" });

      const created = await repository.upsertRoleAssignment({
        subjectRef,
        resourceRef: resource,
        role: "viewer",
        grantSource: "test",
      });

      const listed = await repository.listAssignmentsForSubject({ subjectRef });
      expect(listed.items).toHaveLength(1);
      expect(listed.items[0]?.id).toEqual(created.id);
      expect(listed.items[0]?.role).toBe("viewer");
    });

    it("upsertRoleAssignment is idempotent by (subjectRef, resourceRef, role)", async () => {
      const subjectRef = IdentityRef.user("u1");
      const resource = ResourceRef.create({ type: "gardening.plant", id: "p1" });

      const first = await repository.upsertRoleAssignment({
        subjectRef,
        resourceRef: resource,
        role: "admin",
      });
      const second = await repository.upsertRoleAssignment({
        subjectRef,
        resourceRef: resource,
        role: "admin",
      });

      expect(second.id).toEqual(first.id);
      const listed = await repository.listAssignmentsForSubject({ subjectRef });
      expect(listed.items).toHaveLength(1);
    });

    it("listAssignmentsForSubjects returns union for multiple subjects", async () => {
      const s1 = IdentityRef.user("u1");
      const s2 = IdentityRef.team("t1");
      await repository.upsertRoleAssignment({
        subjectRef: s1,
        resourceRef: ResourceRef.create({ type: "gardening.location", id: "l1" }),
        role: "viewer",
      });
      await repository.upsertRoleAssignment({
        subjectRef: s2,
        resourceRef: ResourceRef.create({ type: "gardening.location", id: "l2" }),
        role: "editor",
      });

      const listed = await repository.listAssignmentsForSubjects({
        subjectRefs: [s1, s2],
      });
      expect(listed.items).toHaveLength(2);
      const roles = listed.items.map((x) => x.role).sort();
      expect(roles).toEqual(["editor", "viewer"]);
    });

    it("revokeRoleAssignment removes only targeted assignment", async () => {
      const subjectRef = IdentityRef.user("u1");
      const plant = ResourceRef.create({ type: "gardening.plant", id: "p1" });
      const location = ResourceRef.create({ type: "gardening.location", id: "l1" });
      await repository.upsertRoleAssignment({
        subjectRef,
        resourceRef: plant,
        role: "viewer",
      });
      await repository.upsertRoleAssignment({
        subjectRef,
        resourceRef: location,
        role: "viewer",
      });

      await repository.revokeRoleAssignment({
        subjectRef,
        resourceRef: plant,
        role: "viewer",
      });

      const listed = await repository.listAssignmentsForSubject({ subjectRef });
      expect(listed.items).toHaveLength(1);
      expect(listed.items[0]?.resourceRef.id).toBe("l1");
    });

    it("listAssignmentsCoveringResources returns covering rows per concrete ref", async () => {
      const u = IdentityRef.user("u-cover");
      const concrete = ResourceRef.create({ type: "gardening.species", id: "sp-1" });
      const wildcard = ResourceRef.wildcard("gardening.species");
      await repository.upsertRoleAssignment({
        subjectRef: u,
        resourceRef: concrete,
        role: "viewer",
      });
      await repository.upsertRoleAssignment({
        subjectRef: u,
        resourceRef: wildcard,
        role: "admin",
      });

      const { coveringPerRef } = await repository.listAssignmentsCoveringResources({
        resourceRefs: [
          ResourceRef.create({ type: "gardening.species", id: "sp-1" }),
          ResourceRef.create({ type: "gardening.species", id: "sp-2" }),
          ResourceRef.create({ type: "gardening.location", id: "x" }),
        ],
      });

      expect(coveringPerRef).toHaveLength(3);
      expect(coveringPerRef[0]?.map((r) => r.role).sort()).toEqual(["admin", "viewer"]);
      expect(coveringPerRef[1]?.map((r) => r.role)).toEqual(["admin"]);
      expect(coveringPerRef[2]).toHaveLength(0);
    });
  });
}
