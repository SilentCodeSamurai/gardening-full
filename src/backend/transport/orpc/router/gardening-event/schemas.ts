import { z } from "zod";
import {
	GardeningActionSchema,
	GardeningEventEntityIdSchema,
	GardeningEventEntityIdsSchema,
	LocationEntityIdSchema,
	PlantEntityIdSchema,
	PlantEntityIdsSchema,
} from "../../shared/schemas";

export const CreateGardeningEventInputSchema = z.object({
	action: GardeningActionSchema,
	occurredAt: z.union([z.coerce.date(), z.null()]),
});
export const CreateGardeningEventForLocationInputSchema = z.object({
	locationId: LocationEntityIdSchema,
	action: GardeningActionSchema,
	occurredAt: z.union([z.coerce.date(), z.null()]),
});
export const CreateGardeningEventForPlantListInputSchema = z.object({
	action: GardeningActionSchema,
	plantIds: PlantEntityIdsSchema,
	occurredAt: z.union([z.coerce.date(), z.null()]),
});
export const GetGardeningEventByIdInputSchema = z.object({
	id: GardeningEventEntityIdSchema,
});
export const UpdateGardeningEventInputSchema = z.object({
	id: GardeningEventEntityIdSchema,
	action: GardeningActionSchema.optional(),
	occurredAt: z.union([z.coerce.date(), z.null()]).optional(),
});
export const DeleteGardeningEventInputSchema = z.object({
	id: GardeningEventEntityIdSchema,
});
export const DeleteManyGardeningEventInputSchema = z.object({
	ids: GardeningEventEntityIdsSchema,
});
export const GetGardeningEventForPlantInputSchema = z.object({
	plantId: PlantEntityIdSchema,
});
export const GetGardeningEventForLocationInputSchema = z.object({
	locationId: LocationEntityIdSchema,
});
export const GetGardeningEventBindingsInputSchema = z.object({
	id: GardeningEventEntityIdSchema,
});
