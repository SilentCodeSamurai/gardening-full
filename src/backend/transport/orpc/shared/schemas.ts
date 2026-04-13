import type {
	CultivarEntityId,
	GardeningEventEntityId,
	LocationEntityId,
	PlantEntityId,
	SpeciesCategoryEntityId,
	SpeciesEntityId,
} from "@backend/core/domain/gardening/entities";
import { GardeningActionType, ItemPresentationIconKey } from "@backend/core/domain/gardening/enums";
import type { SpatialNodeEntityId } from "@backend/core/domain/spatial/entities";
import { z } from "zod";

const asBrandedStringSchema = <TBrand extends string>() => z.string().transform((value) => value as TBrand);

export const SpeciesEntityIdSchema = asBrandedStringSchema<SpeciesEntityId>();
export const SpeciesCategoryEntityIdSchema = asBrandedStringSchema<SpeciesCategoryEntityId>();
export const CultivarEntityIdSchema = asBrandedStringSchema<CultivarEntityId>();
export const PlantEntityIdSchema = asBrandedStringSchema<PlantEntityId>();
export const LocationEntityIdSchema = asBrandedStringSchema<LocationEntityId>();
export const GardeningEventEntityIdSchema = asBrandedStringSchema<GardeningEventEntityId>();
export const SpatialNodeEntityIdSchema = asBrandedStringSchema<SpatialNodeEntityId>();

export const PlantEntityIdsSchema = z.array(PlantEntityIdSchema).min(1);
export const LocationEntityIdsSchema = z.array(LocationEntityIdSchema).min(1);
export const SpeciesEntityIdsSchema = z.array(SpeciesEntityIdSchema).min(1);
export const SpeciesCategoryEntityIdsSchema = z.array(SpeciesCategoryEntityIdSchema).min(1);
export const CultivarEntityIdsSchema = z.array(CultivarEntityIdSchema).min(1);
export const GardeningEventEntityIdsSchema = z.array(GardeningEventEntityIdSchema).min(1);
export const SpatialNodeEntityIdsSchema = z.array(SpatialNodeEntityIdSchema).min(1);

const itemPresentationIconKeyLiterals = Object.values(ItemPresentationIconKey).map((value) => z.literal(value));

export const ItemPresentationIconKeySchema = z.union(
	itemPresentationIconKeyLiterals as [
		(typeof itemPresentationIconKeyLiterals)[number],
		(typeof itemPresentationIconKeyLiterals)[number],
		...(typeof itemPresentationIconKeyLiterals)[number][],
	],
);

export const ItemPresentationSchema = z
	.object({
		iconKey: ItemPresentationIconKeySchema.optional(),
		iconColor: z.string().optional(),
		backgroundColor: z.string().optional(),
	})
	.optional();

export const SpeciesCharacteristicsSchema = z.object({
	name: z.string().min(1),
	description: z.string().nullable(),
});

export const CultivarCharacteristicsSchema = z.object({
	name: z.string().min(1),
	description: z.string().nullable(),
});

export const GardeningActionSchema = z.object({
	type: z.enum([
		GardeningActionType.watering,
		GardeningActionType.fertilization,
		GardeningActionType.pruning,
		GardeningActionType.harvesting,
		GardeningActionType.transplanting,
		GardeningActionType.note,
	]),
	content: z.string(),
});

export const SpatialRectSchema = z.object({
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
});

export const SpatialNodeRefSchema = z
	.object({
		entity: z.enum(["location", "plant"]),
		entityId: z.string(),
	})
	.superRefine((value, ctx) => {
		if (value.entity === "location") {
			const parsed = LocationEntityIdSchema.safeParse(value.entityId);
			if (!parsed.success) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid location entity id." });
			}
		}
		if (value.entity === "plant") {
			const parsed = PlantEntityIdSchema.safeParse(value.entityId);
			if (!parsed.success) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid plant entity id." });
			}
		}
	})
	.transform((value) => {
		if (value.entity === "location") {
			return {
				entity: "location" as const,
				entityId: value.entityId as LocationEntityId,
			};
		}
		return {
			entity: "plant" as const,
			entityId: value.entityId as PlantEntityId,
		};
	});
