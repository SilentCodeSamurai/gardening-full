import {
	SpatialApplyOperationsUseCase,
	SpatialNodeCreateUseCase,
	SpatialNodeDeleteUseCase,
	SpatialNodeGetAllUseCase,
	SpatialNodeGetTreeForRootIdUseCase,
	SpatialNodeRestoreUseCase,
} from "@backend/core/application/use-cases/spatial/spatial.use-cases";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { authenticatedProcedure } from "../../orpc-procedure";
import { resolveAndExecute } from "../../shared/resolve-use-case";
import {
	ApplySpatialOperationsInputSchema,
	CreateSpatialNodeInputSchema,
	DeleteSpatialNodeInputSchema,
	GetSpatialTreeByRootIdInputSchema,
	RestoreSpatialNodeInputSchema,
} from "./schemas";

export const spatialRouter = {
	createNode: authenticatedProcedure
		.input(CreateSpatialNodeInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpatialNodeCreateUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	deleteNode: authenticatedProcedure
		.input(DeleteSpatialNodeInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpatialNodeDeleteUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
	restoreNode: authenticatedProcedure
		.input(RestoreSpatialNodeInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpatialNodeRestoreUseCase, { context: createUseCaseContextFromOrpc(context), dto: input }),
		),
	getAllNodes: authenticatedProcedure.handler(({ context }) =>
		resolveAndExecute(SpatialNodeGetAllUseCase, { context: createUseCaseContextFromOrpc(context) }),
	),
	getTreeForRootId: authenticatedProcedure
		.input(GetSpatialTreeByRootIdInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpatialNodeGetTreeForRootIdUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { id: input.id },
			}),
		),
	applyOperations: authenticatedProcedure
		.input(ApplySpatialOperationsInputSchema)
		.handler(({ input, context }) =>
			resolveAndExecute(SpatialApplyOperationsUseCase, {
				context: createUseCaseContextFromOrpc(context),
				dto: { operations: input.operations },
			}),
		),
};
