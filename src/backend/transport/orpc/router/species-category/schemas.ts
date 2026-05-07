import { z } from "zod";
import {
	ItemPresentationSchema,
	SpeciesCategoryEntityIdSchema,
	SpeciesCategoryEntityIdsSchema,
} from "../../shared/schemas";

export const CreateSpeciesCategoryInputSchema = z.object({
	title: z.string().min(1),
	presentation: ItemPresentationSchema,
});
export const GetSpeciesCategoryByIdInputSchema = z.object({
	id: SpeciesCategoryEntityIdSchema,
});
export const UpdateSpeciesCategoryInputSchema = z.object({
	id: SpeciesCategoryEntityIdSchema,
	title: z.string().min(1).optional(),
	presentation: ItemPresentationSchema,
});
export const BulkEditByIdsSpeciesCategoryInputSchema = z.object({
	ids: SpeciesCategoryEntityIdsSchema,
	title: z.string().min(1).optional(),
	presentation: ItemPresentationSchema.optional(),
});
export const DeleteSpeciesCategoryInputSchema = z.object({
	id: SpeciesCategoryEntityIdSchema,
});
export const DeleteManySpeciesCategoryInputSchema = z.object({
	ids: SpeciesCategoryEntityIdsSchema,
});
