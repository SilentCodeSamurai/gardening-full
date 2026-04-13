import type { WorkspaceRoleAssignmentRepositoryPort } from "@backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { appContainer } from "@backend/di/app-container";
import { WorkspaceVO } from "#/backend/core/domain/access/workspace.vo";
import { TOKENS } from "#/backend/di/tokens";

/**
 * Grants the default permissions to the user on their own workspace.
 * @param userId - The ID of the user to grant the permissions to.
 * @returns A promise that resolves when the permissions are granted.
 */
export async function grantDefaultPermissionsOnUserCreated(user: { id: unknown }): Promise<void> {
	const userId = String(user.id ?? "").trim();
	if (userId.length < 1) return;
	const userSubject = SubjectVO.user(userId);
	/** Must match {@link createUseCaseContextFromOrpc}: personal workspace id is the raw user id, not the subject key. */
	const userWorkspace = WorkspaceVO.user(userId);
	const repository = appContainer.resolve<WorkspaceRoleAssignmentRepositoryPort>(
		TOKENS.WorkspaceRoleAssignmentRepositoryPort,
	);
	await repository.upsertOne({
		subjectKey: userSubject.toKey(),
		workspaceKey: userWorkspace.toKey(),
		role: "admin",
		grantSource: "user-created-default-own-workspace-admin",
	});
}
