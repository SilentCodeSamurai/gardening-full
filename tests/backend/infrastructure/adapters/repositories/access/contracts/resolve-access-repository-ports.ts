import type { WorkspaceRoleAssignmentRepositoryPort } from "@backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { TOKENS } from "@backend/di/tokens";
import type { DependencyContainer } from "tsyringe";

export type AccessRepositoryPorts = {
	workspaceRoleAssignment: WorkspaceRoleAssignmentRepositoryPort;
};

export function resolveAccessRepositoryPorts(c: DependencyContainer): AccessRepositoryPorts {
	return {
		workspaceRoleAssignment: c.resolve<WorkspaceRoleAssignmentRepositoryPort>(
			TOKENS.WorkspaceRoleAssignmentRepositoryPort,
		),
	};
}
