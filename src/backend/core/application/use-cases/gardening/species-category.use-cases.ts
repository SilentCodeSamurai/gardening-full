import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { SpeciesCategoryEntity, SpeciesCategoryEntityId } from "@backend/core/domain/gardening/entities";
import { inject, injectable } from "tsyringe";
import {
	type SpeciesCategoryRepositoryCreateInputDTO,
	type SpeciesCategoryRepositoryDeleteManyOutputDTO,
	type SpeciesCategoryRepositoryDeleteOutputDTO,
	type SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryPortToken,
	type SpeciesCategoryRepositoryUpdatePatchDTO,
} from "../../ports/repositories/gardening/species-category.repository.port";
import { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import { BaseUseCase } from "../shared/base.use-case";
import type { ExcludeWorkspace } from "../shared/types";
import type { UseCaseRequest } from "../use-case-context";

export type SpeciesCategoryWithSystemCatalog = SpeciesCategoryEntity & { systemCatalog: boolean };

type SpeciesCategoryCreatePayload = ExcludeWorkspace<SpeciesCategoryRepositoryCreateInputDTO>;
export type SpeciesCategoryCreateUseCaseInput = UseCaseRequest<SpeciesCategoryCreatePayload>;
export type SpeciesCategoryCreateUseCaseOutput = SpeciesCategoryWithSystemCatalog;

@injectable()
export class SpeciesCategoryCreateUseCase extends BaseUseCase<
	SpeciesCategoryCreateUseCaseInput,
	SpeciesCategoryCreateUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesCategoryRepositoryPortToken)
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {
		super();
	}

	protected async execute(input: SpeciesCategoryCreateUseCaseInput): Promise<SpeciesCategoryCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const created = await this.speciesCategoryRepository.createOne({
			...input.dto,
			workspace: input.context.activeWorkspaceScope,
		});
		return { ...created, systemCatalog: WorkspaceVO.isGlobalShared(created.workspace) };
	}
}

export type SpeciesCategoryGetByIdUseCaseInput = UseCaseRequest<{ id: SpeciesCategoryEntityId }>;
export type SpeciesCategoryGetByIdUseCaseOutput = SpeciesCategoryWithSystemCatalog;

@injectable()
export class SpeciesCategoryGetByIdUseCase extends BaseUseCase<
	SpeciesCategoryGetByIdUseCaseInput,
	SpeciesCategoryGetByIdUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesCategoryRepositoryPortToken)
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {
		super();
	}

	protected async execute(input: SpeciesCategoryGetByIdUseCaseInput): Promise<SpeciesCategoryGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		const row = await this.speciesCategoryRepository.getOne({
			filters: [{ id: input.dto.id, workspace: scope }],
		});
		return { ...row, systemCatalog: WorkspaceVO.isGlobalShared(row.workspace) };
	}
}

export type SpeciesCategoryGetAllUseCaseInput = UseCaseRequest;
export type SpeciesCategoryGetAllUseCaseOutput = {
	items: SpeciesCategoryWithSystemCatalog[];
};

@injectable()
export class SpeciesCategoryGetAllUseCase extends BaseUseCase<
	SpeciesCategoryGetAllUseCaseInput,
	SpeciesCategoryGetAllUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesCategoryRepositoryPortToken)
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {
		super();
	}
	protected async execute(input: SpeciesCategoryGetAllUseCaseInput): Promise<SpeciesCategoryGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({
			...input.context,
			action: "read",
		});
		const active = input.context.activeWorkspaceScope;
		const global = WorkspaceVO.globalShared();
		const all = await this.speciesCategoryRepository.getMany({
			filters: [{ workspace: active }, { workspace: global }],
		});
		const enriched = all.items.map((item) => ({
			...item,
			systemCatalog: WorkspaceVO.isGlobalShared(item.workspace),
		}));
		return { items: enriched };
	}
}

export type SpeciesCategoryUpdateUseCaseInput = UseCaseRequest<
	{ id: SpeciesCategoryEntityId } & ExcludeWorkspace<SpeciesCategoryRepositoryUpdatePatchDTO>
>;
export type SpeciesCategoryUpdateUseCaseOutput = SpeciesCategoryWithSystemCatalog;

@injectable()
export class SpeciesCategoryUpdateUseCase extends BaseUseCase<
	SpeciesCategoryUpdateUseCaseInput,
	SpeciesCategoryUpdateUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesCategoryRepositoryPortToken)
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {
		super();
	}
	protected async execute(input: SpeciesCategoryUpdateUseCaseInput): Promise<SpeciesCategoryUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const scope = input.context.activeWorkspaceScope;
		const { id, ...patch } = input.dto;
		const updated = await this.speciesCategoryRepository.updateOne({
			filters: [{ id, workspace: scope }],
			dto: patch,
		});
		return { ...updated, systemCatalog: WorkspaceVO.isGlobalShared(updated.workspace) };
	}
}

export type SpeciesCategoryDeleteUseCaseInput = UseCaseRequest<{ id: SpeciesCategoryEntityId }>;
export type SpeciesCategoryDeleteUseCaseOutput = SpeciesCategoryRepositoryDeleteOutputDTO;

@injectable()
export class SpeciesCategoryDeleteUseCase extends BaseUseCase<
	SpeciesCategoryDeleteUseCaseInput,
	SpeciesCategoryDeleteUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesCategoryRepositoryPortToken)
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {
		super();
	}
	protected async execute(input: SpeciesCategoryDeleteUseCaseInput): Promise<SpeciesCategoryDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		return this.speciesCategoryRepository.deleteOne({
			filters: [{ id: input.dto.id, workspace: scope }],
		});
	}
}

export type SpeciesCategoryDeleteManyUseCaseInput = UseCaseRequest<{ ids: SpeciesCategoryEntityId[] }>;
export type SpeciesCategoryDeleteManyUseCaseOutput = SpeciesCategoryRepositoryDeleteManyOutputDTO;

@injectable()
export class SpeciesCategoryDeleteManyUseCase extends BaseUseCase<
	SpeciesCategoryDeleteManyUseCaseInput,
	SpeciesCategoryDeleteManyUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesCategoryRepositoryPortToken)
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {
		super();
	}
	protected async execute(
		input: SpeciesCategoryDeleteManyUseCaseInput,
	): Promise<SpeciesCategoryDeleteManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		return this.speciesCategoryRepository.deleteMany({
			filters: input.dto.ids.map((id) => ({ id, workspace: scope })),
		});
	}
}
