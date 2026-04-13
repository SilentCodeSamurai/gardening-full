import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/entities";
import type { SubjectKey } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO, type WorkspaceKey } from "@backend/core/domain/access/workspace.vo";
import { testsLocalServiceAccount } from "../../core/application/use-cases/service-accounts";
import { InMemoryStoreToken } from "@backend/infrastructure/integrations/in-memory-database/client";
import { workspaceRoleAssignmentId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";

function compositeKey(subjectKey: SubjectKey, workspaceKey: WorkspaceKey): `${SubjectKey}|${WorkspaceKey}` {
	return `${subjectKey}|${workspaceKey}` as `${SubjectKey}|${WorkspaceKey}`;
}

/**
 * Broad workspace admin for `tests-local` service account. Call after `registerAdapters` from test composition roots only.
 */
export function seedTestsLocalAccessPermissions(c: DependencyContainer): void {
	const store = c.resolve(InMemoryStoreToken);
	const subject = testsLocalServiceAccount;
	const subjectKey = subject.toKey();
	const now = new Date();
	const seeds: readonly { workspace: ReturnType<typeof WorkspaceVO.org>; grantSource: string }[] = [
		{ workspace: WorkspaceVO.org("workspace"), grantSource: "seed-tests-local-workspace-root" },
		{ workspace: WorkspaceVO.globalShared(), grantSource: "seed-tests-local-system" },
	];
	for (const { workspace, grantSource } of seeds) {
		const mapKey = compositeKey(subjectKey, workspace.toKey());
		const id = workspaceRoleAssignmentId();
		const row: WorkspaceRoleAssignmentEntity = {
			id,
			subject,
			workspace,
			role: "admin",
			grantSource,
			createdAt: now,
			updatedAt: now,
		};
		store.workspaceRoleAssignments.set(mapKey, row);
	}
}
