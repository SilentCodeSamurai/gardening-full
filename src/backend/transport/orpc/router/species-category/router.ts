import {
	SpeciesCategoryCreateUseCase,
	SpeciesCategoryDeleteManyUseCase,
	SpeciesCategoryDeleteUseCase,
	SpeciesCategoryGetAllUseCase,
	SpeciesCategoryGetByIdUseCase,
	SpeciesCategoryUpdateUseCase,
} from "#/backend/core/application/use-cases/gardening/species-category.use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { authenticatedProcedure } from "../../orpc-procedure";
import { runUseCaseOrpc } from "../../shared/run-use-case-orpc";
import {
	CreateSpeciesCategoryInputSchema,
	DeleteManySpeciesCategoryInputSchema,
	DeleteSpeciesCategoryInputSchema,
	GetSpeciesCategoryByIdInputSchema,
	UpdateSpeciesCategoryInputSchema,
} from "./schemas";

export const speciesCategoryRouter = {
	create: authenticatedProcedure.input(CreateSpeciesCategoryInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(SpeciesCategoryCreateUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: input,
		}),
	),
	getById: authenticatedProcedure.input(GetSpeciesCategoryByIdInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(SpeciesCategoryGetByIdUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: input,
		}),
	),
	getAll: authenticatedProcedure.handler(({ context }) =>
		runUseCaseOrpc(SpeciesCategoryGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: authenticatedProcedure.input(UpdateSpeciesCategoryInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(SpeciesCategoryUpdateUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: input,
		}),
	),
	delete: authenticatedProcedure.input(DeleteSpeciesCategoryInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(SpeciesCategoryDeleteUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: input,
		}),
	),
	deleteMany: authenticatedProcedure.input(DeleteManySpeciesCategoryInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(SpeciesCategoryDeleteManyUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: input,
		}),
	),
};
