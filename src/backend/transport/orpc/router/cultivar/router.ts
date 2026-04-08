import {
	CultivarCreateUseCase,
	CultivarDeleteUseCase,
	CultivarGetAllUseCase,
	CultivarGetByIdUseCase,
	CultivarGetFullByIdUseCase,
	CultivarUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/cultivar.use-cases";
import { os } from "@orpc/server";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateCultivarInputSchema,
	DeleteCultivarInputSchema,
	GetCultivarByIdInputSchema,
	GetCultivarFullByIdInputSchema,
	UpdateCultivarInputSchema,
} from "./schemas";

export const cultivarRouter = {
	create: os.input(CreateCultivarInputSchema).handler(({ input }) => resolveAndExecute(CultivarCreateUseCase, input)),
	getById: os
		.input(GetCultivarByIdInputSchema)
		.handler(({ input }) => resolveAndExecute(CultivarGetByIdUseCase, input)),
	getFullById: os
		.input(GetCultivarFullByIdInputSchema)
		.handler(({ input }) => resolveAndExecute(CultivarGetFullByIdUseCase, input)),
	getAll: os.handler(() => resolveAndExecute(CultivarGetAllUseCase)),
	update: os.input(UpdateCultivarInputSchema).handler(({ input }) => resolveAndExecute(CultivarUpdateUseCase, input)),
	delete: os.input(DeleteCultivarInputSchema).handler(({ input }) => resolveAndExecute(CultivarDeleteUseCase, input)),
};
