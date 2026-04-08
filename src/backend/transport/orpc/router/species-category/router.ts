import {
	SpeciesCategoryCreateUseCase,
	SpeciesCategoryDeleteUseCase,
	SpeciesCategoryGetAllUseCase,
	SpeciesCategoryGetByIdUseCase,
	SpeciesCategoryUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/species-category.crud-use-cases";
import { os } from "@orpc/server";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateSpeciesCategoryInputSchema,
	DeleteSpeciesCategoryInputSchema,
	GetSpeciesCategoryByIdInputSchema,
	UpdateSpeciesCategoryInputSchema,
} from "./schemas";

export const speciesCategoryRouter = {
	create: os
		.input(CreateSpeciesCategoryInputSchema)
		.handler(({ input }) => resolveAndExecute(SpeciesCategoryCreateUseCase, input)),
	getById: os
		.input(GetSpeciesCategoryByIdInputSchema)
		.handler(({ input }) => resolveAndExecute(SpeciesCategoryGetByIdUseCase, input)),
	getAll: os.handler(() => resolveAndExecute(SpeciesCategoryGetAllUseCase)),
	update: os
		.input(UpdateSpeciesCategoryInputSchema)
		.handler(({ input }) => resolveAndExecute(SpeciesCategoryUpdateUseCase, input)),
	delete: os
		.input(DeleteSpeciesCategoryInputSchema)
		.handler(({ input }) => resolveAndExecute(SpeciesCategoryDeleteUseCase, input)),
};
