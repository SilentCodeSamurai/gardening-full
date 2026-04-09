import {
	LocationCreateUseCase,
	LocationDeleteManyUseCase,
	LocationDeleteUseCase,
	LocationGetAllUseCase,
	LocationGetByIdUseCase,
	LocationUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/location.use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { procedure } from "../../orpc-procedure";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateLocationInputSchema,
	DeleteLocationInputSchema,
	DeleteManyLocationInputSchema,
	GetLocationByIdInputSchema,
	UpdateLocationInputSchema,
} from "./schemas";

export const locationRouter = {
	create: procedure
		.input(CreateLocationInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(LocationCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getById: procedure
		.input(GetLocationByIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(LocationGetByIdUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
	getAll: procedure.handler(({ context }) =>
		resolveAndExecute(LocationGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: procedure
		.input(UpdateLocationInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(LocationUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	delete: procedure
		.input(DeleteLocationInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(LocationDeleteUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
	deleteMany: procedure
		.input(DeleteManyLocationInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(LocationDeleteManyUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
};
