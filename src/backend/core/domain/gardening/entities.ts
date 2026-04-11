import type { WorkspaceKey } from "@backend/core/domain/access/workspace.vo";
import type { BaseEntity, BaseEntityId } from "../shared/entities";
import type {
	CultivarCharacteristics,
	GardeningAction,
	ItemPresentationValueObject,
	SpeciesCharacteristics,
} from "./value-objects";

// Ids for the various entities in the gardening domain.
export type SpeciesEntityId = BaseEntityId<string, "Species">;
export type SpeciesCategoryEntityId = BaseEntityId<string, "SpeciesCategory">;
export type CultivarEntityId = BaseEntityId<string, "Cultivar">;
export type GardeningEventEntityId = BaseEntityId<string, "GardeningEvent">;
export type PlantEntityId = BaseEntityId<string, "Plant">;
export type LocationEntityId = BaseEntityId<string, "Location">;

/**
 * A catalog category/grouping for species (e.g., “Vegetables”, “Herbs”).
 * Whether a row is the populate-managed shared catalog is determined from access-control metadata, not stored here.
 */
export type SpeciesCategoryEntity = BaseEntity<SpeciesCategoryEntityId> & {
	workspaceKey: WorkspaceKey;
	title: string;
	presentation?: ItemPresentationValueObject;
};

/**
 * Live catalog entry for a species: identity and current presentation (name, description).
 *
 * `categoryId` - link to the {@link SpeciesCategoryEntity} that this species belongs to.
 *
 * Edits here should propagate to linked plants.
 */
export type SpeciesEntity = BaseEntity<SpeciesEntityId> & {
	workspaceKey: WorkspaceKey;
	categoryId: SpeciesCategoryEntityId;
	characteristics: SpeciesCharacteristics;
	presentation?: ItemPresentationValueObject;
};

/**
 * Live catalog entry for a cultivar under a species.
 *
 * `speciesId` - link to the {@link SpeciesEntity} that this cultivar belongs to.
 */
export type CultivarEntity = BaseEntity<CultivarEntityId> & {
	workspaceKey: WorkspaceKey;
	speciesId: SpeciesEntityId;
	characteristics: CultivarCharacteristics;
	presentation?: ItemPresentationValueObject;
};

export type HydratedCultivarEntity = CultivarEntity & {
	species: SpeciesEntity;
};

/**
 * Something the user logged (watering, pruning, notes, etc.): action kind and freeform content.
 *
 * When an action is anchored to a {@link LocationEntity}, the application should also link the event to every {@link PlantEntity} that occupied that location at event creation time. If a plant moves later, those links do not change.
 */
export type GardeningEventEntity = BaseEntity<GardeningEventEntityId> & {
	workspaceKey: WorkspaceKey;
	action: GardeningAction;
};

/**
 * A physical plant persisted with a cultivar link.
 *
 * `locationId` - link to the {@link LocationEntity} that this plant is placed in. May be null when the plant is not placed in a location.
 */
export type PlantEntity = BaseEntity<PlantEntityId> & {
	workspaceKey: WorkspaceKey;
	title: string | null;
	description: string | null;
	cultivarId: CultivarEntityId;
};

export type HydratedPlantEntity = PlantEntity & {
	cultivar: HydratedCultivarEntity;
};

/**
 * A place in the garden (bed, greenhouse, etc.). Tree structure for holding plants.
 *
 * 'parentId' - link to the {@link LocationEntity} that this location is a child of. `null` when this location is the root location.
 */
export type LocationEntity = BaseEntity<LocationEntityId> & {
	workspaceKey: WorkspaceKey;
	name: string;
	/** Optional UI presentation (icon, colors) for the layout editor and lists. */
	presentation?: ItemPresentationValueObject;
};
