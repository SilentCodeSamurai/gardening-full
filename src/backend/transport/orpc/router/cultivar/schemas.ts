import { z } from "zod";
import {
	CultivarCharacteristicsSchema,
	CultivarEntityIdSchema,
	CultivarEntityIdsSchema,
	ItemPresentationSchema,
	SpeciesEntityIdSchema,
} from "../../shared/schemas";

export const CreateCultivarInputSchema = z.object({
	speciesId: SpeciesEntityIdSchema,
	characteristics: CultivarCharacteristicsSchema,
	presentation: ItemPresentationSchema,
});
export const GetCultivarByIdInputSchema = z.object({
	id: CultivarEntityIdSchema,
});
export const GetCultivarFullByIdInputSchema = z.object({
	id: CultivarEntityIdSchema,
});
export const UpdateCultivarInputSchema = z.object({
	id: CultivarEntityIdSchema,
	speciesId: SpeciesEntityIdSchema.optional(),
	characteristics: CultivarCharacteristicsSchema.optional(),
	presentation: ItemPresentationSchema,
});
export const DeleteCultivarInputSchema = z.object({
	id: CultivarEntityIdSchema,
});
export const DeleteManyCultivarInputSchema = z.object({
	ids: CultivarEntityIdsSchema,
});
