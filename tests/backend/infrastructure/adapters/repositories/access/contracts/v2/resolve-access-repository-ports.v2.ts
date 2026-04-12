import type { WorkspaceRoleAssignmentRepositoryPortV2 } from "@backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port.v2";
import { TOKENS } from "@backend/di/tokens";
import type { DependencyContainer } from "tsyringe";

export type AccessRepositoryPortsV2 = {
	workspaceRoleAssignment: WorkspaceRoleAssignmentRepositoryPortV2;
};

export function resolveAccessRepositoryPortsV2(c: DependencyContainer): AccessRepositoryPortsV2 {
	return {
		workspaceRoleAssignment: c.resolve<WorkspaceRoleAssignmentRepositoryPortV2>(
			TOKENS.WorkspaceRoleAssignmentRepositoryPortV2,
		),
	};
}
