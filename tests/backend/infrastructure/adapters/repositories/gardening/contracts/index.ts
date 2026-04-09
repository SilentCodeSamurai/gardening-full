import type { DependencyContainer } from "tsyringe";

import { registerCultivarRepositoryContract } from "./cultivar.repository.contract";
import { registerGardeningEventRepositoryContract } from "./gardening-event.repository.contract";
import { registerLocationRepositoryContract } from "./location.repository.contract";
import { registerPlantRepositoryContract } from "./plant.repository.contract";
import { registerSpeciesCategoryRepositoryContract } from "./species-category.repository.contract";
import { registerSpeciesRepositoryContract } from "./species.repository.contract";

/**
 * Runs the full gardening repository port contract suite against any adapter set
 * registered on fresh containers from `createContainer` (e.g. in-memory today, Supabase later).
 */
export function registerGardeningRepositoryContracts(
  adapterLabel: string,
  createContainer: () => DependencyContainer,
): void {
  registerSpeciesCategoryRepositoryContract(adapterLabel, createContainer);
  registerSpeciesRepositoryContract(adapterLabel, createContainer);
  registerCultivarRepositoryContract(adapterLabel, createContainer);
  registerPlantRepositoryContract(adapterLabel, createContainer);
  registerLocationRepositoryContract(adapterLabel, createContainer);
  registerGardeningEventRepositoryContract(adapterLabel, createContainer);
}

export { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";
export type { GardeningRepositoryPorts } from "./resolve-gardening-repository-ports";
