import {
	PlantBulkEditByIdsUseCase,
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
import { runUseCaseOrpc } from "../../shared/run-use-case-orpc";
import {
	BulkEditByIdsPlantInputSchema,
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
			runUseCaseOrpc(PlantCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	createMany: authenticatedProcedure.input(CreateManyPlantInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(PlantCreateManyUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: { rows: input.rows },
		}),
	),
	getById: authenticatedProcedure
		.input(GetPlantByIdInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(PlantGetByIdUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getAll: authenticatedProcedure.handler(({ context }) =>
		runUseCaseOrpc(PlantGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: authenticatedProcedure
		.input(UpdatePlantInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(PlantUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	bulkEditByIds: authenticatedProcedure
		.input(BulkEditByIdsPlantInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(PlantBulkEditByIdsUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	delete: authenticatedProcedure
		.input(DeletePlantInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(PlantDeleteUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	deleteMany: authenticatedProcedure
		.input(DeleteManyPlantInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(PlantDeleteManyUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
};
