import {
	GardeningEventCreateForLocationUseCase,
	GardeningEventCreateForPlantListUseCase,
	GardeningEventCreateUseCase,
	GardeningEventDeleteUseCase,
	GardeningEventGetAllUseCase,
	GardeningEventGetBindingsForEventUseCase,
	GardeningEventGetByIdUseCase,
	GardeningEventGetForLocationUseCase,
	GardeningEventGetForPlantUseCase,
	GardeningEventUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/gardening-event.use-cases";
import { os } from "@orpc/server";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateGardeningEventForLocationInputSchema,
	CreateGardeningEventForPlantListInputSchema,
	CreateGardeningEventInputSchema,
	DeleteGardeningEventInputSchema,
	GetGardeningEventBindingsInputSchema,
	GetGardeningEventByIdInputSchema,
	GetGardeningEventForLocationInputSchema,
	GetGardeningEventForPlantInputSchema,
	UpdateGardeningEventInputSchema,
} from "./schemas";

export const gardeningEventRouter = {
	getAll: os.handler(() => resolveAndExecute(GardeningEventGetAllUseCase)),
	getById: os
		.input(GetGardeningEventByIdInputSchema)
		.handler(({ input }) => resolveAndExecute(GardeningEventGetByIdUseCase, input)),
	update: os
		.input(UpdateGardeningEventInputSchema)
		.handler(({ input }) => resolveAndExecute(GardeningEventUpdateUseCase, input)),
	delete: os
		.input(DeleteGardeningEventInputSchema)
		.handler(({ input }) => resolveAndExecute(GardeningEventDeleteUseCase, input)),
	create: os
		.input(CreateGardeningEventInputSchema)
		.handler(({ input }) => resolveAndExecute(GardeningEventCreateUseCase, input)),
	createForLocation: os
		.input(CreateGardeningEventForLocationInputSchema)
		.handler(({ input }) => resolveAndExecute(GardeningEventCreateForLocationUseCase, input)),
	createForPlantList: os
		.input(CreateGardeningEventForPlantListInputSchema)
		.handler(({ input }) => resolveAndExecute(GardeningEventCreateForPlantListUseCase, input)),
	getForPlant: os
		.input(GetGardeningEventForPlantInputSchema)
		.handler(({ input }) => resolveAndExecute(GardeningEventGetForPlantUseCase, input)),
	getForLocation: os
		.input(GetGardeningEventForLocationInputSchema)
		.handler(({ input }) => resolveAndExecute(GardeningEventGetForLocationUseCase, input)),
	getBindingsForEvent: os
		.input(GetGardeningEventBindingsInputSchema)
		.handler(({ input }) => resolveAndExecute(GardeningEventGetBindingsForEventUseCase, input)),
};
