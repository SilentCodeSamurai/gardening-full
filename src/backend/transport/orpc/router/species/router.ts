import {
	SpeciesCreateUseCase,
	SpeciesDeleteUseCase,
	SpeciesGetAllUseCase,
	SpeciesGetByIdUseCase,
	SpeciesUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/species.crud-use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { procedure } from "../../orpc-procedure";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateSpeciesInputSchema,
	DeleteSpeciesInputSchema,
	GetSpeciesByIdInputSchema,
	UpdateSpeciesInputSchema,
} from "./schemas";

export const speciesRouter = {
	create: procedure
		.input(CreateSpeciesInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getById: procedure
		.input(GetSpeciesByIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesGetByIdUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getAll: procedure.handler(({ context }) =>
		resolveAndExecute(SpeciesGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: procedure
		.input(UpdateSpeciesInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	delete: procedure
		.input(DeleteSpeciesInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesDeleteUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
};
