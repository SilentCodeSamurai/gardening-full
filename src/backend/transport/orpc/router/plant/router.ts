import {
	PlantCreateManyUseCase,
	PlantCreateUseCase,
	PlantDeleteManyUseCase,
	PlantDeleteUseCase,
	PlantGetAllUseCase,
	PlantGetByIdUseCase,
	PlantUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/plant.use-cases";
import { os } from "@orpc/server";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateManyPlantInputSchema,
	CreatePlantInputSchema,
	DeleteManyPlantInputSchema,
	DeletePlantInputSchema,
	GetPlantByIdInputSchema,
	UpdatePlantInputSchema,
} from "./schemas";

export const plantRouter = {
	create: os.input(CreatePlantInputSchema).handler(({ input }) => resolveAndExecute(PlantCreateUseCase, input)),
	createMany: os
		.input(CreateManyPlantInputSchema)
		.handler(({ input }) => resolveAndExecute(PlantCreateManyUseCase, input)),
	getById: os.input(GetPlantByIdInputSchema).handler(({ input }) => resolveAndExecute(PlantGetByIdUseCase, input)),
	getAll: os.handler(() => resolveAndExecute(PlantGetAllUseCase)),
	update: os.input(UpdatePlantInputSchema).handler(({ input }) => resolveAndExecute(PlantUpdateUseCase, input)),
	delete: os.input(DeletePlantInputSchema).handler(({ input }) => resolveAndExecute(PlantDeleteUseCase, input)),
	deleteMany: os
		.input(DeleteManyPlantInputSchema)
		.handler(({ input }) => resolveAndExecute(PlantDeleteManyUseCase, input)),
};
