import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { testsLocalServiceAccount } from "../../core/application/use-cases/service-accounts";
import { TOKENS } from "@backend/di/tokens";
import { WorkspaceRoleAssignmentInMemoryRepository } from "@backend/infrastructure/adapters/repositories/access/in-memory/workspace-role-assignment.repository.in-memory";
import type { DependencyContainer } from "tsyringe";

/**
 * Broad workspace admin for `tests-local` service account. Call after `registerAccessControlPorts` from test composition roots only.
 */
export function seedTestsLocalAccessPermissions(c: DependencyContainer): void {
	const workspaceRepo = c.resolve(TOKENS.WorkspaceRoleAssignmentRepositoryPort);
	if (!(workspaceRepo instanceof WorkspaceRoleAssignmentInMemoryRepository)) {
		throw new Error("seedTestsLocalAccessPermissions requires WorkspaceRoleAssignmentInMemoryRepository");
	}
	const subjectKey = testsLocalServiceAccount.toKey();
	workspaceRepo.putWorkspaceRoleAssignmentSync({
		subjectKey,
		workspaceKey: WorkspaceVO.org("workspace").toKey(),
		role: "admin",
		grantSource: "seed-tests-local-workspace-root",
	});
	workspaceRepo.putWorkspaceRoleAssignmentSync({
		subjectKey,
		workspaceKey: WorkspaceVO.globalShared().toKey(),
		role: "admin",
		grantSource: "seed-tests-local-system",
	});
}
