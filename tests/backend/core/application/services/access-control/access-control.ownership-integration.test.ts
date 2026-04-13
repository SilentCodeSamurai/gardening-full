import "reflect-metadata";

import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import type { AccessAuditPort } from "@backend/core/application/ports/access/access-audit.port";
import { AccessForbiddenApplicationError } from "@backend/core/application/services/access-control/access-control.errors";
import {
	type WorkspaceRoleAssignmentRepositoryPort,
} from "#/backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/entities";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Access control ownership scenarios (unit)", () => {
	let svc: AccessControlApplicationService;
	let repo: WorkspaceRoleAssignmentRepositoryPort;
	let audit: AccessAuditPort;
	let assignments: WorkspaceRoleAssignmentEntity[];

	const makeAssignment = (params: {
		subject: SubjectVO;
		workspace: WorkspaceVO;
		role: WorkspaceRoleAssignmentEntity["role"];
	}): WorkspaceRoleAssignmentEntity =>
		({
			id: `${params.subject.toKey()}-${params.workspace.toKey()}` as never,
			createdAt: new Date(),
			updatedAt: new Date(),
			subject: params.subject,
			workspace: params.workspace,
			role: params.role,
		}) as WorkspaceRoleAssignmentEntity;

	beforeEach(() => {
		assignments = [];
		repo = {
			createOne: vi.fn(),
			createMany: vi.fn(),
			getOne: vi.fn(),
			getMany: vi.fn(async (input: Parameters<WorkspaceRoleAssignmentRepositoryPort["getMany"]>[0]) => {
				const clauses = input?.filters ?? [];
				if (!clauses.length) {
					return { items: [...assignments] };
				}
				const items = assignments.filter((row) =>
					clauses.some((clause: (typeof clauses)[number]) => {
						const subjectOk = clause.subject ? row.subject.equals(clause.subject) : true;
						const workspaceOk = clause.workspace ? row.workspace.equals(clause.workspace) : true;
						return subjectOk && workspaceOk;
					}),
				);
				return { items };
			}),
			updateOne: vi.fn(),
			updateMany: vi.fn(),
			deleteOne: vi.fn(async (input) => {
				const clause = input.filters[0];
				const idx = assignments.findIndex(
					(row) =>
						(clause.subject ? row.subject.equals(clause.subject) : true) &&
						(clause.workspace ? row.workspace.equals(clause.workspace) : true),
				);
				if (idx >= 0) {
					assignments.splice(idx, 1);
				}
				return "deleted-id" as never;
			}),
			deleteMany: vi.fn(),
			upsertOne: vi.fn(async (input) => {
				const existing = assignments.find(
					(row) => row.subject.equals(input.subject) && row.workspace.equals(input.workspace),
				);
				if (existing) {
					const updated = {
						...existing,
						role: input.role,
						updatedAt: new Date(),
					} as WorkspaceRoleAssignmentEntity;
					assignments = assignments.map((row) => (row.id === existing.id ? updated : row));
					return updated;
				}
				const created = makeAssignment({
					subject: input.subject,
					workspace: input.workspace,
					role: input.role,
				});
				assignments.push(created);
				return created;
			}),
		};
		audit = {
			recordRoleAssigned: vi.fn(),
			recordRoleRevoked: vi.fn(),
		};
		svc = new AccessControlApplicationService(repo, audit);
	});

	it("cross-workspace admin assignment does not authorize actions in another workspace", async () => {
		const alice = SubjectVO.user("alice");
		const bob = SubjectVO.user("bob");
		assignments.push(makeAssignment({ subject: alice, workspace: WorkspaceVO.user("alice"), role: "admin" }));
		assignments.push(makeAssignment({ subject: bob, workspace: WorkspaceVO.user("bob"), role: "admin" }));

		await expect(
			svc.assertCanPerformActionOnWorkspace({
				actorSubject: bob,
				activeWorkspaceScope: WorkspaceVO.user("alice"),
				action: "read",
			}),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
	});

	it("viewer role is denied mutation actions in owned workspace", async () => {
		const viewer = SubjectVO.user("viewer");
		const scope = WorkspaceVO.user("viewer");
		assignments.push(makeAssignment({ subject: viewer, workspace: scope, role: "viewer" }));

		await expect(
			svc.assertCanPerformActionOnWorkspace({
				actorSubject: viewer,
				activeWorkspaceScope: scope,
				action: "create",
			}),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
	});

	it("workspace admin can grant viewer role, viewer can read but not update", async () => {
		const owner = SubjectVO.user("owner");
		const guest = SubjectVO.user("guest");
		const scope = WorkspaceVO.user("owner");
		assignments.push(makeAssignment({ subject: owner, workspace: scope, role: "admin" }));

		await svc.assignWorkspaceRole({
			actorSubject: owner,
			targetSubject: guest,
			activeWorkspaceScope: scope,
			role: "viewer",
		});

		await expect(
			svc.assertCanPerformActionOnWorkspace({
				actorSubject: guest,
				activeWorkspaceScope: scope,
				action: "read",
			}),
		).resolves.toMatchObject({ allowed: true, matchedRole: "viewer" });
		await expect(
			svc.assertCanPerformActionOnWorkspace({
				actorSubject: guest,
				activeWorkspaceScope: scope,
				action: "update",
			}),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
	});

	it("viewer cannot delete in workspace", async () => {
		const viewer = SubjectVO.user("viewer-del");
		const scope = WorkspaceVO.user("owner-del");
		assignments.push(makeAssignment({ subject: viewer, workspace: scope, role: "viewer" }));

		await expect(
			svc.assertCanPerformActionOnWorkspace({
				actorSubject: viewer,
				activeWorkspaceScope: scope,
				action: "delete",
			}),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
	});
});
