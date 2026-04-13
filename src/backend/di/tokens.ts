
export const TOKENS = {
	InMemoryStore: Symbol.for("InMemoryStore"),
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
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];
