import type { DependencyContainer } from "tsyringe";

import { registerWorkspaceRoleAssignmentRepositoryContractV2 } from "./workspace-role-assignment.repository.contract.v2";

export function registerAccessRepositoryContractsV2(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	registerWorkspaceRoleAssignmentRepositoryContractV2(adapterLabel, createContainer);
}

export { resolveAccessRepositoryPortsV2 } from "./resolve-access-repository-ports.v2";
export type { AccessRepositoryPortsV2 } from "./resolve-access-repository-ports.v2";
