import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import {
	type SpatialNodeRepositoryPort,
	SpatialNodeRepositoryPortToken,
} from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import {
	type TransactionManagerPort,
	TransactionManagerPortToken,
} from "@backend/core/application/ports/transaction/transaction-manager.port";
import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import { SpatialOperationsService } from "@backend/core/application/services/spatial/spatial-operations.service";
import { BaseUseCase } from "@backend/core/application/use-cases/shared/base.use-case";
import { TransactionalUseCase } from "@backend/core/application/use-cases/shared/transactional.use-case";
import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeEntityRef,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";
import { inject, injectable } from "tsyringe";
import type { UseCaseRequest } from "#/backend/core/application/use-cases/use-case-context";

async function getSpatialNodeOrNull(
	repo: SpatialNodeRepositoryPort,
	workspace: SpatialNodeEntity["workspace"],
	id: SpatialNodeEntityId,
): Promise<SpatialNodeEntity | null> {
	try {
		return await repo.getOne({ filters: [{ id, workspace }] });
	} catch (e) {
		if (e instanceof RepositoryNotFoundError) return null;
		throw e;
	}
}

export type SpatialNodeCreateUseCaseInput = UseCaseRequest<{
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
	kind: SpatialNodeEntity["kind"];
	ref: SpatialNodeEntityRef;
}>;
export type SpatialNodeCreateUseCaseOutput = SpatialNodeEntity;

@injectable()
export class SpatialNodeCreateUseCase extends BaseUseCase<
	SpatialNodeCreateUseCaseInput,
	SpatialNodeCreateUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialNodeRepositoryPortToken) private readonly repo: SpatialNodeRepositoryPort,
	) {
		super();
	}
	protected async execute(input: SpatialNodeCreateUseCaseInput): Promise<SpatialNodeCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const scope = input.context.activeWorkspaceScope;
		if (input.dto.parentId !== null) {
			await this.repo.getOne({ filters: [{ id: input.dto.parentId, workspace: scope }] });
		}
		return this.repo.createOne({
			workspace: scope,
			parentId: input.dto.parentId,
			rect: input.dto.rect,
			kind: input.dto.kind,
			ref: input.dto.ref,
		});
	}
}

export type SpatialNodeGetAllUseCaseInput = UseCaseRequest;
export type SpatialNodeGetAllUseCaseOutput = ItemsContainer<SpatialNodeEntity>;

@injectable()
export class SpatialNodeGetAllUseCase extends BaseUseCase<
	SpatialNodeGetAllUseCaseInput,
	SpatialNodeGetAllUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialNodeRepositoryPortToken) private readonly repo: SpatialNodeRepositoryPort,
	) {
		super();
	}
	protected async execute(input: SpatialNodeGetAllUseCaseInput): Promise<SpatialNodeGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		return this.repo.getMany({ filters: [{ workspace: scope }] });
	}
}

export type SpatialNodeGetTreeForRootIdUseCaseInput = UseCaseRequest<{ id: SpatialNodeEntityId }>;
export type SpatialNodeGetTreeForRootIdUseCaseOutput = SpatialNodeTreeNode;

@injectable()
export class SpatialNodeGetTreeForRootIdUseCase extends BaseUseCase<
	SpatialNodeGetTreeForRootIdUseCaseInput,
	SpatialNodeGetTreeForRootIdUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialNodeRepositoryPortToken) private readonly repo: SpatialNodeRepositoryPort,
	) {
		super();
	}
	protected async execute(
		input: SpatialNodeGetTreeForRootIdUseCaseInput,
	): Promise<SpatialNodeGetTreeForRootIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		await this.repo.getOne({ filters: [{ id: input.dto.id, workspace: scope }] });
		return this.repo.getTreeForRootOne({ filters: [{ id: input.dto.id }] });
	}
}

export type SpatialNodeDeleteUseCaseInput = UseCaseRequest<{ id: SpatialNodeEntityId }>;
export type SpatialNodeDeleteUseCaseOutput = SpatialNodeEntityId;

