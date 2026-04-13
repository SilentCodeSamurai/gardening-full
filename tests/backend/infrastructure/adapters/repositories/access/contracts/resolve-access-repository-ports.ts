import {
	type WorkspaceRoleAssignmentRepositoryPort,
	WorkspaceRoleAssignmentRepositoryPortToken,
} from "@backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import type { DependencyContainer } from "tsyringe";

export type AccessRepositoryPorts = {
	workspaceRoleAssignment: WorkspaceRoleAssignmentRepositoryPort;
};

export function resolveAccessRepositoryPorts(c: DependencyContainer): AccessRepositoryPorts {
	return {
		workspaceRoleAssignment: c.resolve(WorkspaceRoleAssignmentRepositoryPortToken),
	};
}
