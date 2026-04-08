// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used for links in jsdoc
import type { CultivarEntity, SpeciesEntity } from "./entities";
import type { GardeningActionType, ItemPresentationIconKey } from "./enums";

/**
 * Fields shared with live {@link SpeciesEntity}.
 */
export interface SpeciesCharacteristics {
	name: string;
	description: string | null;
}

/**
 * Fields shared with live {@link CultivarEntity}.
 */
export interface CultivarCharacteristics {
	name: string;
	description: string | null;
}

/**
 * Optional presentation metadata shared by catalog entities in the UI.
 *
 * `iconKey` picks a predefined icon in the frontend icon registry.
 * Color fields are plain CSS color values (hex/rgb/hsl/named).
 */
export interface ItemPresentationValueObject {
	iconKey?: ItemPresentationIconKey;
	iconColor?: string;
	backgroundColor?: string;
}

/**
 * Discriminated union of logged actions: `type` matches {@link GardeningActionType}, plus
 * `content` for user text. Keeps the default path lightweight; richer fields can be added
 * per variant later without breaking the “note + kind” model.
 */
export type GardeningAction =
	| WateringAction
	| FertilizationAction
	| PruningAction
	| HarvestingAction
	| TransplantingAction
	| NoteAction;

/**
 * Shared shape for each action variant: discriminator `type` plus freeform `content`.
 * @internal
 */
interface BaseAction<TActionType extends GardeningActionType> {
	type: TActionType;
	/** Primary payload for freeform content. */
	content: string;
}

/** Single-variant slice of {@link GardeningActionType} for watering. */
type WateringAction = BaseAction<Extract<GardeningActionType, "watering">>;

/** Single-variant slice of {@link GardeningActionType} for fertilization. */
type FertilizationAction = BaseAction<Extract<GardeningActionType, "fertilization">>;

/** Single-variant slice of {@link GardeningActionType} for pruning. */
type PruningAction = BaseAction<Extract<GardeningActionType, "pruning">>;

/** Single-variant slice of {@link GardeningActionType} for harvesting. */
type HarvestingAction = BaseAction<Extract<GardeningActionType, "harvesting">>;

/** Single-variant slice of {@link GardeningActionType} for transplanting. */
type TransplantingAction = BaseAction<Extract<GardeningActionType, "transplanting">>;

/** Single-variant slice of {@link GardeningActionType} for notes. */
type NoteAction = BaseAction<Extract<GardeningActionType, "note">>;
