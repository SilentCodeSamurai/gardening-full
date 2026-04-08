import { os } from "@orpc/server";
import {
	SpatialApplyOperationsUseCase,
	SpatialNodeCreateUseCase,
	SpatialNodeDeleteUseCase,
	SpatialNodeGetAllUseCase,
	SpatialNodeGetTreeForRootIdUseCase,
	SpatialNodeRestoreUseCase,
} from "@backend/core/application/use-cases/spatial/spatial.use-cases";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	ApplySpatialOperationsInputSchema,
	CreateSpatialNodeInputSchema,
	DeleteSpatialNodeInputSchema,
	GetSpatialTreeByRootIdInputSchema,
	RestoreSpatialNodeInputSchema,
} from "./schemas";

export const spatialRouter = {
	createNode: os
		.input(CreateSpatialNodeInputSchema)
		.handler(({ input }) => resolveAndExecute(SpatialNodeCreateUseCase, input)),
	deleteNode: os
		.input(DeleteSpatialNodeInputSchema)
		.handler(({ input }) => resolveAndExecute(SpatialNodeDeleteUseCase, input)),
	restoreNode: os
		.input(RestoreSpatialNodeInputSchema)
		.handler(({ input }) => resolveAndExecute(SpatialNodeRestoreUseCase, input)),
	getAllNodes: os.handler(() => resolveAndExecute(SpatialNodeGetAllUseCase)),
	getTreeForRootId: os
		.input(GetSpatialTreeByRootIdInputSchema)
		.handler(({ input }) => resolveAndExecute(SpatialNodeGetTreeForRootIdUseCase, input)),
	applyOperations: os
		.input(ApplySpatialOperationsInputSchema)
		.handler(({ input }) => resolveAndExecute(SpatialApplyOperationsUseCase, input)),
};
