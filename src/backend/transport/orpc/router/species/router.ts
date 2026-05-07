import {
	SpeciesBulkEditByIdsUseCase,
	SpeciesCreateUseCase,
	SpeciesDeleteManyUseCase,
	SpeciesDeleteUseCase,
	SpeciesGetAllUseCase,
	SpeciesGetByIdUseCase,
	SpeciesUpdateUseCase,
} from "#/backend/core/application/use-cases/gardening/species.use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { authenticatedProcedure } from "../../orpc-procedure";
import { runUseCaseOrpc } from "../../shared/run-use-case-orpc";
import {
	BulkEditByIdsSpeciesInputSchema,
	CreateSpeciesInputSchema,
	DeleteManySpeciesInputSchema,
	DeleteSpeciesInputSchema,
	GetSpeciesByIdInputSchema,
	UpdateSpeciesInputSchema,
} from "./schemas";

export const speciesRouter = {
	create: authenticatedProcedure
		.input(CreateSpeciesInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(SpeciesCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getById: authenticatedProcedure
		.input(GetSpeciesByIdInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(SpeciesGetByIdUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getAll: authenticatedProcedure.handler(({ context }) =>
		runUseCaseOrpc(SpeciesGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: authenticatedProcedure
		.input(UpdateSpeciesInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(SpeciesUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	bulkEditByIds: authenticatedProcedure
		.input(BulkEditByIdsSpeciesInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(SpeciesBulkEditByIdsUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	delete: authenticatedProcedure
		.input(DeleteSpeciesInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(SpeciesDeleteUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	deleteMany: authenticatedProcedure
		.input(DeleteManySpeciesInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(SpeciesDeleteManyUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
};
