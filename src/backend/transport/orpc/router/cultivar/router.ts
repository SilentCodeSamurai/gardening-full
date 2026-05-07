import {
	CultivarBulkEditByIdsUseCase,
	CultivarCreateUseCase,
	CultivarDeleteManyUseCase,
	CultivarDeleteUseCase,
	CultivarGetAllUseCase,
	CultivarGetByIdUseCase,
	CultivarGetFullByIdUseCase,
	CultivarUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/cultivar.use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { authenticatedProcedure } from "../../orpc-procedure";
import { runUseCaseOrpc } from "../../shared/run-use-case-orpc";
import {
	BulkEditByIdsCultivarInputSchema,
	CreateCultivarInputSchema,
	DeleteCultivarInputSchema,
	DeleteManyCultivarInputSchema,
	GetCultivarByIdInputSchema,
	GetCultivarFullByIdInputSchema,
	UpdateCultivarInputSchema,
} from "./schemas";

export const cultivarRouter = {
	create: authenticatedProcedure
		.input(CreateCultivarInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(CultivarCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getById: authenticatedProcedure
		.input(GetCultivarByIdInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(CultivarGetByIdUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getFullById: authenticatedProcedure.input(GetCultivarFullByIdInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(CultivarGetFullByIdUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: input,
		}),
	),
	getAll: authenticatedProcedure.handler(({ context }) =>
		runUseCaseOrpc(CultivarGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: authenticatedProcedure
		.input(UpdateCultivarInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(CultivarUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	bulkEditByIds: authenticatedProcedure
		.input(BulkEditByIdsCultivarInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(CultivarBulkEditByIdsUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	delete: authenticatedProcedure
		.input(DeleteCultivarInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(CultivarDeleteUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	deleteMany: authenticatedProcedure
		.input(DeleteManyCultivarInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(CultivarDeleteManyUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
};
