import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/entities";
import type { SubjectVO } from "@backend/core/domain/access/subject.vo";
import type { AccessAction, AccessDecision, AccessRole } from "@backend/core/domain/access/types";
import { accessRoleAllows, accessRoleOrder } from "@backend/core/domain/access/types";
import type { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { inject, injectable } from "tsyringe";
import { type AccessAuditPort, AccessAuditPortToken } from "../../ports/access/access-audit.port";
import {
	type WorkspaceRoleAssignmentRepositoryPort,
	WorkspaceRoleAssignmentRepositoryPortToken,
} from "../../ports/repositories/access/workspace-role-assignment.repository.port";
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

@injectable()
export class AccessControlApplicationService {
	constructor(
		@inject(WorkspaceRoleAssignmentRepositoryPortToken)
		private readonly workspaceRoleRepository: WorkspaceRoleAssignmentRepositoryPort,
		@inject(AccessAuditPortToken)
		private readonly audit: AccessAuditPort,
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
		const assignment = await this.workspaceRoleRepository.upsertOne({
			subject: input.targetSubject,
			workspace: input.activeWorkspaceScope,
			role: input.role,
			grantSource,
		});
		this.audit.recordRoleAssigned({
			actorSubject: input.actorSubject,
			targetSubject: input.targetSubject,
			workspace: assignment.workspace,
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
		await this.workspaceRoleRepository.deleteOne({
			filters: [
				{
					subject: input.targetSubject,
					workspace: input.activeWorkspaceScope,
				},
			],
		});
		this.audit.recordRoleRevoked({
			actorSubject: input.actorSubject,
			targetSubject: input.targetSubject,
			workspace: input.activeWorkspaceScope,
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
		const { items: assignments } = await this.workspaceRoleRepository.getMany({
			filters: [
				{
					subject: params.actorSubject,
					workspace: params.activeWorkspaceScope,
				},
			],
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
