import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import { appContainer } from "@backend/di/app-container";

/** Called from Better Auth `databaseHooks.user.create.after` (registration). */
export async function grantDefaultWorkspaceOnUserCreated(user: { id: unknown }): Promise<void> {
	const access = appContainer.resolve(AccessControlApplicationService);
	await access.ensureDefaultWorkspaceEditorForNewUser(String(user.id));
}
