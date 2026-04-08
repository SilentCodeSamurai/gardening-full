import { z } from "zod";
import { ItemPresentationSchema, LocationEntityIdSchema, LocationEntityIdsSchema } from "../../shared/schemas";

export const CreateLocationInputSchema = z.object({
	name: z.string().min(1),
	presentation: ItemPresentationSchema,
});
export const GetLocationByIdInputSchema = z.object({
	id: LocationEntityIdSchema,
});
export const UpdateLocationInputSchema = z.object({
	id: LocationEntityIdSchema,
	name: z.string().min(1).optional(),
	presentation: ItemPresentationSchema,
});
export const DeleteLocationInputSchema = z.object({
	id: LocationEntityIdSchema,
});
export const DeleteManyLocationInputSchema = z.object({
	ids: LocationEntityIdsSchema,
});
