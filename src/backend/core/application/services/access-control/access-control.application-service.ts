import type { AccessAction } from "@backend/core/domain/access/access-action";
import type { AccessDecision } from "@backend/core/domain/access/access-decision";
import type { AccessRole } from "@backend/core/domain/access/access-role";
import { accessRoleAllows, accessRoleOrder } from "@backend/core/domain/access/access-role";
import type { SubjectVO } from "@backend/core/domain/access/subject.vo";
import type { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { WorkspaceRoleAssignmentEntity } from "#/backend/core/domain/access/workspace-role-assignment.entity";
import type { AccessAuditPort } from "../../ports/access/access-audit.port";
import type { WorkspaceRoleAssignmentRepositoryPort } from "../../ports/repositories/access/workspace-role-assignment.repository.port";
import { AccessForbiddenApplicationError } from "./access-control.errors";

export type AccessControlApplicationServiceAssignWorkspaceRoleInputDTO = {
	readonly actorSubject: SubjectVO;
	readonly targetSubject: SubjectVO;
	readonly activeWorkspaceScope: WorkspaceVO;
	readonly role: AccessRole;
	readonly grantSource?: string;
};

export type AccessControlApplicationServiceAssignWorkspaceRoleOutputDTO = WorkspaceRoleAssignmentEntity;

export type AccessControlApplicationServiceRevokeWorkspaceRoleInputDTO = {
	readonly actorSubject: SubjectVO;
	readonly targetSubject: SubjectVO;
	readonly activeWorkspaceScope: WorkspaceVO;
	readonly role: AccessRole;
};

export type AccessControlApplicationServiceRevokeWorkspaceRoleOutputDTO = {
	readonly success: boolean;
	readonly reason?: string;
};

export type AccessControlApplicationServiceAssertCanPerformActionOnWorkspaceInputDTO = {
	readonly actorSubject: SubjectVO;
	readonly activeWorkspaceScope: WorkspaceVO;
	readonly action: AccessAction;
};

export type AccessControlApplicationServiceAssertCanPerformActionOnWorkspaceOutputDTO = AccessDecision;

export class AccessControlApplicationService {
	constructor(
		private readonly workspaceRoleRepository: WorkspaceRoleAssignmentRepositoryPort,
		private readonly audit?: AccessAuditPort,
	) {}

	public async assignWorkspaceRole(
		input: AccessControlApplicationServiceAssignWorkspaceRoleInputDTO,
	): Promise<AccessControlApplicationServiceAssignWorkspaceRoleOutputDTO> {
		const action: AccessAction = "grantPermission";
		const accessDecision = await this.assertCanPerformActionOnWorkspace({
			actorSubject: input.actorSubject,
			activeWorkspaceScope: input.activeWorkspaceScope,
			action,
		});
		if (!accessDecision.allowed) {
			throw new AccessForbiddenApplicationError({
				reason: accessDecision.reasonCode,
				context: { action },
			});
		}
		const grantSource = `WORKSPACE_ROLE_ASSIGNMENT: ${input.actorSubject.toKey()} -> ${input.targetSubject.toKey()}`;
		const assignment = await this.workspaceRoleRepository.upsertWorkspaceRoleAssignment({
			subjectKey: input.targetSubject.toKey(),
			workspaceKey: input.activeWorkspaceScope.toKey(),
			role: input.role,
			grantSource,
		});
		this.audit?.recordRoleAssigned({
			actorSubjectKey: input.actorSubject.toKey(),
			targetSubjectKey: input.targetSubject.toKey(),
			workspaceKey: assignment.workspaceKey,
			role: assignment.role,
			grantSource,
		});
		return assignment;
	}

	public async revokeWorkspaceRole(
		input: AccessControlApplicationServiceRevokeWorkspaceRoleInputDTO,
	): Promise<AccessControlApplicationServiceRevokeWorkspaceRoleOutputDTO> {
		const action: AccessAction = "grantPermission";
		const accessDecision = await this.assertCanPerformActionOnWorkspace({
			actorSubject: input.actorSubject,
			activeWorkspaceScope: input.activeWorkspaceScope,
			action,
		});
		if (!accessDecision.allowed) {
			throw new AccessForbiddenApplicationError({
				reason: accessDecision.reasonCode,
				context: { action },
			});
		}
		await this.workspaceRoleRepository.revokeWorkspaceRoleAssignment({
			subjectKey: input.targetSubject.toKey(),
			workspaceKey: input.activeWorkspaceScope.toKey(),
			role: input.role,
		});
		this.audit?.recordRoleRevoked({
			actorSubjectKey: input.actorSubject.toKey(),
			targetSubjectKey: input.targetSubject.toKey(),
			workspaceKey: input.activeWorkspaceScope.toKey(),
			role: input.role,
		});
		return { success: true };
	}

	public async assertCanPerformActionOnWorkspace(
		input: AccessControlApplicationServiceAssertCanPerformActionOnWorkspaceInputDTO,
	): Promise<AccessDecision> {
		const accessDecision = await this.evaluateWorkspaceAccess({
			actorSubject: input.actorSubject,
			activeWorkspaceScope: input.activeWorkspaceScope,
			action: input.action,
		});
		if (!accessDecision.allowed) {
			throw new AccessForbiddenApplicationError({
				reason: accessDecision.reasonCode,
				context: { action: input.action },
			});
		}
		return accessDecision;
	}

	private async evaluateWorkspaceAccess(params: {
		actorSubject: SubjectVO;
		activeWorkspaceScope: WorkspaceVO;
		action: AccessAction;
	}): Promise<AccessDecision> {
		const isGlobalSharedWorkspace = params.activeWorkspaceScope.type === "globalShared";
		if (isGlobalSharedWorkspace) {
			if (params.actorSubject.type === "user" || params.actorSubject.type === "organization") {
				if (params.action === "read") {
					return { allowed: true, action: params.action, reasonCode: "ALLOW_ROLE", matchedRole: "viewer" };
				}
				return { allowed: false, action: params.action, reasonCode: "DENY_NO_MATCHING_ASSIGNMENT" };
			} else if (params.actorSubject.type === "serviceAccount") {
				return { allowed: true, action: params.action, reasonCode: "ALLOW_ROLE", matchedRole: "admin" };
			}
		}
		const { items: assignments } = await this.workspaceRoleRepository.getBySubjectAndWorkspace({
			subjectKey: params.actorSubject.toKey(),
			workspaceKey: params.activeWorkspaceScope.toKey(),
		});
		if (!assignments.length) {
			return { allowed: false, action: params.action, reasonCode: "DENY_NO_MATCHING_ASSIGNMENT" };
		}
		const highestAssignment = assignments.sort((a, b) => accessRoleOrder(b.role) - accessRoleOrder(a.role))[0];
		if (!accessRoleAllows(highestAssignment.role, params.action)) {
			return { allowed: false, action: params.action, reasonCode: "DENY_ROLE_MISSING_ACTION" };
		}
		return {
			allowed: true,
			action: params.action,
			reasonCode: "ALLOW_ROLE",
			matchedRole: highestAssignment.role,
		};
	}
}
