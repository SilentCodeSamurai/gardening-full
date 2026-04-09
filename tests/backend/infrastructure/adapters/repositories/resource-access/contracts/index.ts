import type { DependencyContainer } from "tsyringe";
import { registerResoursePermissionRepositoryContract } from "./resourse-permission.repository.contract";

export function registerResourceAccessRepositoryContracts(
  adapterLabel: string,
  createContainer: () => DependencyContainer,
): void {
  registerResoursePermissionRepositoryContract(adapterLabel, createContainer);
}

export { resolveResourceAccessRepositoryPorts } from "./resolve-resource-access-repository-ports";
export type { ResourceAccessRepositoryPorts } from "./resolve-resource-access-repository-ports";
