import type { DependencyContainer } from "tsyringe";

import { registerSpatialNodeRepositoryContract } from "./spatial-node.repository.contract";

export function registerSpatialRepositoryContracts(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	registerSpatialNodeRepositoryContract(adapterLabel, createContainer);
}

export { resolveSpatialRepositoryPorts } from "./resolve-spatial-repository-ports";
export type { SpatialRepositoryPorts } from "./resolve-spatial-repository-ports";
