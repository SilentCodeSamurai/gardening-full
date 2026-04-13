import type { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
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
	workspace: WorkspaceVO;
	title: string;
	presentation?: ItemPresentationValueObject;
};

/**
 * Live catalog entry for a species: identity and current presentation (name, description).
 *
 * `categoryId` - optional link to the {@link SpeciesCategoryEntity} that this species belongs to.
 *
 * Edits here should propagate to linked plants.
 */
export type SpeciesEntity = BaseEntity<SpeciesEntityId> & {
	workspace: WorkspaceVO;
	categoryId: SpeciesCategoryEntityId | null;
	characteristics: SpeciesCharacteristics;
	presentation?: ItemPresentationValueObject;
};

/**
 * Live catalog entry for a cultivar, optionally under a species.
 *
 * `speciesId` - optional link to the {@link SpeciesEntity} that this cultivar belongs to.
 */
export type CultivarEntity = BaseEntity<CultivarEntityId> & {
	workspace: WorkspaceVO;
	speciesId: SpeciesEntityId | null;
	characteristics: CultivarCharacteristics;
	presentation?: ItemPresentationValueObject;
};

export type HydratedCultivarEntity = CultivarEntity & {
	species: SpeciesEntity | null;
};

/**
 * Something the user logged (watering, pruning, notes, etc.): action kind and freeform content.
 *
 * When an action is anchored to a {@link LocationEntity}, the application should also link the event to every {@link PlantEntity} that occupied that location at event creation time. If a plant moves later, those links do not change.
 */
export type GardeningEventEntity = BaseEntity<GardeningEventEntityId> & {
	workspace: WorkspaceVO;
	action: GardeningAction;
};

/**
 * A physical plant persisted in a workspace, optionally linked to a catalog cultivar.
 */
export type PlantEntity = BaseEntity<PlantEntityId> & {
	workspace: WorkspaceVO;
	title: string | null;
	description: string | null;
	cultivarId: CultivarEntityId | null;
};

export type HydratedPlantEntity = PlantEntity & {
	cultivar: HydratedCultivarEntity | null;
};

/**
 * A place in the garden (bed, greenhouse, etc.). Tree structure for holding plants.
 *
 * 'parentId' - link to the {@link LocationEntity} that this location is a child of. `null` when this location is the root location.
 */
export type LocationEntity = BaseEntity<LocationEntityId> & {
	workspace: WorkspaceVO;
	name: string;
	/** Optional UI presentation (icon, colors) for the layout editor and lists. */
	presentation?: ItemPresentationValueObject;
};
