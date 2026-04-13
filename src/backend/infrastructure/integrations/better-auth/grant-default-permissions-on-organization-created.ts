import type { WorkspaceRoleAssignmentRepositoryPort } from "@backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { appContainer } from "@backend/di/app-container";
import { WorkspaceVO } from "#/backend/core/domain/access/workspace.vo";
import { TOKENS } from "#/backend/di/tokens";

/**
 * Grants the creator admin on the organization workspace scope.
 * @param data - Organization, member, and user from Better Auth `afterCreateOrganization`.
 */
export async function grantDefaultPermissionsOnOrganizationCreated(data: {
	organization: { id?: unknown };
	user: { id?: unknown };
}): Promise<void> {
	const userId = String(data.user.id ?? "").trim();
	const organizationId = String(data.organization.id ?? "").trim();
	if (userId.length < 1 || organizationId.length < 1) return;
	const creatorSubject = SubjectVO.user(userId);
	/** Must match {@link createUseCaseContextFromOrpc}: org workspace id is Better Auth organization id. */
	const orgWorkspace = WorkspaceVO.org(organizationId);
	const repository = appContainer.resolve<WorkspaceRoleAssignmentRepositoryPort>(
		TOKENS.WorkspaceRoleAssignmentRepositoryPort,
	);
	await repository.upsertOne({
		subjectKey: creatorSubject.toKey(),
		workspaceKey: orgWorkspace.toKey(),
		role: "admin",
		grantSource: "organization-created-default-creator-org-workspace-admin",
	});
}
