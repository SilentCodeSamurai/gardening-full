import type { DependencyContainer } from "tsyringe";
import type { CultivarRepositoryPort } from "../core/application/ports/repositories/gardening/cultivar.repositort.port";
import type { GardeningEventRepositoryPort } from "../core/application/ports/repositories/gardening/gardening-event.repository.port";
import type { LocationRepositoryPort } from "../core/application/ports/repositories/gardening/location.repository.port";
import type { PlantRepositoryPort } from "../core/application/ports/repositories/gardening/plant.repository.port";
import type { SpeciesRepositoryPort } from "../core/application/ports/repositories/gardening/species.repository.port";
import type { SpeciesCategoryRepositoryPort } from "../core/application/ports/repositories/gardening/species-category.repository.port";
import type { SpatialNodeRepositoryPort } from "../core/application/ports/repositories/spatial/spatial-node.repository.port";
import { AccessControlApplicationService } from "../core/application/services/access-control/access-control.application-service";
import { SpatialOperationsService } from "../core/application/services/spatial/spatial-operations.service";
import {
	CultivarCreateUseCase,
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
	SpeciesDeleteUseCase,
	SpeciesGetAllUseCase,
	SpeciesGetByIdUseCase,
	SpeciesUpdateUseCase,
} from "../core/application/use-cases/gardening/species.crud-use-cases";
import {
	SpeciesCategoryCreateUseCase,
	SpeciesCategoryDeleteUseCase,
	SpeciesCategoryGetAllUseCase,
	SpeciesCategoryGetByIdUseCase,
	SpeciesCategoryUpdateUseCase,
} from "../core/application/use-cases/gardening/species-category.crud-use-cases";
import {
	SpatialApplyOperationsUseCase,
	SpatialNodeCreateUseCase,
	SpatialNodeDeleteUseCase,
	SpatialNodeGetAllUseCase,
	SpatialNodeGetTreeForRootIdUseCase,
	SpatialNodeRestoreUseCase,
} from "../core/application/use-cases/spatial/spatial.use-cases";
import { TOKENS } from "./tokens";

