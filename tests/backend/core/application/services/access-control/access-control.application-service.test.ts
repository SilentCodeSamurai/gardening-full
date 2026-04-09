import { defaultWorkspaceRef } from "#/backend/core/application/resource-refs";
import type { UseCaseContext } from "#/backend/core/application/use-cases/use-case-context";
import { catalogPopulateServiceAccount } from "#/backend/core/application/service-accounts";
import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import {
	AccessForbiddenApplicationError,
	AccessScopeMismatchApplicationError,
	AccessSubjectNotResolvedApplicationError,
} from "@backend/core/application/services/access-control/access-control.errors";
import type { ResoursePermissionRepositoryPort } from "@backend/core/application/ports/repositories/resource-access/resourse-permission.repository.port";
import { IdentityRef, ResourceRef, TenantRef } from "@backend/core/domain/resource-access";
import { TOKENS } from "@backend/di/tokens";
import { describe, expect, it } from "vitest";

import { createAccessControlTestContainer } from "./create-access-control-test-container";

function makeService() {
	const c = createAccessControlTestContainer();
	const svc = c.resolve(AccessControlApplicationService);
	const repo = c.resolve<ResoursePermissionRepositoryPort>(TOKENS.ResoursePermissionRepositoryPort);
	return { svc, repo };
}

