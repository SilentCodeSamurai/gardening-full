
export const TOKENS = {
	InMemoryStore: Symbol.for("InMemoryStore"),
	InMemoryStoreV2: Symbol.for("InMemoryStoreV2"),
	IndexedDbGardeningStore: Symbol.for("IndexedDbGardeningStore"),
	CultivarRepositoryPort: Symbol.for("CultivarRepositoryPort"),
	PlantRepositoryPort: Symbol.for("PlantRepositoryPort"),
	SpeciesRepositoryPort: Symbol.for("SpeciesRepositoryPort"),
	SpeciesCategoryRepositoryPort: Symbol.for("SpeciesCategoryRepositoryPort"),
	LocationRepositoryPort: Symbol.for("LocationRepositoryPort"),
	GardeningEventRepositoryPort: Symbol.for("GardeningEventRepositoryPort"),
	SpatialNodeRepositoryPort: Symbol.for("SpatialNodeRepositoryPort"),
	WorkspaceRoleAssignmentRepositoryPort: Symbol.for("WorkspaceRoleAssignmentRepositoryPort"),
	AccessAuditPort: Symbol.for("AccessAuditPort"),
	SpeciesCategoryRepositoryPortV2: Symbol.for("SpeciesCategoryRepositoryPortV2"),
	SpeciesRepositoryPortV2: Symbol.for("SpeciesRepositoryPortV2"),
	CultivarRepositoryPortV2: Symbol.for("CultivarRepositoryPortV2"),
	PlantRepositoryPortV2: Symbol.for("PlantRepositoryPortV2"),
	LocationRepositoryPortV2: Symbol.for("LocationRepositoryPortV2"),
	GardeningEventRepositoryPortV2: Symbol.for("GardeningEventRepositoryPortV2"),
	SpatialNodeRepositoryPortV2: Symbol.for("SpatialNodeRepositoryPortV2"),
	WorkspaceRoleAssignmentRepositoryPortV2: Symbol.for("WorkspaceRoleAssignmentRepositoryPortV2"),
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];
