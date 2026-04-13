import {
	type CultivarRepositoryPort,
	CultivarRepositoryPortToken,
} from "@backend/core/application/ports/repositories/gardening/cultivar.repository.port";
import {
	type GardeningEventRepositoryPort,
	GardeningEventRepositoryPortToken,
} from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port";
import {
	type LocationRepositoryPort,
	LocationRepositoryPortToken,
} from "@backend/core/application/ports/repositories/gardening/location.repository.port";
import { type PlantRepositoryPort, PlantRepositoryPortToken } from "@backend/core/application/ports/repositories/gardening/plant.repository.port";
import {
	type SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryPortToken,
} from "@backend/core/application/ports/repositories/gardening/species-category.repository.port";
import {
	type SpeciesRepositoryPort,
	SpeciesRepositoryPortToken,
} from "@backend/core/application/ports/repositories/gardening/species.repository.port";
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
		speciesCategory: c.resolve(SpeciesCategoryRepositoryPortToken),
		species: c.resolve(SpeciesRepositoryPortToken),
		cultivar: c.resolve(CultivarRepositoryPortToken),
		plant: c.resolve(PlantRepositoryPortToken),
		location: c.resolve(LocationRepositoryPortToken),
		gardeningEvent: c.resolve(GardeningEventRepositoryPortToken),
	};
}