describe("AccessControlApplicationService", () => {
	describe("evaluateAccess — roles and actions", () => {
		it("viewer: read allowed; update/delete/grant denied with DENY_ROLE_MISSING_ACTION when assignment covers", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1");
			const res = ResourceRef.create({ type: "gardening.plant", id: "p1" });
			await repo.upsertRoleAssignment({ subjectRef: actor, resourceRef: res, role: "viewer" });

			expect((await svc.evaluateAccess({ actorRef: actor, action: "read", resourceRef: res })).allowed).toBe(
				true,
			);
			for (const action of ["update", "delete", "grantPermission"] as const) {
				const d = await svc.evaluateAccess({ actorRef: actor, action, resourceRef: res });
				expect(d.allowed).toBe(false);
				expect(d.reasonCode).toBe("DENY_ROLE_MISSING_ACTION");
			}
			const createOther = await svc.evaluateAccess({
				actorRef: actor,
				action: "create",
				resourceRef: res,
			});
			expect(createOther.allowed).toBe(false);
			expect(createOther.reasonCode).toBe("DENY_ROLE_MISSING_ACTION");
		});

		it("editor: read/create/update allowed on covered ref; delete and grant denied", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1");
			const res = ResourceRef.create({ type: "gardening.plant", id: "p1" });
			await repo.upsertRoleAssignment({ subjectRef: actor, resourceRef: res, role: "editor" });

			for (const action of ["read", "update"] as const) {
				expect(
					(await svc.evaluateAccess({ actorRef: actor, action, resourceRef: res })).allowed,
				).toBe(true);
			}
			for (const action of ["delete", "grantPermission"] as const) {
				const d = await svc.evaluateAccess({ actorRef: actor, action, resourceRef: res });
				expect(d.allowed).toBe(false);
				expect(d.reasonCode).toBe("DENY_ROLE_MISSING_ACTION");
			}
		});

		it("admin: all actions including grantPermission", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1");
			const res = ResourceRef.create({ type: "gardening.plant", id: "p1" });
			await repo.upsertRoleAssignment({ subjectRef: actor, resourceRef: res, role: "admin" });

			for (const action of ["read", "create", "update", "delete", "grantPermission"] as const) {
				expect(
					(await svc.evaluateAccess({ actorRef: actor, action, resourceRef: res })).allowed,
				).toBe(true);
			}
		});

		it("picks strongest role when multiple assignments cover the same resource", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1");
			const res = ResourceRef.create({ type: "gardening.plant", id: "p1" });
			await repo.upsertRoleAssignment({ subjectRef: actor, resourceRef: res, role: "viewer" });
			await repo.upsertRoleAssignment({ subjectRef: actor, resourceRef: res, role: "admin" });

			const d = await svc.evaluateAccess({ actorRef: actor, action: "delete", resourceRef: res });
			expect(d.allowed).toBe(true);
			expect(d.matchedRole).toBe("admin");
		});

		it("wildcard assignment covers concrete id of same type and tenant", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1");
			await repo.upsertRoleAssignment({
				subjectRef: actor,
				resourceRef: ResourceRef.wildcard("gardening.plant"),
				role: "viewer",
			});
			const concrete = ResourceRef.create({ type: "gardening.plant", id: "any-id" });
			const d = await svc.evaluateAccess({ actorRef: actor, action: "read", resourceRef: concrete });
			expect(d.allowed).toBe(true);
			expect(d.reasonCode).toBe("ALLOW_ROLE");
		});
	});

	describe("evaluateAccess — tenant alignment", () => {
		it("throws AccessScopeMismatchApplicationError when actor tenant differs from resource tenant", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1", TenantRef.of("tenant-a"));
			const res = ResourceRef.create({
				type: "gardening.plant",
				id: "p1",
				tenantRef: TenantRef.of("tenant-b"),
			});
			await repo.upsertRoleAssignment({ subjectRef: actor, resourceRef: res, role: "admin" });

			await expect(
				svc.evaluateAccess({ actorRef: actor, action: "read", resourceRef: res }),
			).rejects.toBeInstanceOf(AccessScopeMismatchApplicationError);
		});
	});

	describe("global shared read policy", () => {
		it("allows read for any actor when catalog-populate holds admin on resource", async () => {
			const { svc, repo } = makeService();
			const stranger = IdentityRef.user("stranger");
			const res = ResourceRef.create({ type: "gardening.species", id: "seeded-1" });
			await repo.upsertRoleAssignment({
				subjectRef: catalogPopulateServiceAccount,
				resourceRef: res,
				role: "admin",
			});
			const d = await svc.evaluateAccess({ actorRef: stranger, action: "read", resourceRef: res });
			expect(d.allowed).toBe(true);
			expect(d.reasonCode).toBe("ALLOW_GLOBAL_SHARED_READ");
		});

		it("does not allow update via global shared path for strangers", async () => {
			const { svc, repo } = makeService();
			const stranger = IdentityRef.user("stranger");
			const res = ResourceRef.create({ type: "gardening.species", id: "seeded-1" });
			await repo.upsertRoleAssignment({
				subjectRef: catalogPopulateServiceAccount,
				resourceRef: res,
				role: "admin",
			});
			const d = await svc.evaluateAccess({ actorRef: stranger, action: "update", resourceRef: res });
			expect(d.allowed).toBe(false);
			expect(d.reasonCode).toBe("DENY_NO_MATCHING_ASSIGNMENT");
		});
	});

	describe("denials", () => {
		it("denies when no assignment exists", async () => {
			const { svc } = makeService();
			const actor = IdentityRef.user("u1");
			const d = await svc.evaluateAccess({
				actorRef: actor,
				action: "read",
				resourceRef: ResourceRef.create({ type: "gardening.plant", id: "p1" }),
			});
			expect(d.allowed).toBe(false);
			expect(d.reasonCode).toBe("DENY_NO_MATCHING_ASSIGNMENT");
		});
	});

	describe("assertCan*", () => {
		it("assertCanCreate checks workspace scope", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1");
			const ws = defaultWorkspaceRef();
			await repo.upsertRoleAssignment({ subjectRef: actor, resourceRef: ws, role: "editor" });
			const ctx: UseCaseContext = { actorRef: actor, workspaceRef: ws };
			await expect(svc.assertCanCreate(ctx, ws)).resolves.toBeDefined();
		});

		it("assertCanRead throws AccessForbiddenApplicationError when denied", async () => {
			const { svc } = makeService();
			const ctx: UseCaseContext = {
				actorRef: IdentityRef.user("u1"),
				workspaceRef: defaultWorkspaceRef(),
			};
			await expect(
				svc.assertCanRead(ctx, ResourceRef.create({ type: "gardening.plant", id: "missing" })),
			).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		});
	});

	describe("getReadableResourceMask", () => {
		it("respects wildcard id", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1");
			await repo.upsertRoleAssignment({
				subjectRef: actor,
				resourceRef: ResourceRef.wildcard("gardening.species"),
				role: "viewer",
			});
			const mask = await svc.getReadableResourceMask({
				actorRef: actor,
				resourceType: "gardening.species",
			});
			expect(mask.includesAllOfType).toBe(true);
		});

		it("aggregates exact ids and ignores other resource types", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1");
			await repo.upsertRoleAssignment({
				subjectRef: actor,
				resourceRef: ResourceRef.create({ type: "gardening.plant", id: "a" }),
				role: "viewer",
			});
			await repo.upsertRoleAssignment({
				subjectRef: actor,
				resourceRef: ResourceRef.create({ type: "gardening.plant", id: "b" }),
				role: "editor",
			});
			await repo.upsertRoleAssignment({
				subjectRef: actor,
				resourceRef: ResourceRef.create({ type: "gardening.location", id: "loc-1" }),
				role: "viewer",
			});

			const mask = await svc.getReadableResourceMask({
				actorRef: actor,
				resourceType: "gardening.plant",
			});
			expect(mask.includesAllOfType).toBe(false);
			expect(new Set(mask.exactIds)).toEqual(new Set(["a", "b"]));
		});

		it("skips assignments whose resource tenant does not match actor tenant", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1", TenantRef.of("tenant-a"));
			await repo.upsertRoleAssignment({
				subjectRef: actor,
				resourceRef: ResourceRef.create({
					type: "gardening.plant",
					id: "x",
					tenantRef: TenantRef.of("tenant-b"),
				}),
				role: "viewer",
			});
			const mask = await svc.getReadableResourceMask({
				actorRef: actor,
				resourceType: "gardening.plant",
			});
			expect(mask.exactIds).toHaveLength(0);
			expect(mask.includesAllOfType).toBe(false);
		});
	});

	describe("assignRole / revokeRole", () => {
		it("assignRole grants read to subject when granter has admin", async () => {
			const { svc, repo } = makeService();
			const adminUser = IdentityRef.user("admin");
			const other = IdentityRef.user("other");
			const res = ResourceRef.create({ type: "gardening.plant", id: "p1" });
			await repo.upsertRoleAssignment({ subjectRef: adminUser, resourceRef: res, role: "admin" });
			const ctx: UseCaseContext = {
				actorRef: adminUser,
				workspaceRef: defaultWorkspaceRef(),
			};
			await svc.assignRole(ctx, { subjectRef: other, resourceRef: res, role: "viewer" });
			const d = await svc.evaluateAccess({ actorRef: other, action: "read", resourceRef: res });
			expect(d.allowed).toBe(true);
		});

		it("assignRole rejects when granter lacks grantPermission (editor)", async () => {
			const { svc, repo } = makeService();
			const editor = IdentityRef.user("editor");
			const other = IdentityRef.user("other");
			const res = ResourceRef.create({ type: "gardening.plant", id: "p1" });
			await repo.upsertRoleAssignment({ subjectRef: editor, resourceRef: res, role: "editor" });
			const ctx: UseCaseContext = {
				actorRef: editor,
				workspaceRef: defaultWorkspaceRef(),
			};
			await expect(
				svc.assignRole(ctx, { subjectRef: other, resourceRef: res, role: "viewer" }),
			).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		});

		it("revokeRole removes assignment", async () => {
			const { svc, repo } = makeService();
			const adminUser = IdentityRef.user("admin");
			const other = IdentityRef.user("other");
			const res = ResourceRef.create({ type: "gardening.plant", id: "p1" });
			await repo.upsertRoleAssignment({ subjectRef: adminUser, resourceRef: res, role: "admin" });
			await repo.upsertRoleAssignment({ subjectRef: other, resourceRef: res, role: "viewer" });
			const ctx: UseCaseContext = {
				actorRef: adminUser,
				workspaceRef: defaultWorkspaceRef(),
			};
			await svc.revokeRole(ctx, { subjectRef: other, resourceRef: res, role: "viewer" });
			const d = await svc.evaluateAccess({ actorRef: other, action: "read", resourceRef: res });
			expect(d.allowed).toBe(false);
		});
	});

	describe("bootstrapResourceAdminForActor", () => {
		it("is idempotent via upsert", async () => {
			const { svc, repo } = makeService();
			const actor = IdentityRef.user("u1");
			const ctx: UseCaseContext = {
				actorRef: actor,
				workspaceRef: defaultWorkspaceRef(),
			};
			const res = ResourceRef.create({ type: "gardening.plant", id: "p1" });
			await svc.bootstrapResourceAdminForActor(ctx, res);
			await svc.bootstrapResourceAdminForActor(ctx, res);
			const rows = await repo.listAssignmentsForSubject({ subjectRef: actor });
			expect(rows.items.filter((r) => r.resourceRef.id === "p1" && r.role === "admin")).toHaveLength(1);
		});
	});

	describe("subject expansion", () => {
		it("throws AccessSubjectNotResolvedApplicationError when expansion returns no subjects", async () => {
			const c = createAccessControlTestContainer({
				subjectExpansion: { expandSubjects: async () => [] },
			});
			const svc = c.resolve(AccessControlApplicationService);
			await expect(
				svc.evaluateAccess({
					actorRef: IdentityRef.user("u1"),
					action: "read",
					resourceRef: ResourceRef.create({ type: "gardening.plant", id: "p1" }),
				}),
			).rejects.toBeInstanceOf(AccessSubjectNotResolvedApplicationError);
		});
	});

	describe("static list helpers", () => {
		it("filterItemsByReadableMask returns all items when includesAllOfType", () => {
			const items = [{ id: "a" }, { id: "b" }];
			expect(AccessControlApplicationService.filterItemsByReadableMask(items, { exactIds: [], includesAllOfType: true })).toEqual(
				items,
			);
		});

		it("filterItemsByReadableMask filters by exactIds", () => {
			const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
			const out = AccessControlApplicationService.filterItemsByReadableMask(items, {
				exactIds: ["b"],
				includesAllOfType: false,
			});
			expect(out).toEqual([{ id: "b" }]);
		});

		it("filterReadableOrGlobalShared keeps systemCatalog rows outside the mask", () => {
			const items = [
				{ id: "a", systemCatalog: false },
				{ id: "b", systemCatalog: true },
			];
			const out = AccessControlApplicationService.filterReadableOrGlobalShared(items, {
				exactIds: ["a"],
				includesAllOfType: false,
			});
			expect(out.map((x) => x.id)).toEqual(["a", "b"]);
		});
	});
});
