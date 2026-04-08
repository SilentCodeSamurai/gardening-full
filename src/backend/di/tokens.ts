export const TOKENS = {
	InMemoryGardeningStore: Symbol.for("InMemoryGardeningStore"),
	IndexedDbGardeningStore: Symbol.for("IndexedDbGardeningStore"),
	CultivarRepositoryPort: Symbol.for("CultivarRepositoryPort"),
	PlantRepositoryPort: Symbol.for("PlantRepositoryPort"),
	SpeciesRepositoryPort: Symbol.for("SpeciesRepositoryPort"),
	SpeciesCategoryRepositoryPort: Symbol.for("SpeciesCategoryRepositoryPort"),
	LocationRepositoryPort: Symbol.for("LocationRepositoryPort"),
	GardeningEventRepositoryPort: Symbol.for("GardeningEventRepositoryPort"),
	SpatialNodeRepositoryPort: Symbol.for("SpatialNodeRepositoryPort"),
	SpatialOperationsService: Symbol.for("SpatialOperationsService"),
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];
