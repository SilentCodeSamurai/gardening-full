import {
	LocationCreateUseCase,
	LocationDeleteManyUseCase,
	LocationDeleteUseCase,
	LocationGetAllUseCase,
	LocationGetByIdUseCase,
	LocationUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/location.use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { authenticatedProcedure } from "../../orpc-procedure";
import { runUseCaseOrpc } from "../../shared/run-use-case-orpc";
import {
	CreateLocationInputSchema,
	DeleteLocationInputSchema,
	DeleteManyLocationInputSchema,
	GetLocationByIdInputSchema,
	UpdateLocationInputSchema,
} from "./schemas";

export const locationRouter = {
	create: authenticatedProcedure
		.input(CreateLocationInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(LocationCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getById: authenticatedProcedure.input(GetLocationByIdInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(LocationGetByIdUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: { id: input.id },
		}),
	),
	getAll: authenticatedProcedure.handler(({ context }) =>
		runUseCaseOrpc(LocationGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: authenticatedProcedure
		.input(UpdateLocationInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(LocationUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	delete: authenticatedProcedure.input(DeleteLocationInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(LocationDeleteUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: { id: input.id },
		}),
	),
	deleteMany: authenticatedProcedure
		.input(DeleteManyLocationInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(LocationDeleteManyUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
};
