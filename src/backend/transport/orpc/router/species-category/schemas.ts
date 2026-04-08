import { z } from "zod";
import { ItemPresentationSchema, SpeciesCategoryEntityIdSchema } from "../../shared/schemas";

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
export const DeleteSpeciesCategoryInputSchema = z.object({
	id: SpeciesCategoryEntityIdSchema,
});
