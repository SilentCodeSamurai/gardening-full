import type { DependencyContainer } from "tsyringe";

import { registerCultivarRepositoryContractV2 } from "./cultivar.repository.contract.v2";
import { registerGardeningEventRepositoryContractV2 } from "./gardening-event.repository.contract.v2";
import { registerLocationRepositoryContractV2 } from "./location.repository.contract.v2";
import { registerPlantRepositoryContractV2 } from "./plant.repository.contract.v2";
import { registerSpeciesCategoryRepositoryContractV2 } from "./species-category.repository.contract.v2";
import { registerSpeciesRepositoryContractV2 } from "./species.repository.contract.v2";

export function registerGardeningRepositoryContractsV2(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	registerSpeciesCategoryRepositoryContractV2(adapterLabel, createContainer);
	registerSpeciesRepositoryContractV2(adapterLabel, createContainer);
	registerCultivarRepositoryContractV2(adapterLabel, createContainer);
	registerPlantRepositoryContractV2(adapterLabel, createContainer);
	registerLocationRepositoryContractV2(adapterLabel, createContainer);
	registerGardeningEventRepositoryContractV2(adapterLabel, createContainer);
}

export { resolveGardeningRepositoryPortsV2 } from "./resolve-gardening-repository-ports.v2";
export type { GardeningRepositoryPortsV2 } from "./resolve-gardening-repository-ports.v2";
