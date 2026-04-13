import { z } from "zod";
import {
	ItemPresentationSchema,
	SpeciesCategoryEntityIdSchema,
	SpeciesCharacteristicsSchema,
	SpeciesEntityIdSchema,
	SpeciesEntityIdsSchema,
} from "../../shared/schemas";

export const CreateSpeciesInputSchema = z.object({
	categoryId: SpeciesCategoryEntityIdSchema,
	characteristics: SpeciesCharacteristicsSchema,
	presentation: ItemPresentationSchema,
});
export const GetSpeciesByIdInputSchema = z.object({
	id: SpeciesEntityIdSchema,
});
export const UpdateSpeciesInputSchema = z.object({
	id: SpeciesEntityIdSchema,
	categoryId: SpeciesCategoryEntityIdSchema.optional(),
	characteristics: SpeciesCharacteristicsSchema.optional(),
	presentation: ItemPresentationSchema,
});
export const DeleteSpeciesInputSchema = z.object({
	id: SpeciesEntityIdSchema,
});
export const DeleteManySpeciesInputSchema = z.object({
	ids: SpeciesEntityIdsSchema,
});
