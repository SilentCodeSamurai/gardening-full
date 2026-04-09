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
import { procedure } from "../../orpc-procedure";
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
	getAll: procedure.handler(({ context }) =>
		resolveAndExecute(GardeningEventGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	getById: procedure
		.input(GetGardeningEventByIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventGetByIdUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
	update: procedure
		.input(UpdateGardeningEventInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	delete: procedure
		.input(DeleteGardeningEventInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventDeleteUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
	create: procedure
		.input(CreateGardeningEventInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	createForLocation: procedure
		.input(CreateGardeningEventForLocationInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventCreateForLocationUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	createForPlantList: procedure
		.input(CreateGardeningEventForPlantListInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventCreateForPlantListUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	getForPlant: procedure
		.input(GetGardeningEventForPlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventGetForPlantUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { plantId: input.plantId },
			}),
		),
	getForLocation: procedure
		.input(GetGardeningEventForLocationInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventGetForLocationUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { locationId: input.locationId },
			}),
		),
	getBindingsForEvent: procedure
		.input(GetGardeningEventBindingsInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(GardeningEventGetBindingsForEventUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
};
