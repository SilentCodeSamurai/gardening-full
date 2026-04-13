import "reflect-metadata";

import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import {
	AccessForbiddenApplicationError,
} from "@backend/core/application/services/access-control/access-control.errors";
import type { AccessAuditPort } from "@backend/core/application/ports/access/access-audit.port";
import {
	type WorkspaceRoleAssignmentRepositoryPort,
} from "#/backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/entities";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("AccessControlApplicationService", () => {
	let svc: AccessControlApplicationService;
	let repo: WorkspaceRoleAssignmentRepositoryPort;
	let audit: AccessAuditPort;

	const makeAssignment = (params: {
		subject: SubjectVO;
		workspace: WorkspaceVO;
		role: WorkspaceRoleAssignmentEntity["role"];
	}): WorkspaceRoleAssignmentEntity =>
		({
			id: "assignment-id" as never,
			createdAt: new Date(),
			updatedAt: new Date(),
			subject: params.subject,
			workspace: params.workspace,
			role: params.role,
		}) as WorkspaceRoleAssignmentEntity;

	beforeEach(() => {
		repo = {
			createOne: vi.fn(),
			createMany: vi.fn(),
			getOne: vi.fn(),
			getMany: vi.fn(),
			updateOne: vi.fn(),
			updateMany: vi.fn(),
			deleteOne: vi.fn(),
			deleteMany: vi.fn(),
			upsertOne: vi.fn(),
		};
		audit = {
			recordRoleAssigned: vi.fn(),
			recordRoleRevoked: vi.fn(),
		};
		svc = new AccessControlApplicationService(repo, audit);
	});

	describe("assertCanPerformActionOnWorkspace", () => {
		it("allows update when assignment matches workspace exactly (positive)", async () => {
			const actor = SubjectVO.user("u1");
			const scope = WorkspaceVO.org("acme");
			(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({
				items: [makeAssignment({ subject: actor, workspace: scope, role: "editor" })],
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
			const actor = SubjectVO.user("u1");
			const scope = WorkspaceVO.user("u1");
			(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({
				items: [makeAssignment({ subject: actor, workspace: scope, role: "viewer" })],
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
			const actor = SubjectVO.user("u-view");
			const scope = WorkspaceVO.user("u-view");
			(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({
				items: [makeAssignment({ subject: actor, workspace: scope, role: "viewer" })],
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
			const actor = SubjectVO.user("u-c");
			const scope = WorkspaceVO.user("u-c");
			(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({
				items: [makeAssignment({ subject: actor, workspace: scope, role: "viewer" })],
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
			(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
			await expect(
				svc.assertCanPerformActionOnWorkspace({
					actorSubject: SubjectVO.user("u1"),
					activeWorkspaceScope: WorkspaceVO.user("u1"),
					action: "read",
				}),
			).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		});

		it("allows signed-in user to read global shared workspace (positive edge)", async () => {
			const d = await svc.assertCanPerformActionOnWorkspace({
				actorSubject: SubjectVO.user("alice"),
				activeWorkspaceScope: WorkspaceVO.globalShared(),
				action: "read",
			});
			expect(d.allowed).toBe(true);
			expect(d.matchedRole).toBe("viewer");
		});

		it("allows any service account full access on global shared workspace (positive edge)", async () => {
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
			const adminUser = SubjectVO.user("admin");
			const other = SubjectVO.user("other");
			const scope = WorkspaceVO.user("admin");
			const assigned = makeAssignment({
				subject: other,
				workspace: scope,
				role: "viewer",
			});
			(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({
				items: [makeAssignment({ subject: adminUser, workspace: scope, role: "admin" })],
			});
			(repo.upsertOne as ReturnType<typeof vi.fn>).mockResolvedValue(assigned);
			await svc.assignWorkspaceRole({
				actorSubject: adminUser,
				targetSubject: other,
				activeWorkspaceScope: scope,
				role: "viewer",
			});
			expect(repo.upsertOne).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: other,
					workspace: scope,
					role: "viewer",
				}),
			);
			expect(audit.recordRoleAssigned).toHaveBeenCalledTimes(1);
		});

		it("assignWorkspaceRole rejects editor without grantPermission", async () => {
			const editor = SubjectVO.user("editor");
			const other = SubjectVO.user("other");
			const scope = WorkspaceVO.user("editor");
			(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({
				items: [makeAssignment({ subject: editor, workspace: scope, role: "editor" })],
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
			const adminUser = SubjectVO.user("admin");
			const other = SubjectVO.user("other");
			const scope = WorkspaceVO.user("admin");
			(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({
				items: [makeAssignment({ subject: adminUser, workspace: scope, role: "admin" })],
			});
			await svc.revokeWorkspaceRole({
				actorSubject: adminUser,
				targetSubject: other,
				activeWorkspaceScope: scope,
				role: "viewer",
			});
			expect(repo.deleteOne).toHaveBeenCalledWith({
				filters: [{ subject: other, workspace: scope }],
			});
			expect(audit.recordRoleRevoked).toHaveBeenCalledTimes(1);
		});
	});
});
