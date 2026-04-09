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
import { procedure } from "../../orpc-procedure";
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
	create: procedure
		.input(CreatePlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	createMany: procedure
		.input(CreateManyPlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantCreateManyUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { rows: input.rows },
			}),
		),
	getById: procedure
		.input(GetPlantByIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantGetByIdUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getAll: procedure.handler(({ context }) =>
		resolveAndExecute(PlantGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: procedure
		.input(UpdatePlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	delete: procedure
		.input(DeletePlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantDeleteUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	deleteMany: procedure
		.input(DeleteManyPlantInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(PlantDeleteManyUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
};
