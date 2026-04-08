import {
	SpeciesCreateUseCase,
	SpeciesDeleteUseCase,
	SpeciesGetAllUseCase,
	SpeciesGetByIdUseCase,
	SpeciesUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/species.crud-use-cases";
import { os } from "@orpc/server";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateSpeciesInputSchema,
	DeleteSpeciesInputSchema,
	GetSpeciesByIdInputSchema,
	UpdateSpeciesInputSchema,
} from "./schemas";

export const speciesRouter = {
	create: os.input(CreateSpeciesInputSchema).handler(({ input }) => resolveAndExecute(SpeciesCreateUseCase, input)),
	getById: os
		.input(GetSpeciesByIdInputSchema)
		.handler(({ input }) => resolveAndExecute(SpeciesGetByIdUseCase, input)),
	getAll: os.handler(() => resolveAndExecute(SpeciesGetAllUseCase)),
	update: os.input(UpdateSpeciesInputSchema).handler(({ input }) => resolveAndExecute(SpeciesUpdateUseCase, input)),
	delete: os.input(DeleteSpeciesInputSchema).handler(({ input }) => resolveAndExecute(SpeciesDeleteUseCase, input)),
};
