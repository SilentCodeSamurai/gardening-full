import { ResourceRef } from "@backend/core/domain/resource-access";

export const APPLICATION_RESOURCE_TYPES = {
	/** Create-scope parent for tenancy; not a gardening-specific type string. */
	workspace: "workspace",
	catalog: "gardening.catalog",
	plant: "gardening.plant",
	location: "gardening.location",
	event: "gardening.event",
	cultivar: "gardening.cultivar",
	species: "gardening.species",
	speciesCategory: "gardening.speciesCategory",
	spatialNode: "spatial.spatialNode",
} as const;

export function workspaceRef(workspaceId: string): ResourceRef {
	return ResourceRef.create({ type: APPLICATION_RESOURCE_TYPES.workspace, id: workspaceId });
}

/** Default workspace id until request-scoped tenancy picks a workspace per request. */
export const DEFAULT_WORKSPACE_ID = "default" as const;

export function defaultWorkspaceRef(): ResourceRef {
	return workspaceRef(DEFAULT_WORKSPACE_ID);
}

export function gardeningCatalogRootRef(): ResourceRef {
	return ResourceRef.create({ type: APPLICATION_RESOURCE_TYPES.catalog, id: "root" });
}

export function gardeningPlantRef(plantId: string): ResourceRef {
	return ResourceRef.create({ type: APPLICATION_RESOURCE_TYPES.plant, id: plantId });
}

export function gardeningLocationRef(locationId: string): ResourceRef {
	return ResourceRef.create({ type: APPLICATION_RESOURCE_TYPES.location, id: locationId });
}

export function gardeningEventRef(eventId: string): ResourceRef {
	return ResourceRef.create({ type: APPLICATION_RESOURCE_TYPES.event, id: eventId });
}

export function gardeningCultivarRef(cultivarId: string): ResourceRef {
	return ResourceRef.create({ type: APPLICATION_RESOURCE_TYPES.cultivar, id: cultivarId });
}

export function gardeningSpeciesRef(speciesId: string): ResourceRef {
	return ResourceRef.create({ type: APPLICATION_RESOURCE_TYPES.species, id: speciesId });
}

export function gardeningSpeciesCategoryRef(categoryId: string): ResourceRef {
	return ResourceRef.create({ type: APPLICATION_RESOURCE_TYPES.speciesCategory, id: categoryId });
}

export function spatialSpatialNodeRef(nodeId: string): ResourceRef {
	return ResourceRef.create({ type: APPLICATION_RESOURCE_TYPES.spatialNode, id: nodeId });
}

