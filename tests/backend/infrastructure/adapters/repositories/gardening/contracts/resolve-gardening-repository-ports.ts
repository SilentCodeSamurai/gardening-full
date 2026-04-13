import type { CultivarRepositoryPort } from "@backend/core/application/ports/repositories/gardening/cultivar.repository.port";
import type { GardeningEventRepositoryPort } from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port";
import type { LocationRepositoryPort } from "@backend/core/application/ports/repositories/gardening/location.repository.port";
import type { PlantRepositoryPort } from "@backend/core/application/ports/repositories/gardening/plant.repository.port";
import type { SpeciesCategoryRepositoryPort } from "@backend/core/application/ports/repositories/gardening/species-category.repository.port";
import type { SpeciesRepositoryPort } from "@backend/core/application/ports/repositories/gardening/species.repository.port";
import { TOKENS } from "@backend/di/tokens";
import type { DependencyContainer } from "tsyringe";

export type GardeningRepositoryPorts = {
	speciesCategory: SpeciesCategoryRepositoryPort;
	species: SpeciesRepositoryPort;
	cultivar: CultivarRepositoryPort;
	plant: PlantRepositoryPort;
	location: LocationRepositoryPort;
	gardeningEvent: GardeningEventRepositoryPort;
};

export function resolveGardeningRepositoryPorts(c: DependencyContainer): GardeningRepositoryPorts {
	return {
		speciesCategory: c.resolve<SpeciesCategoryRepositoryPort>(TOKENS.SpeciesCategoryRepositoryPort),
		species: c.resolve<SpeciesRepositoryPort>(TOKENS.SpeciesRepositoryPort),
		cultivar: c.resolve<CultivarRepositoryPort>(TOKENS.CultivarRepositoryPort),
		plant: c.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
		location: c.resolve<LocationRepositoryPort>(TOKENS.LocationRepositoryPort),
		gardeningEvent: c.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
	};
}