@injectable()
export class SpatialNodeDeleteUseCase extends BaseUseCase<
	SpatialNodeDeleteUseCaseInput,
	SpatialNodeDeleteUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialNodeRepositoryPortToken) private readonly repo: SpatialNodeRepositoryPort,
	) {
		super();
	}
	protected async execute(input: SpatialNodeDeleteUseCaseInput): Promise<SpatialNodeDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		return this.repo.deleteOne({
			filters: [{ id: input.dto.id, workspace: scope }],
		});
	}
}

export type SpatialNodeDeleteManyUseCaseInput = UseCaseRequest<{ ids: SpatialNodeEntityId[] }>;
export type SpatialNodeDeleteManyUseCaseOutput = { count: number };

@injectable()
export class SpatialNodeDeleteManyUseCase extends BaseUseCase<
	SpatialNodeDeleteManyUseCaseInput,
	SpatialNodeDeleteManyUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialNodeRepositoryPortToken) private readonly repo: SpatialNodeRepositoryPort,
	) {
		super();
	}
	protected async execute(input: SpatialNodeDeleteManyUseCaseInput): Promise<SpatialNodeDeleteManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		return this.repo.deleteMany({
			filters: input.dto.ids.map((id) => ({ id, workspace: scope })),
		});
	}
}

export type SpatialNodeRestoreUseCaseInput = UseCaseRequest<{
	id: SpatialNodeEntityId;
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
	kind: SpatialNodeEntity["kind"];
	ref: SpatialNodeEntityRef;
}>;
export type SpatialNodeRestoreUseCaseOutput = SpatialNodeEntity;

@injectable()
export class SpatialNodeRestoreUseCase extends BaseUseCase<
	SpatialNodeRestoreUseCaseInput,
	SpatialNodeRestoreUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialNodeRepositoryPortToken) private readonly repo: SpatialNodeRepositoryPort,
	) {
		super();
	}
	protected async execute(input: SpatialNodeRestoreUseCaseInput): Promise<SpatialNodeRestoreUseCaseOutput> {
		const scope = input.context.activeWorkspaceScope;
		const existing = await getSpatialNodeOrNull(this.repo, scope, input.dto.id);
		if (existing === null) {
			await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		} else {
			await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		}
		if (input.dto.parentId !== null) {
			await this.repo.getOne({ filters: [{ id: input.dto.parentId, workspace: scope }] });
		}
		return this.repo.restoreOne({
			id: input.dto.id,
			workspace: scope,
			parentId: input.dto.parentId,
			rect: input.dto.rect,
			kind: input.dto.kind,
			ref: input.dto.ref,
		});
	}
}

export type SpatialApplyOperationDTO = {
	id: SpatialNodeEntityId;
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
};
export type SpatialApplyOperationsUseCaseInput = UseCaseRequest<{
	operations: readonly SpatialApplyOperationDTO[];
}>;
export type SpatialApplyOperationsUseCaseOutput = {
	results: SpatialNodeEntity[];
};

@injectable()
export class SpatialApplyOperationsUseCase extends TransactionalUseCase<
	SpatialApplyOperationsUseCaseInput,
	SpatialApplyOperationsUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialOperationsService) private readonly opsService: SpatialOperationsService,
		@inject(TransactionManagerPortToken) transactionManager: TransactionManagerPort,
	) {
		super(transactionManager);
	}
	protected async execute(input: SpatialApplyOperationsUseCaseInput): Promise<SpatialApplyOperationsUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const results: SpatialNodeEntity[] = [];
		const scope = input.context.activeWorkspaceScope;
		for (const op of input.dto.operations) {
			results.push(
				await this.opsService.placeNode({
					workspace: scope,
					id: op.id,
					parentId: op.parentId,
					rect: op.rect,
				}),
			);
		}
		return { results };
	}
}
