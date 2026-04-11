import {
	SpeciesCategoryCreateUseCase,
	SpeciesCategoryDeleteUseCase,
	SpeciesCategoryGetAllUseCase,
	SpeciesCategoryGetByIdUseCase,
	SpeciesCategoryUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/species-category.crud-use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { authenticatedProcedure } from "../../orpc-procedure";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateSpeciesCategoryInputSchema,
	DeleteSpeciesCategoryInputSchema,
	GetSpeciesCategoryByIdInputSchema,
	UpdateSpeciesCategoryInputSchema,
} from "./schemas";

export const speciesCategoryRouter = {
	create: authenticatedProcedure
		.input(CreateSpeciesCategoryInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesCategoryCreateUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	getById: authenticatedProcedure
		.input(GetSpeciesCategoryByIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesCategoryGetByIdUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	getAll: authenticatedProcedure.handler(({ context }) =>
		resolveAndExecute(SpeciesCategoryGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: authenticatedProcedure
		.input(UpdateSpeciesCategoryInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesCategoryUpdateUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	delete: authenticatedProcedure
		.input(DeleteSpeciesCategoryInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpeciesCategoryDeleteUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
};
