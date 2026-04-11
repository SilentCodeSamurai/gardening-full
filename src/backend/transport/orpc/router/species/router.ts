import {
	SpeciesCreateUseCase,
	SpeciesDeleteUseCase,
	SpeciesGetAllUseCase,
	SpeciesGetByIdUseCase,
	SpeciesUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/species.crud-use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { authenticatedProcedure } from "../../orpc-procedure";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateSpeciesInputSchema,
	DeleteSpeciesInputSchema,
	GetSpeciesByIdInputSchema,
	UpdateSpeciesInputSchema,
} from "./schemas";

export const speciesRouter = {
	create: authenticatedProcedure
		.input(CreateSpeciesInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getById: authenticatedProcedure
		.input(GetSpeciesByIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesGetByIdUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getAll: authenticatedProcedure.handler(({ context }) =>
		resolveAndExecute(SpeciesGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: authenticatedProcedure
		.input(UpdateSpeciesInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	delete: authenticatedProcedure
		.input(DeleteSpeciesInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesDeleteUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
};
