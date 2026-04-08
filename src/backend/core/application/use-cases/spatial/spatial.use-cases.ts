import type { ItemsContainer } from "@backend/shared/types";
import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeEntityRef,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
import type { IUseCase } from "@backend/core/application/use-cases/shared/use-case.interface";
import type { SpatialNodeRepositoryPort } from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import type { SpatialOperationsService } from "@backend/core/application/services/spatial/spatial-operations.service";

export type SpatialNodeCreateUseCaseInput = {
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
	kind: SpatialNodeEntity["kind"];
	ref: SpatialNodeEntityRef;
};
export type SpatialNodeCreateUseCaseOutput = SpatialNodeEntity;

export class SpatialNodeCreateUseCase
	implements IUseCase<SpatialNodeCreateUseCaseInput, SpatialNodeCreateUseCaseOutput>
{
	constructor(private readonly repo: SpatialNodeRepositoryPort) {}
	public async execute(input: SpatialNodeCreateUseCaseInput): Promise<SpatialNodeCreateUseCaseOutput> {
		return this.repo.create(input);
	}
}

export type SpatialNodeGetAllUseCaseOutput = ItemsContainer<SpatialNodeEntity>;
export class SpatialNodeGetAllUseCase implements IUseCase<void, SpatialNodeGetAllUseCaseOutput> {
	constructor(private readonly repo: SpatialNodeRepositoryPort) {}
	public async execute(): Promise<SpatialNodeGetAllUseCaseOutput> {
		return this.repo.getAll();
	}
}

export type SpatialNodeGetTreeForRootIdUseCaseInput = { id: SpatialNodeEntityId };
export type SpatialNodeGetTreeForRootIdUseCaseOutput = SpatialNodeTreeNode;
export class SpatialNodeGetTreeForRootIdUseCase
	implements IUseCase<SpatialNodeGetTreeForRootIdUseCaseInput, SpatialNodeGetTreeForRootIdUseCaseOutput>
{
	constructor(private readonly repo: SpatialNodeRepositoryPort) {}
	public async execute(
		input: SpatialNodeGetTreeForRootIdUseCaseInput,
	): Promise<SpatialNodeGetTreeForRootIdUseCaseOutput> {
		return this.repo.getTreeForRootId(input);
	}
}

export type SpatialNodeDeleteUseCaseInput = { id: SpatialNodeEntityId };
export type SpatialNodeDeleteUseCaseOutput = SpatialNodeEntityId;
export class SpatialNodeDeleteUseCase
	implements IUseCase<SpatialNodeDeleteUseCaseInput, SpatialNodeDeleteUseCaseOutput>
{
	constructor(private readonly repo: SpatialNodeRepositoryPort) {}
	public async execute(input: SpatialNodeDeleteUseCaseInput): Promise<SpatialNodeDeleteUseCaseOutput> {
		return this.repo.delete({ id: input.id });
	}
}

export type SpatialNodeRestoreUseCaseInput = {
	id: SpatialNodeEntityId;
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
	kind: SpatialNodeEntity["kind"];
	ref: SpatialNodeEntityRef;
};
export type SpatialNodeRestoreUseCaseOutput = SpatialNodeEntity;
export class SpatialNodeRestoreUseCase
	implements IUseCase<SpatialNodeRestoreUseCaseInput, SpatialNodeRestoreUseCaseOutput>
{
	constructor(private readonly repo: SpatialNodeRepositoryPort) {}
	public async execute(input: SpatialNodeRestoreUseCaseInput): Promise<SpatialNodeRestoreUseCaseOutput> {
		return this.repo.restore(input);
	}
}

export type SpatialApplyOperationDTO = {
	id: SpatialNodeEntityId;
	parentId: SpatialNodeEntityId | null;
	rect: SpatialNodeEntity["rect"];
};
export type SpatialApplyOperationsUseCaseInput = {
	operations: readonly SpatialApplyOperationDTO[];
};
export type SpatialApplyOperationsUseCaseOutput = {
	results: SpatialNodeEntity[];
};

export class SpatialApplyOperationsUseCase
	implements IUseCase<SpatialApplyOperationsUseCaseInput, SpatialApplyOperationsUseCaseOutput>
{
	constructor(private readonly opsService: SpatialOperationsService) {}
	public async execute(input: SpatialApplyOperationsUseCaseInput): Promise<SpatialApplyOperationsUseCaseOutput> {
		const results: SpatialNodeEntity[] = [];
		for (const op of input.operations) {
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
