import {
	SpatialApplyOperationsUseCase,
	SpatialNodeCreateUseCase,
	SpatialNodeDeleteManyUseCase,
	SpatialNodeDeleteUseCase,
	SpatialNodeGetAllUseCase,
	SpatialNodeGetTreeForRootIdUseCase,
	SpatialNodeRestoreUseCase,
} from "@backend/core/application/use-cases/spatial/spatial.use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { authenticatedProcedure } from "../../orpc-procedure";
import { runUseCaseOrpc } from "../../shared/run-use-case-orpc";
import {
	ApplySpatialOperationsInputSchema,
	CreateSpatialNodeInputSchema,
	DeleteManySpatialNodeInputSchema,
	DeleteSpatialNodeInputSchema,
	GetSpatialTreeByRootIdInputSchema,
	RestoreSpatialNodeInputSchema,
} from "./schemas";

export const spatialRouter = {
	createNode: authenticatedProcedure
		.input(CreateSpatialNodeInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(SpatialNodeCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	deleteNode: authenticatedProcedure.input(DeleteSpatialNodeInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(SpatialNodeDeleteUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: { id: input.id },
		}),
	),
	deleteManyNodes: authenticatedProcedure.input(DeleteManySpatialNodeInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(SpatialNodeDeleteManyUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: input,
		}),
	),
	restoreNode: authenticatedProcedure
		.input(RestoreSpatialNodeInputSchema)
		.handler(({ input, context }) =>
			runUseCaseOrpc(SpatialNodeRestoreUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getAllNodes: authenticatedProcedure.handler(({ context }) =>
		runUseCaseOrpc(SpatialNodeGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	getTreeForRootId: authenticatedProcedure.input(GetSpatialTreeByRootIdInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(SpatialNodeGetTreeForRootIdUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: { id: input.id },
		}),
	),
	applyOperations: authenticatedProcedure.input(ApplySpatialOperationsInputSchema).handler(({ input, context }) =>
		runUseCaseOrpc(SpatialApplyOperationsUseCase, {
			context: createUseCaseContextFromOrpc(context),
			dto: { operations: input.operations },
		}),
	),
};
