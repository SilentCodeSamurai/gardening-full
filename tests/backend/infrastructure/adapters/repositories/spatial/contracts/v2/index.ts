import type { DependencyContainer } from "tsyringe";

import { registerSpatialNodeRepositoryContractV2 } from "./spatial-node.repository.contract.v2";

export function registerSpatialRepositoryContractsV2(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	registerSpatialNodeRepositoryContractV2(adapterLabel, createContainer);
}

export { resolveSpatialRepositoryPortsV2 } from "./resolve-spatial-repository-ports.v2";
export type { SpatialRepositoryPortsV2 } from "./resolve-spatial-repository-ports.v2";
