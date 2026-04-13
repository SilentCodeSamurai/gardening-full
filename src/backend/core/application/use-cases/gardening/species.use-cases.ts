import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { SpeciesEntity, SpeciesEntityId } from "@backend/core/domain/gardening/entities";
import { inject, injectable } from "tsyringe";
import {
	type SpeciesRepositoryCreateInputDTO,
	type SpeciesRepositoryDeleteManyOutputDTO,
	type SpeciesRepositoryDeleteOutputDTO,
	type SpeciesRepositoryPort,
	SpeciesRepositoryPortToken,
	type SpeciesRepositoryUpdatePatchDTO,
} from "../../ports/repositories/gardening/species.repository.port";
import { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import { BaseUseCase } from "../shared/base.use-case";
import type { ExcludeWorkspace } from "../shared/types";
import type { UseCaseRequest } from "../use-case-context";

export type SpeciesWithSystemCatalog = SpeciesEntity & { systemCatalog: boolean };

type SpeciesCreatePayload = ExcludeWorkspace<SpeciesRepositoryCreateInputDTO>;
export type SpeciesCreateUseCaseInput = UseCaseRequest<SpeciesCreatePayload>;
export type SpeciesCreateUseCaseOutput = SpeciesWithSystemCatalog;

@injectable()
export class SpeciesCreateUseCase extends BaseUseCase<SpeciesCreateUseCaseInput, SpeciesCreateUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesRepositoryPortToken) private readonly speciesRepository: SpeciesRepositoryPort,
	) {
		super();
	}

	protected async execute(input: SpeciesCreateUseCaseInput): Promise<SpeciesCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const scope = input.context.activeWorkspaceScope;
		const created = await this.speciesRepository.createOne({
			...input.dto,
			workspace: scope,
		});
		return { ...created, systemCatalog: WorkspaceVO.isGlobalShared(created.workspace) };
	}
}

export type SpeciesGetByIdUseCaseInput = UseCaseRequest<{ id: SpeciesEntityId }>;
export type SpeciesGetByIdUseCaseOutput = SpeciesWithSystemCatalog;

@injectable()
export class SpeciesGetByIdUseCase extends BaseUseCase<SpeciesGetByIdUseCaseInput, SpeciesGetByIdUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesRepositoryPortToken) private readonly speciesRepository: SpeciesRepositoryPort,
	) {
		super();
	}

	protected async execute(input: SpeciesGetByIdUseCaseInput): Promise<SpeciesGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		const row = await this.speciesRepository.getOne({ filters: [{ id: input.dto.id, workspace: scope }] });
		return { ...row, systemCatalog: WorkspaceVO.isGlobalShared(row.workspace) };
	}
}

export type SpeciesGetAllUseCaseInput = UseCaseRequest;
export type SpeciesGetAllUseCaseOutput = { items: SpeciesWithSystemCatalog[] };

@injectable()
export class SpeciesGetAllUseCase extends BaseUseCase<SpeciesGetAllUseCaseInput, SpeciesGetAllUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesRepositoryPortToken) private readonly speciesRepository: SpeciesRepositoryPort,
	) {
		super();
	}

	protected async execute(input: SpeciesGetAllUseCaseInput): Promise<SpeciesGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({
			...input.context,
			action: "read",
		});
		const active = input.context.activeWorkspaceScope;
		const global = WorkspaceVO.globalShared();
		const all = await this.speciesRepository.getMany({
			filters: [{ workspace: active }, { workspace: global }],
		});
		const enriched = all.items.map((item) => ({
			...item,
			systemCatalog: WorkspaceVO.isGlobalShared(item.workspace),
		}));
		return { items: enriched };
	}
}

type SpeciesUpdatePayload = ExcludeWorkspace<SpeciesRepositoryUpdatePatchDTO>;
export type SpeciesUpdateUseCaseInput = UseCaseRequest<{ id: SpeciesEntityId } & SpeciesUpdatePayload>;
export type SpeciesUpdateUseCaseOutput = SpeciesWithSystemCatalog;

@injectable()
export class SpeciesUpdateUseCase extends BaseUseCase<SpeciesUpdateUseCaseInput, SpeciesUpdateUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesRepositoryPortToken) private readonly speciesRepository: SpeciesRepositoryPort,
	) {
		super();
	}

	protected async execute(input: SpeciesUpdateUseCaseInput): Promise<SpeciesUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const scope = input.context.activeWorkspaceScope;
		const { id, ...patch } = input.dto;
		const updated = await this.speciesRepository.updateOne({
			filters: [{ id, workspace: scope }],
			dto: patch,
		});
		return { ...updated, systemCatalog: WorkspaceVO.isGlobalShared(updated.workspace) };
	}
}

export type SpeciesDeleteUseCaseInput = UseCaseRequest<{ id: SpeciesEntityId }>;
export type SpeciesDeleteUseCaseOutput = SpeciesRepositoryDeleteOutputDTO;

@injectable()
export class SpeciesDeleteUseCase extends BaseUseCase<SpeciesDeleteUseCaseInput, SpeciesDeleteUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesRepositoryPortToken) private readonly speciesRepository: SpeciesRepositoryPort,
	) {
		super();
	}

	protected async execute(input: SpeciesDeleteUseCaseInput): Promise<SpeciesDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		return this.speciesRepository.deleteOne({
			filters: [{ id: input.dto.id, workspace: scope }],
		});
	}
}

export type SpeciesDeleteManyUseCaseInput = UseCaseRequest<{ ids: SpeciesEntityId[] }>;
export type SpeciesDeleteManyUseCaseOutput = SpeciesRepositoryDeleteManyOutputDTO;

@injectable()
export class SpeciesDeleteManyUseCase extends BaseUseCase<
	SpeciesDeleteManyUseCaseInput,
	SpeciesDeleteManyUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesRepositoryPortToken) private readonly speciesRepository: SpeciesRepositoryPort,
	) {
		super();
	}

	protected async execute(input: SpeciesDeleteManyUseCaseInput): Promise<SpeciesDeleteManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		return this.speciesRepository.deleteMany({
			filters: input.dto.ids.map((id) => ({ id, workspace: scope })),
		});
	}
}
