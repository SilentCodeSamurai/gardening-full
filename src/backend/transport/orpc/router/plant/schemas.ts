import { z } from "zod";
import { CultivarEntityIdSchema, PlantEntityIdSchema, PlantEntityIdsSchema } from "../../shared/schemas";

export const CreatePlantInputSchema = z.object({
	title: z.string().nullable(),
	description: z.string().nullable(),
	cultivarId: CultivarEntityIdSchema.nullable(),
});
export const CreateManyPlantInputSchema = z.object({
	rows: z.array(CreatePlantInputSchema).min(1),
});
export const GetPlantByIdInputSchema = z.object({
	id: PlantEntityIdSchema,
});
export const UpdatePlantInputSchema = z.object({
	id: PlantEntityIdSchema,
	title: z.string().nullable(),
	description: z.string().nullable(),
	cultivarId: z.union([CultivarEntityIdSchema, z.null()]).optional(),
});
export const DeletePlantInputSchema = z.object({
	id: PlantEntityIdSchema,
});
export const DeleteManyPlantInputSchema = z.object({
	ids: PlantEntityIdsSchema,
});
