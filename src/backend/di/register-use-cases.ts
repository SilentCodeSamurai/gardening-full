import type { DependencyContainer, InjectionToken } from "tsyringe";
import {
	CultivarCreateUseCase,
	CultivarDeleteManyUseCase,
	CultivarDeleteUseCase,
	CultivarGetAllUseCase,
	CultivarGetByIdUseCase,
	CultivarGetFullByIdUseCase,
	CultivarUpdateUseCase,
} from "../core/application/use-cases/gardening/cultivar.use-cases";
import {
	GardeningEventCreateForLocationUseCase,
	GardeningEventCreateForPlantListUseCase,
	GardeningEventCreateUseCase,
	GardeningEventDeleteManyUseCase,
	GardeningEventDeleteUseCase,
	GardeningEventGetAllUseCase,
	GardeningEventGetBindingsForEventUseCase,
	GardeningEventGetByIdUseCase,
	GardeningEventGetForLocationUseCase,
	GardeningEventGetForPlantUseCase,
	GardeningEventUpdateUseCase,
} from "../core/application/use-cases/gardening/gardening-event.use-cases";
import {
	LocationCreateUseCase,
	LocationDeleteManyUseCase,
	LocationDeleteUseCase,
	LocationGetAllUseCase,
	LocationGetByIdUseCase,
	LocationUpdateUseCase,
} from "../core/application/use-cases/gardening/location.use-cases";
import {
	PlantCreateManyUseCase,
	PlantCreateUseCase,
	PlantDeleteManyUseCase,
	PlantDeleteUseCase,
	PlantGetAllUseCase,
	PlantGetByIdUseCase,
	PlantUpdateUseCase,
} from "../core/application/use-cases/gardening/plant.use-cases";
import { PopulateDefaultCatalogUseCase } from "../core/application/use-cases/gardening/populate-default-catalog.use-case";
import {
	SpeciesCreateUseCase,
	SpeciesDeleteManyUseCase,
	SpeciesDeleteUseCase,
	SpeciesGetAllUseCase,
	SpeciesGetByIdUseCase,
	SpeciesUpdateUseCase,
} from "../core/application/use-cases/gardening/species.use-cases";
import {
	SpeciesCategoryCreateUseCase,
	SpeciesCategoryDeleteManyUseCase,
	SpeciesCategoryDeleteUseCase,
	SpeciesCategoryGetAllUseCase,
	SpeciesCategoryGetByIdUseCase,
	SpeciesCategoryUpdateUseCase,
} from "../core/application/use-cases/gardening/species-category.use-cases";
import {
	SpatialApplyOperationsUseCase,
	SpatialNodeCreateUseCase,
	SpatialNodeDeleteManyUseCase,
	SpatialNodeDeleteUseCase,
	SpatialNodeGetAllUseCase,
	SpatialNodeGetTreeForRootIdUseCase,
	SpatialNodeRestoreUseCase,
} from "../core/application/use-cases/spatial/spatial.use-cases";

const injectableApplicationClasses = [
	// Use-cases: spatial
	SpatialNodeCreateUseCase,
	SpatialNodeGetAllUseCase,
	SpatialNodeGetTreeForRootIdUseCase,
	SpatialNodeDeleteUseCase,
	SpatialNodeDeleteManyUseCase,
	SpatialNodeRestoreUseCase,
	SpatialApplyOperationsUseCase,

	// Use-cases: gardening events
	GardeningEventGetAllUseCase,
	GardeningEventGetByIdUseCase,
	GardeningEventUpdateUseCase,
	GardeningEventDeleteUseCase,
	GardeningEventDeleteManyUseCase,
	GardeningEventCreateUseCase,
	GardeningEventCreateForLocationUseCase,
	GardeningEventCreateForPlantListUseCase,
	GardeningEventGetForPlantUseCase,
	GardeningEventGetForLocationUseCase,
	GardeningEventGetBindingsForEventUseCase,

	// Use-cases: gardening locations
	LocationCreateUseCase,
	LocationGetByIdUseCase,
	LocationGetAllUseCase,
	LocationUpdateUseCase,
	LocationDeleteUseCase,
	LocationDeleteManyUseCase,

	// Use-cases: gardening plants
	PlantCreateUseCase,
	PlantCreateManyUseCase,
	PlantGetAllUseCase,
	PlantGetByIdUseCase,
	PlantUpdateUseCase,
	PlantDeleteUseCase,
	PlantDeleteManyUseCase,

	// Use-cases: gardening cultivars
	CultivarCreateUseCase,
	CultivarGetByIdUseCase,
	CultivarGetFullByIdUseCase,
	CultivarGetAllUseCase,
	CultivarUpdateUseCase,
	CultivarDeleteUseCase,
	CultivarDeleteManyUseCase,

	// Use-cases: gardening species categories
	SpeciesCategoryCreateUseCase,
	SpeciesCategoryGetByIdUseCase,
	SpeciesCategoryGetAllUseCase,
	SpeciesCategoryUpdateUseCase,
	SpeciesCategoryDeleteUseCase,
	SpeciesCategoryDeleteManyUseCase,

	// Use-cases: gardening species
	SpeciesCreateUseCase,
	SpeciesGetByIdUseCase,
	SpeciesGetAllUseCase,
	SpeciesUpdateUseCase,
	SpeciesDeleteUseCase,
	SpeciesDeleteManyUseCase,

	// Use-cases: gardening catalog
	PopulateDefaultCatalogUseCase,
] as const;

/** Registers all application use-cases (constructor injection via @injectable). */
export function registerUseCases(c: DependencyContainer): void {
	for (const cls of injectableApplicationClasses) {
		c.register(cls as InjectionToken<object>, { useClass: cls });
	}
}
