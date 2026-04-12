import type { CultivarRepositoryPortV2 } from "@backend/core/application/ports/repositories/gardening/cultivar.repository.port.v2";
import type { GardeningEventRepositoryPortV2 } from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port.v2";
import type { LocationRepositoryPortV2 } from "@backend/core/application/ports/repositories/gardening/location.repository.port.v2";
import type { PlantRepositoryPortV2 } from "@backend/core/application/ports/repositories/gardening/plant.repository.port.v2";
import type { SpeciesCategoryRepositoryPortV2 } from "@backend/core/application/ports/repositories/gardening/species-category.repository.port.v2";
import type { SpeciesRepositoryPortV2 } from "@backend/core/application/ports/repositories/gardening/species.repository.port.v2";
import { TOKENS } from "@backend/di/tokens";
import type { DependencyContainer } from "tsyringe";

export type GardeningRepositoryPortsV2 = {
	speciesCategory: SpeciesCategoryRepositoryPortV2;
	species: SpeciesRepositoryPortV2;
	cultivar: CultivarRepositoryPortV2;
	plant: PlantRepositoryPortV2;
	location: LocationRepositoryPortV2;
	gardeningEvent: GardeningEventRepositoryPortV2;
};

export function resolveGardeningRepositoryPortsV2(c: DependencyContainer): GardeningRepositoryPortsV2 {
	return {
		speciesCategory: c.resolve<SpeciesCategoryRepositoryPortV2>(TOKENS.SpeciesCategoryRepositoryPortV2),
		species: c.resolve<SpeciesRepositoryPortV2>(TOKENS.SpeciesRepositoryPortV2),
		cultivar: c.resolve<CultivarRepositoryPortV2>(TOKENS.CultivarRepositoryPortV2),
		plant: c.resolve<PlantRepositoryPortV2>(TOKENS.PlantRepositoryPortV2),
		location: c.resolve<LocationRepositoryPortV2>(TOKENS.LocationRepositoryPortV2),
		gardeningEvent: c.resolve<GardeningEventRepositoryPortV2>(TOKENS.GardeningEventRepositoryPortV2),
	};
}
