import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import {
	AccessForbiddenApplicationError,
} from "@backend/core/application/services/access-control/access-control.errors";
import type { WorkspaceRoleAssignmentRepositoryPort } from "#/backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { TOKENS } from "@backend/di/tokens";
import { describe, expect, it } from "vitest";

import { createAccessControlTestContainer } from "./create-access-control-test-container";

function makeService() {
	const c = createAccessControlTestContainer();
	const svc = c.resolve(AccessControlApplicationService);
	const repo = c.resolve<WorkspaceRoleAssignmentRepositoryPort>(TOKENS.WorkspaceRoleAssignmentRepositoryPort);
	return { svc, repo };
}

describe("AccessControlApplicationService", () => {
	describe("assertCanPerformActionOnWorkspace", () => {
		it("allows update when assignment matches workspace exactly (positive)", async () => {
			const { svc, repo } = makeService();
			const actor = SubjectVO.user("u1");
			const scope = WorkspaceVO.org("acme");
			await repo.upsertWorkspaceRoleAssignment({
				subjectKey: actor.toKey(),
				workspaceKey: scope.toKey(),
				role: "editor",
			});
			const d = await svc.assertCanPerformActionOnWorkspace({
				actorSubject: actor,
				activeWorkspaceScope: scope,
				action: "update",
			});
			expect(d.allowed).toBe(true);
			expect(d.matchedRole).toBe("editor");
		});

		it("denies delete when viewer role lacks action (negative)", async () => {
			const { svc, repo } = makeService();
			const actor = SubjectVO.user("u1");
			const scope = WorkspaceVO.user("u1");
			await repo.upsertWorkspaceRoleAssignment({
				subjectKey: actor.toKey(),
				workspaceKey: scope.toKey(),
				role: "viewer",
			});
			await expect(
				svc.assertCanPerformActionOnWorkspace({
					actorSubject: actor,
					activeWorkspaceScope: scope,
					action: "delete",
				}),
			).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		});

		it("denies update when viewer role lacks action (negative)", async () => {
			const { svc, repo } = makeService();
			const actor = SubjectVO.user("u-view");
			const scope = WorkspaceVO.user("u-view");
			await repo.upsertWorkspaceRoleAssignment({
				subjectKey: actor.toKey(),
				workspaceKey: scope.toKey(),
				role: "viewer",
			});
			await expect(
				svc.assertCanPerformActionOnWorkspace({
					actorSubject: actor,
					activeWorkspaceScope: scope,
					action: "update",
				}),
			).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		});

		it("denies create when viewer role lacks action (negative)", async () => {
			const { svc, repo } = makeService();
			const actor = SubjectVO.user("u-c");
			const scope = WorkspaceVO.user("u-c");
			await repo.upsertWorkspaceRoleAssignment({
				subjectKey: actor.toKey(),
				workspaceKey: scope.toKey(),
				role: "viewer",
			});
			await expect(
				svc.assertCanPerformActionOnWorkspace({
					actorSubject: actor,
					activeWorkspaceScope: scope,
					action: "create",
				}),
			).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		});

		it("denies read when there is no matching assignment (negative edge)", async () => {
			const { svc } = makeService();
			await expect(
				svc.assertCanPerformActionOnWorkspace({
					actorSubject: SubjectVO.user("u1"),
					activeWorkspaceScope: WorkspaceVO.user("u1"),
					action: "read",
				}),
			).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		});

		it("allows signed-in user to read global shared workspace (positive edge)", async () => {
			const { svc } = makeService();
			const d = await svc.assertCanPerformActionOnWorkspace({
				actorSubject: SubjectVO.user("alice"),
				activeWorkspaceScope: WorkspaceVO.globalShared(),
				action: "read",
			});
			expect(d.allowed).toBe(true);
			expect(d.matchedRole).toBe("viewer");
		});

		it("allows any service account full access on global shared workspace (positive edge)", async () => {
			const { svc } = makeService();
			const d = await svc.assertCanPerformActionOnWorkspace({
				actorSubject: SubjectVO.serviceAccount("worker"),
				activeWorkspaceScope: WorkspaceVO.globalShared(),
				action: "update",
			});
			expect(d.allowed).toBe(true);
			expect(d.matchedRole).toBe("admin");
		});
	});

	describe("assignWorkspaceRole / revokeWorkspaceRole", () => {
		it("assignWorkspaceRole grants workspace role when granter has admin", async () => {
			const { svc, repo } = makeService();
			const adminUser = SubjectVO.user("admin");
			const other = SubjectVO.user("other");
			const scope = WorkspaceVO.user("admin");
			await repo.upsertWorkspaceRoleAssignment({
				subjectKey: adminUser.toKey(),
				workspaceKey: scope.toKey(),
				role: "admin",
			});
			await svc.assignWorkspaceRole({
				actorSubject: adminUser,
				targetSubject: other,
				activeWorkspaceScope: scope,
				role: "viewer",
			});
			const d = await svc.assertCanPerformActionOnWorkspace({
				actorSubject: other,
				activeWorkspaceScope: scope,
				action: "read",
			});
			expect(d.allowed).toBe(true);
		});

		it("assignWorkspaceRole rejects editor without grantPermission", async () => {
			const { svc, repo } = makeService();
			const editor = SubjectVO.user("editor");
			const other = SubjectVO.user("other");
			const scope = WorkspaceVO.user("editor");
			await repo.upsertWorkspaceRoleAssignment({
				subjectKey: editor.toKey(),
				workspaceKey: scope.toKey(),
				role: "editor",
			});
			await expect(
				svc.assignWorkspaceRole({
					actorSubject: editor,
					targetSubject: other,
					activeWorkspaceScope: scope,
					role: "viewer",
				}),
			).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		});

		it("revokeWorkspaceRole removes target workspace assignment", async () => {
			const { svc, repo } = makeService();
			const adminUser = SubjectVO.user("admin");
			const other = SubjectVO.user("other");
			const scope = WorkspaceVO.user("admin");
			await repo.upsertWorkspaceRoleAssignment({
				subjectKey: adminUser.toKey(),
				workspaceKey: scope.toKey(),
				role: "admin",
			});
			await repo.upsertWorkspaceRoleAssignment({
				subjectKey: other.toKey(),
				workspaceKey: scope.toKey(),
				role: "viewer",
			});
			await svc.revokeWorkspaceRole({
				actorSubject: adminUser,
				targetSubject: other,
				activeWorkspaceScope: scope,
				role: "viewer",
			});
			await expect(
				svc.assertCanPerformActionOnWorkspace({
					actorSubject: other,
					activeWorkspaceScope: scope,
					action: "read",
				}),
			).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		});
	});
});
