import {
	PlantCreateManyUseCase,
	PlantCreateUseCase,
	PlantDeleteManyUseCase,
	PlantDeleteUseCase,
	PlantGetAllUseCase,
	PlantGetByIdUseCase,
	PlantUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/plant.use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { authenticatedProcedure } from "../../orpc-procedure";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateManyPlantInputSchema,
	CreatePlantInputSchema,
	DeleteManyPlantInputSchema,
	DeletePlantInputSchema,
	GetPlantByIdInputSchema,
	UpdatePlantInputSchema,
} from "./schemas";

export const plantRouter = {
	create: authenticatedProcedure
		.input(CreatePlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	createMany: authenticatedProcedure
		.input(CreateManyPlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantCreateManyUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { rows: input.rows },
			}),
		),
	getById: authenticatedProcedure
		.input(GetPlantByIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantGetByIdUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getAll: authenticatedProcedure.handler(({ context }) =>
		resolveAndExecute(PlantGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: authenticatedProcedure
		.input(UpdatePlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	delete: authenticatedProcedure
		.input(DeletePlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantDeleteUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	deleteMany: authenticatedProcedure
		.input(DeleteManyPlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantDeleteManyUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
};
