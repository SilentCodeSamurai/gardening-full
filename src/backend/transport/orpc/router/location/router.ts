import { os } from "@orpc/server";
import {
	LocationCreateUseCase,
	LocationDeleteManyUseCase,
	LocationDeleteUseCase,
	LocationGetAllUseCase,
	LocationGetByIdUseCase,
	LocationUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/location.use-cases";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	CreateLocationInputSchema,
	DeleteLocationInputSchema,
	DeleteManyLocationInputSchema,
	GetLocationByIdInputSchema,
	UpdateLocationInputSchema,
} from "./schemas";

export const locationRouter = {
	create: os.input(CreateLocationInputSchema).handler(({ input }) => resolveAndExecute(LocationCreateUseCase, input)),
	getById: os
		.input(GetLocationByIdInputSchema)
		.handler(({ input }) => resolveAndExecute(LocationGetByIdUseCase, input)),
	getAll: os.handler(() => resolveAndExecute(LocationGetAllUseCase)),
	update: os.input(UpdateLocationInputSchema).handler(({ input }) => resolveAndExecute(LocationUpdateUseCase, input)),
	delete: os.input(DeleteLocationInputSchema).handler(({ input }) => resolveAndExecute(LocationDeleteUseCase, input)),
	deleteMany: os
		.input(DeleteManyLocationInputSchema)
		.handler(({ input }) => resolveAndExecute(LocationDeleteManyUseCase, input)),
};
