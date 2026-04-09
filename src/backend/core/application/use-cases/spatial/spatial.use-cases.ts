import type { SpatialNodeRepositoryPort } from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import type { SpatialOperationsService } from "@backend/core/application/services/spatial/spatial-operations.service";
import type { IUseCase } from "@backend/core/application/use-cases/shared/use-case.interface";
import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeEntityRef,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";
import {
	APPLICATION_RESOURCE_TYPES,
	spatialSpatialNodeRef,
} from "#/backend/core/application/resource-refs";
import type { UseCaseRequest } from "#/backend/core/application/use-cases/use-case-context";

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
		await this.access.assertCanCreate(input.context, input.context.workspaceRef);
		const created = await this.repo.create({
			parentId: input.dto.parentId,
			rect: input.dto.rect,
			kind: input.dto.kind,
			ref: input.dto.ref,
		});
		await this.access.bootstrapResourceAdminForActor(input.context, spatialSpatialNodeRef(String(created.id)));
		return created;
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
		const mask = await this.access.getReadableResourceMask({
			actorRef: input.context.actorRef,
			resourceType: APPLICATION_RESOURCE_TYPES.spatialNode,
		});
		const all = await this.repo.getAll();
		return { items: AccessControlApplicationService.filterItemsByReadableMask(all.items, mask) };
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
		const tree = await this.repo.getTreeForRootId({ id: input.dto.id });
		await this.access.assertCanRead(input.context, spatialSpatialNodeRef(String(input.dto.id)));
		return tree;
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
		await this.repo.getById({ id: input.dto.id });
		await this.access.assertCanDelete(input.context, spatialSpatialNodeRef(String(input.dto.id)));
		return this.repo.delete({ id: input.dto.id });
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
		await this.access.assertCanUpdate(input.context, spatialSpatialNodeRef(String(input.dto.id)));
		return this.repo.restore({
			id: input.dto.id,
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
		private readonly repo: SpatialNodeRepositoryPort,
	) {}
	public async execute(input: SpatialApplyOperationsUseCaseInput): Promise<SpatialApplyOperationsUseCaseOutput> {
		const results: SpatialNodeEntity[] = [];
		for (const op of input.dto.operations) {
			await this.repo.getById({ id: op.id });
			await this.access.assertCanUpdate(input.context, spatialSpatialNodeRef(String(op.id)));
			results.push(
				await this.opsService.placeNode({
					id: op.id,
					parentId: op.parentId,
					rect: op.rect,
				}),
			);
		}
		return { results };
	}
}