/** Registers all application use-cases on the container. */
export function registerUseCases(c: DependencyContainer): void {
	c.register(SpatialOperationsService, {
		useFactory: (cx) => new SpatialOperationsService(cx.resolve(TOKENS.SpatialNodeRepositoryPort)),
	});

	c.register(SpatialNodeCreateUseCase, {
		useFactory: (cx) =>
			new SpatialNodeCreateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpatialNodeRepositoryPort>(TOKENS.SpatialNodeRepositoryPort),
			),
	});
	c.register(SpatialNodeGetAllUseCase, {
		useFactory: (cx) =>
			new SpatialNodeGetAllUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpatialNodeRepositoryPort>(TOKENS.SpatialNodeRepositoryPort),
			),
	});
	c.register(SpatialNodeGetTreeForRootIdUseCase, {
		useFactory: (cx) =>
			new SpatialNodeGetTreeForRootIdUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpatialNodeRepositoryPort>(TOKENS.SpatialNodeRepositoryPort),
			),
	});
	c.register(SpatialNodeDeleteUseCase, {
		useFactory: (cx) =>
			new SpatialNodeDeleteUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpatialNodeRepositoryPort>(TOKENS.SpatialNodeRepositoryPort),
			),
	});
	c.register(SpatialNodeRestoreUseCase, {
		useFactory: (cx) =>
			new SpatialNodeRestoreUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpatialNodeRepositoryPort>(TOKENS.SpatialNodeRepositoryPort),
			),
	});
	c.register(SpatialApplyOperationsUseCase, {
		useFactory: (cx) =>
			new SpatialApplyOperationsUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve(SpatialOperationsService),
			),
	});

	c.register(GardeningEventGetAllUseCase, {
		useFactory: (cx) =>
			new GardeningEventGetAllUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
			),
	});
	c.register(GardeningEventGetByIdUseCase, {
		useFactory: (cx) =>
			new GardeningEventGetByIdUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
			),
	});
	c.register(GardeningEventUpdateUseCase, {
		useFactory: (cx) =>
			new GardeningEventUpdateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
			),
	});
	c.register(GardeningEventDeleteUseCase, {
		useFactory: (cx) =>
			new GardeningEventDeleteUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
			),
	});
	c.register(GardeningEventCreateUseCase, {
		useFactory: (cx) =>
			new GardeningEventCreateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
			),
	});
	c.register(GardeningEventCreateForLocationUseCase, {
		useFactory: (cx) =>
			new GardeningEventCreateForLocationUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
				cx.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
				cx.resolve<SpatialNodeRepositoryPort>(TOKENS.SpatialNodeRepositoryPort),
				cx.resolve<LocationRepositoryPort>(TOKENS.LocationRepositoryPort),
			),
	});
	c.register(GardeningEventCreateForPlantListUseCase, {
		useFactory: (cx) =>
			new GardeningEventCreateForPlantListUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
				cx.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
			),
	});
	c.register(GardeningEventGetForPlantUseCase, {
		useFactory: (cx) =>
			new GardeningEventGetForPlantUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
				cx.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
			),
	});
	c.register(GardeningEventGetForLocationUseCase, {
		useFactory: (cx) =>
			new GardeningEventGetForLocationUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
				cx.resolve<LocationRepositoryPort>(TOKENS.LocationRepositoryPort),
			),
	});
	c.register(GardeningEventGetBindingsForEventUseCase, {
		useFactory: (cx) =>
			new GardeningEventGetBindingsForEventUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<GardeningEventRepositoryPort>(TOKENS.GardeningEventRepositoryPort),
			),
	});

	c.register(LocationCreateUseCase, {
		useFactory: (cx) =>
			new LocationCreateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<LocationRepositoryPort>(TOKENS.LocationRepositoryPort),
			),
	});
	c.register(LocationGetByIdUseCase, {
		useFactory: (cx) =>
			new LocationGetByIdUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<LocationRepositoryPort>(TOKENS.LocationRepositoryPort),
			),
	});
	c.register(LocationGetAllUseCase, {
		useFactory: (cx) =>
			new LocationGetAllUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<LocationRepositoryPort>(TOKENS.LocationRepositoryPort),
			),
	});
	c.register(LocationUpdateUseCase, {
		useFactory: (cx) =>
			new LocationUpdateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<LocationRepositoryPort>(TOKENS.LocationRepositoryPort),
			),
	});
	c.register(LocationDeleteUseCase, {
		useFactory: (cx) =>
			new LocationDeleteUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<LocationRepositoryPort>(TOKENS.LocationRepositoryPort),
				cx.resolve(SpatialOperationsService),
			),
	});
	c.register(LocationDeleteManyUseCase, {
		useFactory: (cx) =>
			new LocationDeleteManyUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<LocationRepositoryPort>(TOKENS.LocationRepositoryPort),
				cx.resolve(SpatialOperationsService),
			),
	});

	c.register(PlantCreateUseCase, {
		useFactory: (cx) =>
			new PlantCreateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
			),
	});
	c.register(PlantCreateManyUseCase, {
		useFactory: (cx) =>
			new PlantCreateManyUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
			),
	});
	c.register(PlantGetAllUseCase, {
		useFactory: (cx) =>
			new PlantGetAllUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
			),
	});
	c.register(PlantGetByIdUseCase, {
		useFactory: (cx) =>
			new PlantGetByIdUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
			),
	});
	c.register(PlantUpdateUseCase, {
		useFactory: (cx) =>
			new PlantUpdateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
			),
	});
	c.register(PlantDeleteUseCase, {
		useFactory: (cx) =>
			new PlantDeleteUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
				cx.resolve(SpatialOperationsService),
			),
	});
	c.register(PlantDeleteManyUseCase, {
		useFactory: (cx) =>
			new PlantDeleteManyUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<PlantRepositoryPort>(TOKENS.PlantRepositoryPort),
				cx.resolve(SpatialOperationsService),
			),
	});

	c.register(CultivarCreateUseCase, {
		useFactory: (cx) =>
			new CultivarCreateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<CultivarRepositoryPort>(TOKENS.CultivarRepositoryPort),
			),
	});
	c.register(CultivarGetByIdUseCase, {
		useFactory: (cx) =>
			new CultivarGetByIdUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<CultivarRepositoryPort>(TOKENS.CultivarRepositoryPort),
			),
	});
	c.register(CultivarGetFullByIdUseCase, {
		useFactory: (cx) =>
			new CultivarGetFullByIdUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<CultivarRepositoryPort>(TOKENS.CultivarRepositoryPort),
			),
	});
	c.register(CultivarGetAllUseCase, {
		useFactory: (cx) =>
			new CultivarGetAllUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<CultivarRepositoryPort>(TOKENS.CultivarRepositoryPort),
			),
	});
	c.register(CultivarUpdateUseCase, {
		useFactory: (cx) =>
			new CultivarUpdateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<CultivarRepositoryPort>(TOKENS.CultivarRepositoryPort),
			),
	});
	c.register(CultivarDeleteUseCase, {
		useFactory: (cx) =>
			new CultivarDeleteUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<CultivarRepositoryPort>(TOKENS.CultivarRepositoryPort),
			),
	});

	c.register(SpeciesCategoryCreateUseCase, {
		useFactory: (cx) =>
			new SpeciesCategoryCreateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesCategoryRepositoryPort>(TOKENS.SpeciesCategoryRepositoryPort),
			),
	});
	c.register(SpeciesCategoryGetByIdUseCase, {
		useFactory: (cx) =>
			new SpeciesCategoryGetByIdUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesCategoryRepositoryPort>(TOKENS.SpeciesCategoryRepositoryPort),
			),
	});
	c.register(SpeciesCategoryGetAllUseCase, {
		useFactory: (cx) =>
			new SpeciesCategoryGetAllUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesCategoryRepositoryPort>(TOKENS.SpeciesCategoryRepositoryPort),
			),
	});
	c.register(SpeciesCategoryUpdateUseCase, {
		useFactory: (cx) =>
			new SpeciesCategoryUpdateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesCategoryRepositoryPort>(TOKENS.SpeciesCategoryRepositoryPort),
			),
	});
	c.register(SpeciesCategoryDeleteUseCase, {
		useFactory: (cx) =>
			new SpeciesCategoryDeleteUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesCategoryRepositoryPort>(TOKENS.SpeciesCategoryRepositoryPort),
			),
	});

	c.register(SpeciesCreateUseCase, {
		useFactory: (cx) =>
			new SpeciesCreateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesRepositoryPort>(TOKENS.SpeciesRepositoryPort),
			),
	});
	c.register(SpeciesGetByIdUseCase, {
		useFactory: (cx) =>
			new SpeciesGetByIdUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesRepositoryPort>(TOKENS.SpeciesRepositoryPort),
			),
	});
	c.register(SpeciesGetAllUseCase, {
		useFactory: (cx) =>
			new SpeciesGetAllUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesRepositoryPort>(TOKENS.SpeciesRepositoryPort),
			),
	});
	c.register(SpeciesUpdateUseCase, {
		useFactory: (cx) =>
			new SpeciesUpdateUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesRepositoryPort>(TOKENS.SpeciesRepositoryPort),
			),
	});
	c.register(SpeciesDeleteUseCase, {
		useFactory: (cx) =>
			new SpeciesDeleteUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesRepositoryPort>(TOKENS.SpeciesRepositoryPort),
			),
	});

	c.register(PopulateDefaultCatalogUseCase, {
		useFactory: (cx) =>
			new PopulateDefaultCatalogUseCase(
				cx.resolve(AccessControlApplicationService),
				cx.resolve<SpeciesCategoryRepositoryPort>(TOKENS.SpeciesCategoryRepositoryPort),
				cx.resolve<SpeciesRepositoryPort>(TOKENS.SpeciesRepositoryPort),
			),
	});
}
