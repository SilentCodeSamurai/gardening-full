import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpatialNodeRepositoryPort } from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import type { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import type { SpatialOperationsService } from "@backend/core/application/services/spatial/spatial-operations.service";
import type { IUseCase } from "@backend/core/application/use-cases/shared/use-case.interface";
import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeEntityRef,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";
import type { UseCaseRequest } from "#/backend/core/application/use-cases/use-case-context";

async function getSpatialNodeOrNull(
	repo: SpatialNodeRepositoryPort,
	workspaceKey: SpatialNodeEntity["workspaceKey"],
	id: SpatialNodeEntityId,
): Promise<SpatialNodeEntity | null> {
	try {
		return await repo.getOne({ filters: [{ id, workspaceKey }] });
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

export class SpatialNodeCreateUseCase
	implements IUseCase<SpatialNodeCreateUseCaseInput, SpatialNodeCreateUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly repo: SpatialNodeRepositoryPort,
	) {}
	public async execute(input: SpatialNodeCreateUseCaseInput): Promise<SpatialNodeCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		return this.repo.createOne({
			workspaceKey: input.context.activeWorkspaceScope.toKey(),
			parentId: input.dto.parentId,
			rect: input.dto.rect,
			kind: input.dto.kind,
			ref: input.dto.ref,
		});
	}
}

export type SpatialNodeGetAllUseCaseInput = UseCaseRequest;
export type SpatialNodeGetAllUseCaseOutput = ItemsContainer<SpatialNodeEntity>;

export class SpatialNodeGetAllUseCase
	implements IUseCase<SpatialNodeGetAllUseCaseInput, SpatialNodeGetAllUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly repo: SpatialNodeRepositoryPort,
	) {}
	public async execute(input: SpatialNodeGetAllUseCaseInput): Promise<SpatialNodeGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.repo.getMany({ filters: [{ workspaceKey: wk }] });
	}
}

export type SpatialNodeGetTreeForRootIdUseCaseInput = UseCaseRequest<{ id: SpatialNodeEntityId }>;
export type SpatialNodeGetTreeForRootIdUseCaseOutput = SpatialNodeTreeNode;

export class SpatialNodeGetTreeForRootIdUseCase
	implements IUseCase<SpatialNodeGetTreeForRootIdUseCaseInput, SpatialNodeGetTreeForRootIdUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly repo: SpatialNodeRepositoryPort,
	) {}
	public async execute(
		input: SpatialNodeGetTreeForRootIdUseCaseInput,
	): Promise<SpatialNodeGetTreeForRootIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		await this.repo.getOne({ filters: [{ id: input.dto.id, workspaceKey: wk }] });
		return this.repo.getTreeForRootOne({ filters: [{ id: input.dto.id, workspaceKey: wk }] });
	}
}

export type SpatialNodeDeleteUseCaseInput = UseCaseRequest<{ id: SpatialNodeEntityId }>;
export type SpatialNodeDeleteUseCaseOutput = SpatialNodeEntityId;

export class SpatialNodeDeleteUseCase
	implements IUseCase<SpatialNodeDeleteUseCaseInput, SpatialNodeDeleteUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly repo: SpatialNodeRepositoryPort,
	) {}
	public async execute(input: SpatialNodeDeleteUseCaseInput): Promise<SpatialNodeDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.repo.deleteOne({
			filters: [{ id: input.dto.id, workspaceKey: wk }],
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

export class SpatialNodeRestoreUseCase
	implements IUseCase<SpatialNodeRestoreUseCaseInput, SpatialNodeRestoreUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly repo: SpatialNodeRepositoryPort,
	) {}
	public async execute(input: SpatialNodeRestoreUseCaseInput): Promise<SpatialNodeRestoreUseCaseOutput> {
		const wk = input.context.activeWorkspaceScope.toKey();
		const existing = await getSpatialNodeOrNull(this.repo, wk, input.dto.id);
		if (existing === null) {
			await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		} else {
			await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		}
		return this.repo.restoreOne({
			id: input.dto.id,
			workspaceKey: wk,
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

export class SpatialApplyOperationsUseCase
	implements IUseCase<SpatialApplyOperationsUseCaseInput, SpatialApplyOperationsUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly opsService: SpatialOperationsService,
	) {}
	public async execute(input: SpatialApplyOperationsUseCaseInput): Promise<SpatialApplyOperationsUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const results: SpatialNodeEntity[] = [];
		const wk = input.context.activeWorkspaceScope.toKey();
		for (const op of input.dto.operations) {
			results.push(
				await this.opsService.placeNode({
					workspaceKey: wk,
					id: op.id,
					parentId: op.parentId,
					rect: op.rect,
				}),
			);
		}
		return { results };
	}
}
