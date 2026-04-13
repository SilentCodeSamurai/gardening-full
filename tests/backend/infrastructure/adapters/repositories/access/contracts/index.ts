import type { DependencyContainer } from "tsyringe";

import { registerWorkspaceRoleAssignmentRepositoryContract } from "./workspace-role-assignment.repository.contract";

export function registerAccessRepositoryContracts(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	registerWorkspaceRoleAssignmentRepositoryContract(adapterLabel, createContainer);
}

export { resolveAccessRepositoryPorts } from "./resolve-access-repository-ports";
export type { AccessRepositoryPorts } from "./resolve-access-repository-ports";
