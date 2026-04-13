import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/entities";
import type { SubjectKey } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO, type WorkspaceKey } from "@backend/core/domain/access/workspace.vo";
import { testsLocalServiceAccount } from "../../core/application/use-cases/service-accounts";
import { TOKENS } from "@backend/di/tokens";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { workspaceRoleAssignmentId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";

function compositeKey(subjectKey: SubjectKey, workspaceKey: WorkspaceKey): `${SubjectKey}|${WorkspaceKey}` {
	return `${subjectKey}|${workspaceKey}` as const;
}

/**
 * Broad workspace admin for `tests-local` service account. Call after `registerAccessControlPorts` from test composition roots only.
 */
export function seedTestsLocalAccessPermissions(c: DependencyContainer): void {
	const store = c.resolve<InMemoryStore>(TOKENS.InMemoryStore);
	const subjectKey = testsLocalServiceAccount.toKey();
	const now = new Date();
	const seeds: readonly { workspaceKey: WorkspaceKey; grantSource: string }[] = [
		{ workspaceKey: WorkspaceVO.org("workspace").toKey(), grantSource: "seed-tests-local-workspace-root" },
		{ workspaceKey: WorkspaceVO.globalShared().toKey(), grantSource: "seed-tests-local-system" },
	];
	for (const { workspaceKey, grantSource } of seeds) {
		const mapKey = compositeKey(subjectKey, workspaceKey);
		const id = workspaceRoleAssignmentId();
		const row: WorkspaceRoleAssignmentEntity = {
			id,
			subjectKey,
			workspaceKey,
			role: "admin",
			grantSource,
			createdAt: now,
			updatedAt: now,
		};
		store.workspaceRoleAssignments.set(mapKey, row);
	}
}
