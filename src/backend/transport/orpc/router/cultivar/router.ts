import {
	CultivarCreateUseCase,
	CultivarDeleteUseCase,
	CultivarGetAllUseCase,
	CultivarGetByIdUseCase,
	CultivarGetFullByIdUseCase,
	CultivarUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/cultivar.use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { procedure } from "../../orpc-procedure";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateCultivarInputSchema,
	DeleteCultivarInputSchema,
	GetCultivarByIdInputSchema,
	GetCultivarFullByIdInputSchema,
	UpdateCultivarInputSchema,
} from "./schemas";

export const cultivarRouter = {
	create: procedure
		.input(CreateCultivarInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(CultivarCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getById: procedure
		.input(GetCultivarByIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(CultivarGetByIdUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getFullById: procedure
		.input(GetCultivarFullByIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(CultivarGetFullByIdUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: input,
			}),
		),
	getAll: procedure.handler(({ context }) =>
		resolveAndExecute(CultivarGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	update: procedure
		.input(UpdateCultivarInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(CultivarUpdateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	delete: procedure
		.input(DeleteCultivarInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(CultivarDeleteUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
};
