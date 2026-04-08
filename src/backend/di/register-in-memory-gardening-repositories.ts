import type { DependencyContainer } from "tsyringe";

import { CultivarInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/cultivar.repository.in-memory";
import { GardeningEventInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/gardening-event.repository.in-memory";
import { LocationInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/location.repository.in-memory";
import { PlantInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/plant.repository.in-memory";
import { SpeciesCategoryInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/species-category.repository.in-memory";
import { SpeciesInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/species.repository.in-memory";
import { SpatialNodeInMemoryRepository } from "../infrastructure/adapters/repositories/spatial/in-memory/spatial-node.repository.in-memory";
import { InMemoryGardeningStore } from "../infrastructure/integrations/in-memory-database/client";
import { TOKENS } from "./tokens";

/**
 * Binds the in-memory gardening store and all repository ports on the given container.
 * Used by the app root container and by per-test child containers.
 */
export function registerInMemoryGardeningRepositories(c: DependencyContainer): void {
	c.register(TOKENS.InMemoryGardeningStore, {
		useValue: new InMemoryGardeningStore(),
	});

	c.register(TOKENS.CultivarRepositoryPort, {
		useFactory: (cx) => new CultivarInMemoryRepository(cx.resolve(TOKENS.InMemoryGardeningStore)),
	});
	c.register(TOKENS.PlantRepositoryPort, {
		useFactory: (cx) => new PlantInMemoryRepository(cx.resolve(TOKENS.InMemoryGardeningStore)),
	});
	c.register(TOKENS.SpeciesRepositoryPort, {
		useFactory: (cx) => new SpeciesInMemoryRepository(cx.resolve(TOKENS.InMemoryGardeningStore)),
	});
	c.register(TOKENS.SpeciesCategoryRepositoryPort, {
		useFactory: (cx) => new SpeciesCategoryInMemoryRepository(cx.resolve(TOKENS.InMemoryGardeningStore)),
	});
	c.register(TOKENS.LocationRepositoryPort, {
		useFactory: (cx) => new LocationInMemoryRepository(cx.resolve(TOKENS.InMemoryGardeningStore)),
	});
	c.register(TOKENS.GardeningEventRepositoryPort, {
		useFactory: (cx) => new GardeningEventInMemoryRepository(cx.resolve(TOKENS.InMemoryGardeningStore)),
	});
	c.register(TOKENS.SpatialNodeRepositoryPort, {
		useFactory: (cx) => new SpatialNodeInMemoryRepository(cx.resolve(TOKENS.InMemoryGardeningStore)),
	});
}
