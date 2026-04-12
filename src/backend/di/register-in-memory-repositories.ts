import type { DependencyContainer } from "tsyringe";
import { WorkspaceRoleAssignmentInMemoryRepository } from "../infrastructure/adapters/repositories/access/in-memory/workspace-role-assignment.repository.in-memory";
import { WorkspaceRoleAssignmentInMemoryRepositoryV2 } from "../infrastructure/adapters/repositories/access/in-memory/workspace-role-assignment.repository.in-memory.v2";
import { CultivarInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/cultivar.repository.in-memory";
import { CultivarInMemoryRepositoryV2 } from "../infrastructure/adapters/repositories/gardening/in-memory/cultivar.repository.in-memory.v2";
import { GardeningEventInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/gardening-event.repository.in-memory";
import { GardeningEventInMemoryRepositoryV2 } from "../infrastructure/adapters/repositories/gardening/in-memory/gardening-event.repository.in-memory.v2";
import { LocationInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/location.repository.in-memory";
import { LocationInMemoryRepositoryV2 } from "../infrastructure/adapters/repositories/gardening/in-memory/location.repository.in-memory.v2";
import { PlantInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/plant.repository.in-memory";
import { PlantInMemoryRepositoryV2 } from "../infrastructure/adapters/repositories/gardening/in-memory/plant.repository.in-memory.v2";
import { SpeciesInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/species.repository.in-memory";
import { SpeciesInMemoryRepositoryV2 } from "../infrastructure/adapters/repositories/gardening/in-memory/species.repository.in-memory.v2";
import { SpeciesCategoryInMemoryRepository } from "../infrastructure/adapters/repositories/gardening/in-memory/species-category.repository.in-memory";
import { SpeciesCategoryInMemoryRepositoryV2 } from "../infrastructure/adapters/repositories/gardening/in-memory/species-category.repository.in-memory.v2";
import { SpatialNodeInMemoryRepository } from "../infrastructure/adapters/repositories/spatial/in-memory/spatial-node.repository.in-memory";
import { SpatialNodeInMemoryRepositoryV2 } from "../infrastructure/adapters/repositories/spatial/in-memory/spatial-node.repository.in-memory.v2";
import { InMemoryStore } from "../infrastructure/integrations/in-memory-database/client";
import { InMemoryStoreV2 } from "../infrastructure/integrations/in-memory-database/client.v2";
import { TOKENS } from "./tokens";

/**
 * Binds the in-memory store and all repository ports on the given container.
 * Used by the app root container and by per-test child containers.
 */
export function registerInMemoryRepositories(c: DependencyContainer): void {
	c.register(TOKENS.InMemoryStore, {
		useValue: new InMemoryStore(),
	});
	c.register(TOKENS.InMemoryStoreV2, {
		useValue: new InMemoryStoreV2(),
	});
	c.register(TOKENS.CultivarRepositoryPort, {
		useFactory: (cx) => new CultivarInMemoryRepository(cx.resolve(TOKENS.InMemoryStore)),
	});
	c.register(TOKENS.PlantRepositoryPort, {
		useFactory: (cx) => new PlantInMemoryRepository(cx.resolve(TOKENS.InMemoryStore)),
	});
	c.register(TOKENS.SpeciesRepositoryPort, {
		useFactory: (cx) => new SpeciesInMemoryRepository(cx.resolve(TOKENS.InMemoryStore)),
	});
	c.register(TOKENS.SpeciesCategoryRepositoryPort, {
		useFactory: (cx) => new SpeciesCategoryInMemoryRepository(cx.resolve(TOKENS.InMemoryStore)),
	});
	c.register(TOKENS.LocationRepositoryPort, {
		useFactory: (cx) => new LocationInMemoryRepository(cx.resolve(TOKENS.InMemoryStore)),
	});
	c.register(TOKENS.GardeningEventRepositoryPort, {
		useFactory: (cx) => new GardeningEventInMemoryRepository(cx.resolve(TOKENS.InMemoryStore)),
	});
	c.register(TOKENS.SpatialNodeRepositoryPort, {
		useFactory: (cx) => new SpatialNodeInMemoryRepository(cx.resolve(TOKENS.InMemoryStore)),
	});
	c.register(TOKENS.WorkspaceRoleAssignmentRepositoryPort, {
		useFactory: (cx) => new WorkspaceRoleAssignmentInMemoryRepository(cx.resolve(TOKENS.InMemoryStore)),
	});

	c.register(TOKENS.SpeciesCategoryRepositoryPortV2, {
		useFactory: (cx) => new SpeciesCategoryInMemoryRepositoryV2(cx.resolve(TOKENS.InMemoryStoreV2)),
	});
	c.register(TOKENS.SpeciesRepositoryPortV2, {
		useFactory: (cx) => new SpeciesInMemoryRepositoryV2(cx.resolve(TOKENS.InMemoryStoreV2)),
	});
	c.register(TOKENS.CultivarRepositoryPortV2, {
		useFactory: (cx) => new CultivarInMemoryRepositoryV2(cx.resolve(TOKENS.InMemoryStoreV2)),
	});
	c.register(TOKENS.PlantRepositoryPortV2, {
		useFactory: (cx) => new PlantInMemoryRepositoryV2(cx.resolve(TOKENS.InMemoryStoreV2)),
	});
	c.register(TOKENS.LocationRepositoryPortV2, {
		useFactory: (cx) => new LocationInMemoryRepositoryV2(cx.resolve(TOKENS.InMemoryStoreV2)),
	});
	c.register(TOKENS.GardeningEventRepositoryPortV2, {
		useFactory: (cx) => new GardeningEventInMemoryRepositoryV2(cx.resolve(TOKENS.InMemoryStoreV2)),
	});
	c.register(TOKENS.SpatialNodeRepositoryPortV2, {
		useFactory: (cx) => new SpatialNodeInMemoryRepositoryV2(cx.resolve(TOKENS.InMemoryStoreV2)),
	});
	c.register(TOKENS.WorkspaceRoleAssignmentRepositoryPortV2, {
		useFactory: (cx) => new WorkspaceRoleAssignmentInMemoryRepositoryV2(cx.resolve(TOKENS.InMemoryStoreV2)),
	});
}
