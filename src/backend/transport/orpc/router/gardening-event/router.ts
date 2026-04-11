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

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { authenticatedProcedure } from "../../orpc-procedure";
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
	getAll: authenticatedProcedure.handler(({ context }) =>
		resolveAndExecute(GardeningEventGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	getById: authenticatedProcedure
		.input(GetGardeningEventByIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventGetByIdUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
	update: authenticatedProcedure
		.input(UpdateGardeningEventInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	delete: authenticatedProcedure
		.input(DeleteGardeningEventInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventDeleteUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
	create: authenticatedProcedure
		.input(CreateGardeningEventInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	createForLocation: authenticatedProcedure
		.input(CreateGardeningEventForLocationInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventCreateForLocationUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	createForPlantList: authenticatedProcedure
		.input(CreateGardeningEventForPlantListInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventCreateForPlantListUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	getForPlant: authenticatedProcedure
		.input(GetGardeningEventForPlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventGetForPlantUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { plantId: input.plantId },
			}),
		),
	getForLocation: authenticatedProcedure
		.input(GetGardeningEventForLocationInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventGetForLocationUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { locationId: input.locationId },
			}),
		),
	getBindingsForEvent: authenticatedProcedure
		.input(GetGardeningEventBindingsInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventGetBindingsForEventUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
};
