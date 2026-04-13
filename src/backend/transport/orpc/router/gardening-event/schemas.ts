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
});
export const CreateGardeningEventForLocationInputSchema = z.object({
	locationId: LocationEntityIdSchema,
	action: GardeningActionSchema,
});
export const CreateGardeningEventForPlantListInputSchema = z.object({
	action: GardeningActionSchema,
	plantIds: PlantEntityIdsSchema,
});
export const GetGardeningEventByIdInputSchema = z.object({
	id: GardeningEventEntityIdSchema,
});
export const UpdateGardeningEventInputSchema = z.object({
	id: GardeningEventEntityIdSchema,
	action: GardeningActionSchema.optional(),
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
