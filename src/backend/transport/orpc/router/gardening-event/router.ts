import {
	GardeningEventBulkEditByIdsUseCase,
	GardeningEventCreateForLocationUseCase,
	GardeningEventCreateForPlantListUseCase,
	GardeningEventCreateUseCase,
	GardeningEventDeleteManyUseCase,
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
import { runUseCaseOrpc } from "../../shared/run-use-case-orpc";
import {
	BulkEditByIdsGardeningEventInputSchema,
	CreateGardeningEventForLocationInputSchema,
	CreateGardeningEventForPlantListInputSchema,
	CreateGardeningEventInputSchema,
	DeleteGardeningEventInputSchema,
	DeleteManyGardeningEventInputSchema,
	GetGardeningEventBindingsInputSchema,
	GetGardeningEventByIdInputSchema,
	GetGardeningEventForLocationInputSchema,
	GetGardeningEventForPlantInputSchema,
	UpdateGardeningEventInputSchema,
} from "./schemas";

export const gardeningEventRouter = {
	getAll: authenticatedProcedure.handler(({ context }) =>
		runUseCaseOrpc(GardeningEventGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	getById: authenticatedProcedure.input(GetGardeningEventByIdInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(GardeningEventGetByIdUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: { id: input.id },
		}),
	),
	update: authenticatedProcedure
		.input(UpdateGardeningEventInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(GardeningEventUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	bulkEditByIds: authenticatedProcedure
		.input(BulkEditByIdsGardeningEventInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(GardeningEventBulkEditByIdsUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	delete: authenticatedProcedure.input(DeleteGardeningEventInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(GardeningEventDeleteUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: { id: input.id },
		}),
	),
	deleteMany: authenticatedProcedure.input(DeleteManyGardeningEventInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(GardeningEventDeleteManyUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: input,
		}),
	),
	create: authenticatedProcedure
		.input(CreateGardeningEventInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(GardeningEventCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	createForLocation: authenticatedProcedure
		.input(CreateGardeningEventForLocationInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(GardeningEventCreateForLocationUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	createForPlantList: authenticatedProcedure
		.input(CreateGardeningEventForPlantListInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(GardeningEventCreateForPlantListUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	getForPlant: authenticatedProcedure.input(GetGardeningEventForPlantInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(GardeningEventGetForPlantUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: { plantId: input.plantId },
		}),
	),
	getForLocation: authenticatedProcedure
		.input(GetGardeningEventForLocationInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(GardeningEventGetForLocationUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { locationId: input.locationId },
			}),
		),
	getBindingsForEvent: authenticatedProcedure
		.input(GetGardeningEventBindingsInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(GardeningEventGetBindingsForEventUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
};
