import type {
	CultivarEntityId,
	GardeningEventEntityId,
	LocationEntityId,
	PlantEntityId,
	SpeciesCategoryEntityId,
	SpeciesEntityId,
} from "@backend/core/domain/gardening/entities";
import type { SpatialNodeEntityId } from "@backend/core/domain/spatial/entities";

export function newRawId(): string {
	return crypto.randomUUID();
}

export function speciesCategoryId(id: string = newRawId()): SpeciesCategoryEntityId {
	return id as SpeciesCategoryEntityId;
}

export function speciesId(id: string = newRawId()): SpeciesEntityId {
	return id as SpeciesEntityId;
}

export function cultivarId(id: string = newRawId()): CultivarEntityId {
	return id as CultivarEntityId;
}

export function plantId(id: string = newRawId()): PlantEntityId {
	return id as PlantEntityId;
}

export function locationId(id: string = newRawId()): LocationEntityId {
	return id as LocationEntityId;
}

export function gardeningEventId(id: string = newRawId()): GardeningEventEntityId {
	return id as GardeningEventEntityId;
}

export function spatialNodeId(id: string = newRawId()): SpatialNodeEntityId {
	return id as SpatialNodeEntityId;
}

export function idKey(id: unknown): string {
	return String(id);
}
